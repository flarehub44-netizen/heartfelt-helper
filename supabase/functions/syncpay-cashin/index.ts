import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNCPAY_BASE = "https://api.syncpayments.com.br";

// In-memory IP rate limit (per edge instance): 20 PIX charges / hour / IP.
// Complements the per-user DB rate limit (pix_rate_limit) to slow scripted abuse
// from a single origin using many freshly-registered accounts.
const IP_RATE_WINDOW_MS = 60 * 60 * 1000;
const IP_RATE_MAX = 20;
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + IP_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= IP_RATE_MAX) return false;
  entry.count++;
  return true;
}


async function getSyncPayToken(): Promise<string> {
  const clientId = Deno.env.get("SYNCPAY_CLIENT_ID")!;
  const clientSecret = Deno.env.get("SYNCPAY_CLIENT_SECRET")!;

  const res = await fetch(`${SYNCPAY_BASE}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SyncPay auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // SyncPay returns { access_token: "...", ... }
  return data.access_token ?? data.token ?? data.data?.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fanId = claimsData.claims.sub;
    const fanEmail = claimsData.claims.email as string;

    // IP-based rate limit (per edge instance)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (!checkIpRate(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições deste IP. Tente novamente em alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service-role client (used for rate limit + pending insert)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Ad-hoc rate limit: max 10 PIX charges per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("pix_rate_limit")
      .select("id", { count: "exact", head: true })
      .eq("user_id", fanId)
      .gt("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos antes de gerar outro PIX." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin.from("pix_rate_limit").insert({ user_id: fanId });

    const body = await req.json();
    const { creator_id, plan_name, amount, fan_name, fan_cpf, creator_name, affiliate_ref } =
      body;

    if (!creator_id || !plan_name || !amount || !fan_name || !fan_cpf) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }


    // Get SyncPay bearer token
    const syncpayToken = await getSyncPayToken();
    console.log("SyncPay token obtained (first 20 chars):", syncpayToken?.substring(0, 20));

    // Build webhook URL
    const projectId = Deno.env.get("SUPABASE_URL")!.split(".")[0].split("//")[1];
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/syncpay-webhook`;

    // Generate Pix charge
    // SyncPay expects amount in BRL (float), NOT cents
    const amountFloat = Number(Number(amount).toFixed(2));
    const cpfClean = String(fan_cpf).replace(/\D/g, "");

    const cashInPayload = {
      amount: amountFloat,
      description:
        plan_name === "tip"
          ? `Gorjeta para ${creator_name ?? "Criador"}`
          : `Assinatura ${creator_name ?? "Criador"} - Plano ${plan_name}`,
      webhook_url: webhookUrl,
      client: {
        name: fan_name,
        cpf: cpfClean,
        email: fanEmail,
      },
    };

    console.log("SyncPay cash-in payload:", JSON.stringify({
      ...cashInPayload,
      client: { ...cashInPayload.client, cpf: cpfClean.slice(0, 3) + "***" }
    }));



    const cashInRes = await fetch(`${SYNCPAY_BASE}/api/partner/v1/cash-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${syncpayToken}`,
      },
      body: JSON.stringify(cashInPayload),
    });

    const contentType = cashInRes.headers.get("content-type") ?? "";
    console.log("SyncPay cash-in status:", cashInRes.status, "content-type:", contentType);

    if (!cashInRes.ok) {
      let detail: string;
      if (contentType.includes("application/json")) {
        try {
          const errJson = await cashInRes.json();
          detail = JSON.stringify(errJson);
          console.error("SyncPay cash-in error (json):", detail);
        } catch {
          detail = await cashInRes.text();
          console.error("SyncPay cash-in error (text):", detail);
        }
      } else {
        detail = await cashInRes.text();
        console.error("SyncPay cash-in error (non-json):", detail.substring(0, 300));
      }
      return new Response(
        JSON.stringify({ error: "Erro ao gerar cobrança Pix", detail }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cashInData = await cashInRes.json();
    console.log("SyncPay cash-in response:", JSON.stringify(cashInData));

    // Extract pix_code and identifier from response
    const pixCode =
      cashInData.pix_code ??
      cashInData.data?.pix_code ??
      cashInData.qr_code ??
      cashInData.data?.qr_code;
    const identifier =
      cashInData.identifier ??
      cashInData.data?.identifier ??
      cashInData.id ??
      cashInData.data?.id;

    if (!pixCode || !identifier) {
      console.error("Unexpected SyncPay response:", cashInData);
      return new Response(
        JSON.stringify({
          error: "Resposta inesperada da SyncPay",
          raw: cashInData,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Save pending payment so webhook can find fan_id/creator_id by syncpay_id
    const { error: pendingErr } = await supabaseAdmin
      .from("pending_payments")
      .upsert({
        syncpay_id: identifier,
        fan_id: fanId,
        creator_id,
        plan: plan_name,
        amount: amountFloat,
        affiliate_ref: affiliate_ref || null,
      }, { onConflict: "syncpay_id" });

    if (pendingErr) {
      console.error("Failed to save pending payment:", pendingErr);
      // Non-fatal: continue so user still gets QR code
    }

    return new Response(
      JSON.stringify({ pix_code: pixCode, identifier }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("syncpay-cashin error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
