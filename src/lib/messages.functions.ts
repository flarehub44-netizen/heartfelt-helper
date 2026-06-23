import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000),
});

/**
 * Envia mensagem. Se conversationId não vier, cria conversation
 * (o usuário pode ser o fan ou o creator — a tabela apenas registra os dois lados).
 */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => sendMessageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let convId = data.conversationId;

    if (!convId) {
      if (!data.recipientId) throw new Error("Destinatário obrigatório");
      // Procura conversation existente em qualquer direção
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(creator_id.eq.${userId},fan_id.eq.${data.recipientId}),and(creator_id.eq.${data.recipientId},fan_id.eq.${userId})`,
        )
        .maybeSingle();
      if (existing) {
        convId = existing.id;
      } else {
        // Determina quem é creator: o destinatário é creator? olha profile
        const { data: destProfile } = await supabase
          .from("profiles")
          .select("is_creator")
          .eq("id", data.recipientId)
          .maybeSingle();
        const creatorId = destProfile?.is_creator ? data.recipientId : userId;
        const fanId = creatorId === userId ? data.recipientId : userId;
        const { data: created, error: convErr } = await supabase
          .from("conversations")
          .insert({ creator_id: creatorId, fan_id: fanId })
          .select("id")
          .single();
        if (convErr || !created) throw new Error(convErr?.message ?? "Erro");
        convId = created.id;
      }
    }

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({ conversation_id: convId, sender_id: userId, body: data.body })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", convId);

    return msg;
  });
