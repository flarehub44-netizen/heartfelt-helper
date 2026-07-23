import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function useMessages(contactId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const messagesQuery = useQuery({
    queryKey: ["messages", userId, contactId],
    enabled: !!userId && !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  // Mark as read
  useEffect(() => {
    if (!userId || !contactId) return;
    supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", contactId)
      .eq("receiver_id", userId)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      });
  }, [userId, contactId, messagesQuery.data]);

  // Realtime
  useEffect(() => {
    if (!userId || !contactId) return;

    const channel = supabase
      .channel(`messages-${userId}-${contactId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (
            (msg.sender_id === userId && msg.receiver_id === contactId) ||
            (msg.sender_id === contactId && msg.receiver_id === userId)
          ) {
            queryClient.invalidateQueries({ queryKey: ["messages", userId, contactId] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, contactId]);

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!userId || !contactId) throw new Error("Missing user or contact");

      if (userId !== contactId) {
        const { data: allowed, error: canErr } = await supabase.rpc(
          "can_message_creator",
          { p_creator_id: contactId }
        );
        if (canErr) throw canErr;
        if (!allowed) {
          const { data: creator } = await supabase
            .from("profiles")
            .select("dm_price_coins")
            .eq("id", contactId)
            .maybeSingle();
          const price = Number((creator as { dm_price_coins?: number } | null)?.dm_price_coins ?? 0);
          if (price > 0) {
            throw new Error(`DM_UNLOCK_REQUIRED:${price}`);
          }
          throw new Error("Mensagens diretas exigem assinatura ativa ou desbloqueio");
        }
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: contactId,
        text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId, contactId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const unlockDm = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error("Missing contact");
      const { error } = await supabase.rpc("unlock_dm_with_coins" as never, {
        p_creator_id: contactId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId, contactId] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage,
    unlockDm,
  };
}
