import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNCPAY_BASE = "https://api.syncpayments.com.br";

async function getSyncPayToken(): Promise<string> {
  const clientId = Deno.env.get("SYNCPAY_CLIENT_ID")!;
  const clientSecret = Deno.env.get("SYNCPAY_CLIENT_SECRET")!;
  const res = await fetch(`${SYNCPAY_BASE}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`SyncPay auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token ?? data.token ?? data.data?.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const email = claims.claims.email as string;

    const { package_id, fan_name, fan_cpf } = await req.json();
    if (!package_id || !fan_name || !fan_cpf) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pkg, error: pkgErr } = await admin
      .from("coin_packages")
      .select("id, coins, price_brl, bonus, active")
      .eq("id", package_id)
      .maybeSingle();
    if (pkgErr || !pkg || !pkg.active) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(Number(pkg.price_brl).toFixed(2));
    const totalCoins = pkg.coins + (pkg.bonus ?? 0);
    const cpfClean = String(fan_cpf).replace(/\D/g, "");
    const projectId = Deno.env.get("SUPABASE_URL")!.split(".")[0].split("//")[1];
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/syncpay-webhook`;

    const syncpayToken = await getSyncPayToken();
    const cashInRes = await fetch(`${SYNCPAY_BASE}/api/partner/v1/cash-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Accept: "application/json",
        Authorization: `Bearer ${syncpayToken}`,
      },
      body: JSON.stringify({
        amount,
        description: `Compra de ${totalCoins} moedas Flare`,
        webhook_url: webhookUrl,
        client: { name: fan_name, cpf: cpfClean, email },
      }),
    });
    if (!cashInRes.ok) {
      const detail = await cashInRes.text();
      console.error("SyncPay error:", detail);
      return new Response(JSON.stringify({ error: "Erro ao gerar PIX", detail }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cash = await cashInRes.json();
    const pixCode = cash.pix_code ?? cash.data?.pix_code ?? cash.qr_code ?? cash.data?.qr_code;
    const identifier = cash.identifier ?? cash.data?.identifier ?? cash.id ?? cash.data?.id;
    if (!pixCode || !identifier) {
      return new Response(JSON.stringify({ error: "Resposta inesperada", raw: cash }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store as pending_payment with plan=coins:<pkg_id>:<totalCoins>, creator_id = self
    await admin.from("pending_payments").upsert({
      syncpay_id: identifier,
      fan_id: userId,
      creator_id: userId,
      plan: `coins:${pkg.id}:${totalCoins}`,
      amount,
    }, { onConflict: "syncpay_id" });

    return new Response(JSON.stringify({ pix_code: pixCode, identifier, coins: totalCoins }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("coin-purchase error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
