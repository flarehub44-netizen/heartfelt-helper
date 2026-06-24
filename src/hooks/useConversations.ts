import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationItem } from "@/types/profile";

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConversationItem[]> => {
      const userId = user!.id;

      // Get all messages involving the user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(id, name, handle, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, name, handle, avatar_url)")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!messages?.length) return [];

      // Group by contact
      const convMap = new Map<string, ConversationItem>();

      for (const msg of messages) {
        const isMe = msg.sender_id === userId;
        const contact = isMe ? (msg as any).receiver : (msg as any).sender;
        const contactId = contact.id;

        if (!convMap.has(contactId)) {
          convMap.set(contactId, {
            contactId,
            contactName: contact.name,
            contactAvatar: contact.avatar_url,
            contactHandle: contact.handle,
            lastMessage: msg.text,
            lastMessageTime: msg.created_at,
            unreadCount: 0,
          });
        }

        // Count unread (messages sent TO me that are unread)
        if (!isMe && !msg.read) {
          const conv = convMap.get(contactId)!;
          conv.unreadCount++;
        }
      }

      return Array.from(convMap.values());
    },
  });
}
