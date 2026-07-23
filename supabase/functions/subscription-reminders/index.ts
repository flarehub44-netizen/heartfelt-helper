import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = Deno.env.get("INTERNAL_FN_SECRET") ?? "";

    async function notifyPush(payload: {
      user_id: string;
      title: string;
      body: string;
      type: string;
      url?: string;
    }) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      };
      if (internalSecret) headers["x-internal-secret"] = internalSecret;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-push`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        console.error("send-push failed:", res.status, await res.text());
      }
    }

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dayStart = new Date(in3Days);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(in3Days);
    dayEnd.setHours(23, 59, 59, 999);

    let sent = 0;

    const { data: expiringSoon } = await supabase
      .from("subscriptions")
      .select(
        "fan_id, creator_id, plan, fan:profiles!subscriptions_fan_id_fkey(name), creator:profiles!subscriptions_creator_id_fkey(name, handle)"
      )
      .eq("active", true)
      .gte("expires_at", dayStart.toISOString())
      .lte("expires_at", dayEnd.toISOString());

    for (const sub of expiringSoon ?? []) {
      const fan = sub.fan as { name?: string } | null;
      const creator = sub.creator as { name?: string; handle?: string | null } | null;
      const creatorName = creator?.name ?? "sua criadora";
      const plan = (sub as { plan?: string }).plan ?? "fan";
      const deepLink = creator?.handle
        ? `/u/${creator.handle}?openSubscribe=1&plan=${encodeURIComponent(plan)}`
        : `/creator/${sub.creator_id}?openSubscribe=1&plan=${encodeURIComponent(plan)}`;
      await notifyPush({
        user_id: sub.fan_id,
        title: `Assinatura renova em 3 dias — ${creatorName}`,
        body: `Olá${fan?.name ? ` ${fan.name}` : ""}! Renove para não perder o acesso.`,
        type: "renewal_reminder",
        url: deepLink,
      });
      sent++;
    }

    const { data: expired } = await supabase
      .from("subscriptions")
      .select(
        "fan_id, creator_id, plan, fan:profiles!subscriptions_fan_id_fkey(name), creator:profiles!subscriptions_creator_id_fkey(name, handle)"
      )
      .eq("active", true)
      .lt("expires_at", now.toISOString());

    for (const sub of expired ?? []) {
      await supabase
        .from("subscriptions")
        .update({ active: false })
        .eq("fan_id", sub.fan_id)
        .eq("creator_id", sub.creator_id)
        .eq("active", true)
        .lt("expires_at", now.toISOString());

      const fan = sub.fan as { name?: string } | null;
      const creator = sub.creator as { name?: string; handle?: string | null } | null;
      const creatorName = creator?.name ?? "sua criadora";
      const plan = (sub as { plan?: string }).plan ?? "fan";
      const deepLink = creator?.handle
        ? `/u/${creator.handle}?openSubscribe=1&plan=${encodeURIComponent(plan)}`
        : `/creator/${sub.creator_id}?openSubscribe=1&plan=${encodeURIComponent(plan)}`;
      await notifyPush({
        user_id: sub.fan_id,
        title: `Assinatura expirada — ${creatorName}`,
        body: `Olá${fan?.name ? ` ${fan.name}` : ""}! Renove para voltar a acessar.`,
        type: "subscription_expired",
        url: deepLink,
      });
      sent++;
    }

    const olderThan = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const newerThan = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: abandoned } = await supabase
      .from("pending_checkouts")
      .select(
        "id, fan_id, creator_id, plan_name, amount, created_at, fan:profiles!pending_checkouts_fan_id_fkey(name), creator:profiles!pending_checkouts_creator_id_fkey(name, handle)"
      )
      .lte("created_at", olderThan)
      .gte("created_at", newerThan)
      .is("reminded_at", null);

    for (const row of abandoned ?? []) {
      const fan = row.fan as { name?: string } | null;
      const creator = row.creator as { name?: string; handle?: string | null } | null;
      const creatorName = creator?.name ?? "sua criadora";
      const amount = Number(row.amount).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const deepLink = creator?.handle
        ? `/u/${creator.handle}?openSubscribe=1&plan=${encodeURIComponent(row.plan_name)}`
        : `/creator/${row.creator_id}?openSubscribe=1&plan=${encodeURIComponent(row.plan_name)}`;

      await notifyPush({
        user_id: row.fan_id,
        title: `Pix pendente — ${creatorName}`,
        body: `Olá${fan?.name ? ` ${fan.name}` : ""}! Pagamento de ${amount} ainda pendente.`,
        type: "checkout_abandoned",
        url: deepLink,
      });

      await supabase
        .from("pending_checkouts")
        .update({ reminded_at: now.toISOString() })
        .eq("id", row.id);

      sent++;
    }

    // Remind fans of scheduled lives starting in the next 30–90 minutes
    const in30 = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const in90 = new Date(now.getTime() + 90 * 60 * 1000).toISOString();
    const { data: upcomingLives } = await supabase
      .from("creator_lives")
      .select("id, creator_id, title, scheduled_at, min_plan")
      .eq("status", "scheduled")
      .is("reminder_sent_at", null)
      .gte("scheduled_at", in30)
      .lte("scheduled_at", in90);

    for (const live of upcomingLives ?? []) {
      const { data: creator } = await supabase
        .from("profiles")
        .select("name, handle")
        .eq("id", live.creator_id)
        .maybeSingle();
      const href = creator?.handle
        ? `/u/${creator.handle}/live/${live.id}`
        : `/creator/${live.creator_id}/live/${live.id}`;

      const { data: fans } = await supabase
        .from("subscriptions")
        .select("fan_id, plan")
        .eq("creator_id", live.creator_id)
        .eq("active", true);

      for (const fan of fans ?? []) {
        await notifyPush({
          user_id: fan.fan_id,
          title: `${creator?.name ?? "Criador"} entra ao vivo em breve`,
          body: live.title || "Sua live agendada começa logo",
          type: "creator_live",
          url: href,
        });
        await supabase.from("notifications").insert({
          user_id: fan.fan_id,
          type: "creator_live",
          title: `${creator?.name ?? "Criador"} entra ao vivo em breve`,
          body: live.title || "Sua live agendada começa logo",
          data: {
            creator_id: live.creator_id,
            live_id: live.id,
            handle: creator?.handle,
            href,
          },
        });
        sent++;
      }

      await supabase
        .from("creator_lives")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", live.id);
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
