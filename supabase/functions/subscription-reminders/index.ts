import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const projectId = Deno.env.get("SUPABASE_URL")!
      .split(".")[0]
      .split("//")[1];

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dayStart = new Date(in3Days);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(in3Days);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: expiringSoon } = await supabase
      .from("subscriptions")
      .select("fan_id, fan:profiles!subscriptions_fan_id_fkey(name)")
      .eq("active", true)
      .gte("expires_at", dayStart.toISOString())
      .lte("expires_at", dayEnd.toISOString());

    let sent = 0;
    for (const sub of expiringSoon ?? []) {
      const fan = sub.fan as { name?: string } | null;
      await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: sub.fan_id,
          subject: "Sua assinatura Flare renova em 3 dias",
          body: `Olá${fan?.name ? ` ${fan.name}` : ""}! Sua assinatura expira em breve. Renove em /subscriptions para não perder o acesso.`,
          template: "renewal_reminder",
        }),
      });
      sent++;
    }

    const { data: expired } = await supabase
      .from("subscriptions")
      .select("fan_id, fan:profiles!subscriptions_fan_id_fkey(name)")
      .eq("active", true)
      .lt("expires_at", now.toISOString());

    for (const sub of expired ?? []) {
      await supabase
        .from("subscriptions")
        .update({ active: false })
        .eq("fan_id", sub.fan_id)
        .eq("active", true)
        .lt("expires_at", now.toISOString());

      const fan = sub.fan as { name?: string } | null;
      await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: sub.fan_id,
          subject: "Sua assinatura Flare expirou",
          body: `Olá${fan?.name ? ` ${fan.name}` : ""}! Sua assinatura expirou. Renove em /subscriptions para voltar a acessar o conteúdo.`,
          template: "subscription_expired",
        }),
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
