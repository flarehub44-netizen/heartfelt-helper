import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNCPAY_BASE = "https://api.syncpayments.com.br";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function mapPixKeyType(raw: string | null | undefined): string {
  const t = (raw ?? "cpf").toLowerCase();
  switch (t) {
    case "cpf":
      return "CPF";
    case "cnpj":
      return "CNPJ";
    case "email":
      return "EMAIL";
    case "phone":
      return "PHONE";
    case "random":
      return "RANDOM";
    default:
      return "CPF";
  }
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
  return data.access_token ?? data.token ?? data.data?.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creatorId = claimsData.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount < 30) {
      return new Response(
        JSON.stringify({ error: "Valor mínimo de saque é R$ 30" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, name, cpf")
      .eq("id", creatorId)
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cpf = digitsOnly(String(profile.cpf ?? ""));
    if (cpf.length !== 11) {
      return new Response(
        JSON.stringify({ error: "Cadastre um CPF válido antes de sacar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: method } = await admin
      .from("creator_payout_methods")
      .select("pix_key, pix_key_type")
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (!method?.pix_key?.trim()) {
      return new Response(
        JSON.stringify({ error: "Cadastre uma chave PIX antes de sacar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: withdrawalId, error: createErr } = await admin.rpc(
      "create_withdrawal_pending_for",
      { p_creator_id: creatorId, p_amount: amount },
    );

    if (createErr) {
      return new Response(
        JSON.stringify({ error: createErr.message || "Erro ao criar saque" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const wid = withdrawalId as string;

    let syncPayToken: string;
    try {
      syncPayToken = await getSyncPayToken();
    } catch (e) {
      await admin.rpc("finalize_withdrawal", {
        p_status: "failed",
        p_failure_reason: String(e),
        p_withdrawal_id: wid,
        p_syncpay_id: null,
      });
      return new Response(
        JSON.stringify({
          error: "Falha na autenticação SyncPay. Tente novamente.",
          details: String(e),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cashOutPayload = {
      amount: Number(amount.toFixed(2)),
      description: `Saque Flare ${wid}`,
      pix_key_type: mapPixKeyType(method.pix_key_type),
      pix_key: String(method.pix_key).trim(),
      document: { type: "cpf", number: cpf },
    };

    console.log("SyncPay cash-out payload:", JSON.stringify({
      ...cashOutPayload,
      pix_key: "***",
      document: { type: "cpf", number: "***" },
    }));

    const cashOutRes = await fetch(`${SYNCPAY_BASE}/api/partner/v1/cash-out`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${syncPayToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(cashOutPayload),
    });

    const contentType = cashOutRes.headers.get("content-type") ?? "";
    let cashOutData: Record<string, unknown> = {};
    let detail = "";
    try {
      if (contentType.includes("application/json")) {
        cashOutData = await cashOutRes.json();
        detail = JSON.stringify(cashOutData);
      } else {
        detail = await cashOutRes.text();
      }
    } catch {
      detail = "unreadable response";
    }

    if (!cashOutRes.ok) {
      console.error("SyncPay cash-out error:", cashOutRes.status, detail.substring(0, 500));
      const reason =
        cashOutRes.status === 401 || cashOutRes.status === 403
          ? "Cash-out SyncPay não liberado ou credenciais inválidas. Contate o suporte."
          : `SyncPay rejeitou o saque (${cashOutRes.status})`;

      await admin.rpc("finalize_withdrawal", {
        p_status: "failed",
        p_failure_reason: reason,
        p_withdrawal_id: wid,
        p_syncpay_id: null,
      });

      return new Response(JSON.stringify({ error: reason, details: detail.substring(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("SyncPay cash-out response:", JSON.stringify(cashOutData));

    const syncpayId = String(
      cashOutData.reference_id ??
        cashOutData.identifier ??
        (cashOutData.data as Record<string, unknown> | undefined)?.reference_id ??
        (cashOutData.data as Record<string, unknown> | undefined)?.id ??
        "",
    );

    if (!syncpayId) {
      await admin.rpc("finalize_withdrawal", {
        p_status: "failed",
        p_failure_reason: "SyncPay não retornou reference_id",
        p_withdrawal_id: wid,
        p_syncpay_id: null,
      });
      return new Response(
        JSON.stringify({ error: "Resposta SyncPay inválida (sem reference_id)" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: markErr } = await admin.rpc("mark_withdrawal_processing", {
      p_withdrawal_id: wid,
      p_syncpay_id: syncpayId,
    });

    if (markErr) {
      console.error("mark_withdrawal_processing error:", markErr);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        withdrawal_id: wid,
        syncpay_id: syncpayId,
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("request-withdrawal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
