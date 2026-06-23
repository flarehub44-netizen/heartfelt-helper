import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createPixSchema = z.object({
  creatorId: z.string().uuid(),
  tierId: z.string().uuid(),
});

/**
 * Cria (ou reaproveita) uma assinatura `pending` e gera um pagamento Pix mock.
 */
export const createPixCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createPixSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: tier, error: tierErr } = await supabase
      .from("tiers")
      .select("id, price_brl_cents, creator_id, name")
      .eq("id", data.tierId)
      .maybeSingle();
    if (tierErr || !tier) throw new Error("Camada não encontrada");
    if (tier.creator_id !== data.creatorId) throw new Error("Camada inválida");
    if (tier.creator_id === userId) throw new Error("Você não pode assinar a si mesmo");

    // upsert subscription pending
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("fan_id", userId)
      .eq("creator_id", data.creatorId)
      .maybeSingle();

    let subscriptionId: string;
    if (existingSub) {
      subscriptionId = existingSub.id;
      await supabase
        .from("subscriptions")
        .update({ tier_id: data.tierId, status: "pending" })
        .eq("id", subscriptionId);
    } else {
      const { data: created, error: subErr } = await supabase
        .from("subscriptions")
        .insert({
          fan_id: userId,
          creator_id: data.creatorId,
          tier_id: data.tierId,
          status: "pending",
        })
        .select("id")
        .single();
      if (subErr || !created) throw new Error(subErr?.message ?? "Erro ao assinar");
      subscriptionId = created.id;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        amount_brl_cents: tier.price_brl_cents,
        method: "pix_mock",
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, amount_brl_cents, expires_at")
      .single();
    if (payErr || !payment) throw new Error(payErr?.message ?? "Erro ao criar cobrança");

    // gera payload pix mock
    const pixPayload = `00020126580014BR.GOV.BCB.PIX0136${payment.id}5204000053039865802BR5913Vibe Creators6009SAO PAULO62070503VIB6304MOCK`;
    await supabase
      .from("payments")
      .update({ pix_qr_payload: pixPayload })
      .eq("id", payment.id);

    return {
      paymentId: payment.id,
      subscriptionId,
      amountCents: payment.amount_brl_cents,
      pixPayload,
      expiresAt: payment.expires_at,
    };
  });

const confirmSchema = z.object({ paymentId: z.string().uuid() });

/**
 * Confirma pagamento mock: marca como pago, ativa assinatura, registra comissão de afiliado.
 */
export const confirmPixMockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => confirmSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id, user_id, subscription_id, amount_brl_cents, status")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (payErr || !payment) throw new Error("Pagamento não encontrado");
    if (payment.user_id !== userId) throw new Error("Não autorizado");
    if (payment.status === "paid") {
      return { ok: true, already: true };
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: now.toISOString() })
      .eq("id", payment.id);

    if (payment.subscription_id) {
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          started_at: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", payment.subscription_id);
    }

    // afiliado: se o usuário foi indicado, registra 20% no primeiro pagamento
    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.referred_by) {
      const { data: existingRef } = await supabase
        .from("affiliate_referrals")
        .select("id")
        .eq("referred_user_id", userId)
        .eq("affiliate_user_id", profile.referred_by)
        .not("payment_id", "is", null)
        .maybeSingle();

      if (!existingRef) {
        const commission = Math.round(payment.amount_brl_cents * 0.2);
        await supabase.from("affiliate_referrals").insert({
          affiliate_user_id: profile.referred_by,
          referred_user_id: userId,
          payment_id: payment.id,
          commission_brl_cents: commission,
        });
      }
    }

    return { ok: true, already: false };
  });
