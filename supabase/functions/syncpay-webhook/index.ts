import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Statuses that mean the payment was confirmed and money received
const PAID_STATUSES = ["completed", "COMPLETED", "PAID_OUT", "paid", "PAID", "approved", "APPROVED"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("SyncPay webhook payload:", JSON.stringify(payload));

    // SyncPay sends { data: { status, idtransaction, ... } }
    const data = payload.data ?? payload;
    const status = data.status ?? payload.status;
    const identifier = data.idtransaction ?? data.identifier ?? data.id ?? payload.identifier;

    if (!PAID_STATUSES.includes(status)) {
      console.log(`Ignoring status: ${status}`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!identifier) {
      console.error("No identifier in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up pending payment to get fan_id, creator_id, plan
    const { data: pending, error: pendingErr } = await supabase
      .from("pending_payments")
      .select("fan_id, creator_id, plan, amount, affiliate_ref")
      .eq("syncpay_id", identifier)
      .maybeSingle();

    if (pendingErr || !pending) {
      console.error("Pending payment not found for identifier:", identifier, pendingErr);
      return new Response(
        JSON.stringify({ error: "Pending payment not found", identifier }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { fan_id: fanId, creator_id: creatorId, plan, amount, affiliate_ref: affiliateRef } = pending;

    const projectId = Deno.env.get("SUPABASE_URL")!
      .split(".")[0]
      .split("//")[1];

    async function notifyUser(userId: string, subject: string, body: string, template: string) {
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, subject, body, template }),
        });
      } catch (e) {
        console.error("send-notification error (non-fatal):", e);
      }
    }

    // Tip payment flow
    if (plan === "tip") {
      const { data: existingTip } = await supabase
        .from("tips")
        .select("id")
        .eq("syncpay_id", identifier)
        .maybeSingle();

      if (existingTip) {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: tipErr } = await supabase.from("tips").insert({
        fan_id: fanId,
        creator_id: creatorId,
        amount,
        syncpay_id: identifier,
      });

      if (tipErr) {
        return new Response(JSON.stringify({ error: tipErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("pending_payments").delete().eq("syncpay_id", identifier);

      await notifyUser(
        fanId,
        "Gorjeta enviada com sucesso",
        "Sua gorjeta foi recebida pelo criador. Obrigado pelo apoio!",
        "tip_sent"
      );

      return new Response(JSON.stringify({ ok: true, tip: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: check if subscription already activated for this syncpay_id
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("syncpay_id", identifier)
      .maybeSingle();

    if (existingSub) {
      console.log("Subscription already activated for identifier:", identifier);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deactivate any previous subscription for this fan+creator
    await supabase
      .from("subscriptions")
      .update({ active: false })
      .eq("fan_id", fanId)
      .eq("creator_id", creatorId);

    // Insert new active subscription
    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        fan_id: fanId,
        creator_id: creatorId,
        plan,
        active: true,
        syncpay_id: identifier,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("Insert subscription error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the inserted subscription ID for affiliate tracking
    const { data: newSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("syncpay_id", identifier)
      .maybeSingle();

    // Clean up pending payment record
    await supabase
      .from("pending_payments")
      .delete()
      .eq("syncpay_id", identifier);

    // Register affiliate referral if applicable
    if (affiliateRef && newSub) {
      try {
        // Find the affiliate link by code
        const { data: affLink } = await supabase
          .from("affiliate_links")
          .select("id, affiliate_id")
          .eq("code", affiliateRef)
          .maybeSingle();

      if (affLink) {
          // Check if affiliate is approved
          const { data: affRequest } = await supabase
            .from("affiliate_requests")
            .select("status")
            .eq("user_id", affLink.affiliate_id)
            .maybeSingle();

          if (!affRequest || affRequest.status !== "approved") {
            console.log(`Affiliate ${affLink.affiliate_id} not approved, skipping commission`);
          } else {
          // Get current affiliate fee rate
          const { data: setting } = await supabase
            .from("platform_settings")
            .select("value")
            .eq("key", "affiliate_fee_rate")
            .maybeSingle();

          const commissionRate = setting ? parseFloat(setting.value) : 0.05;
          const commissionAmount = amount * commissionRate;

          await supabase
            .from("affiliate_referrals")
            .insert({
              affiliate_link_id: affLink.id,
              subscription_id: newSub.id,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              status: "pending",
            });

          console.log(`Affiliate referral created: link=${affLink.id} commission=${commissionAmount}`);
          } // end approved check
        }
      } catch (affErr) {
        console.error("Affiliate referral error (non-fatal):", affErr);
      }
    }

    // Fire Meta Purchase event (non-fatal) — platform + creator pixel
    try {
      // Fetch creator profile to get their pixel info
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("social_links")
        .eq("id", creatorId)
        .maybeSingle();

      const socialLinks = (creatorProfile?.social_links as Record<string, string> | null) ?? {};

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/meta-capi`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_name: "Purchase",
            value: amount,
            currency: "BRL",
            creator_pixel_id: socialLinks.meta_pixel_id || undefined,
            creator_access_token: socialLinks.meta_access_token || undefined,
          }),
        }
      );
    } catch (metaErr) {
      console.error("Meta CAPI error (non-fatal):", metaErr);
    }

    await supabase.from("conversion_events").insert({
      event_name: "subscription_activated",
      user_id: fanId,
      creator_id: creatorId,
      metadata: { plan, amount, identifier },
    }).then(() => {}).catch(() => {});

    const { data: fanProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", fanId)
      .maybeSingle();

    await notifyUser(
      fanId,
      "Assinatura ativada na Flare",
      `Olá${fanProfile?.name ? ` ${fanProfile.name}` : ""}! Sua assinatura foi ativada com sucesso. Aproveite o conteúdo exclusivo.`,
      "subscription_activated"
    );

    console.log(`Subscription activated: fan=${fanId} creator=${creatorId} plan=${plan} identifier=${identifier}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("syncpay-webhook error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
