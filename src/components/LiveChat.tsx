import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import SendGiftButton from "@/components/SendGiftButton";
import TipCoinsButton from "@/components/TipCoinsButton";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  live_id: string;
  user_id: string;
  text: string;
  created_at: string;
  deleted_at?: string | null;
  profiles?: { name: string; avatar_url: string | null } | null;
}

interface LiveChatProps {
  liveId: string;
  className?: string;
  creatorId?: string;
  creatorName?: string;
  isHost?: boolean;
}

export function LiveChat({ liveId, className, creatorId, creatorName, isHost }: LiveChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("live_chat_messages")
      .select("*, profiles(name, avatar_url)")
      .eq("live_id", liveId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as ChatMessage[]);
      });
  }, [liveId]);

  useEffect(() => {
    const channel = supabase
      .channel(`live_chat:${liveId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_id=eq.${liveId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.deleted_at) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", newMsg.user_id)
            .single();
          setMessages((prev) => [...prev, { ...newMsg, profiles: profile ?? null }]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_chat_messages", filter: `live_id=eq.${liveId}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          if (updated.deleted_at) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    setInput("");
    const { error } = await supabase
      .from("live_chat_messages")
      .insert({ live_id: liveId, user_id: user.id, text });
    if (error) toast.error(error.message || "Não foi possível enviar");
    setSending(false);
  };

  const handleModerate = async (messageId: string) => {
    const { error } = await supabase.rpc("moderate_live_chat" as never, {
      p_message_id: messageId,
    } as never);
    if (error) toast.error(error.message);
    else setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Chat ao vivo</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          AO VIVO
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0 max-h-64">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Seja o primeiro a comentar!</p>
        )}
        {messages.map((msg) => {
          const canDelete = isHost || msg.user_id === user?.id;
          return (
            <div key={msg.id} className="flex items-start gap-2 group">
              <img
                src={msg.profiles?.avatar_url ?? "/placeholder.svg"}
                alt=""
                className="h-6 w-6 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40"
                loading="lazy"
                decoding="async"
              />
              <div className="bg-muted/50 rounded-xl px-3 py-1.5 min-w-0 max-w-[85%] flex-1">
                <span className="text-xs font-semibold text-primary mr-1.5">
                  {msg.profiles?.name ?? "Usuário"}
                </span>
                <span className="text-xs text-foreground/90">{msg.text}</span>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void handleModerate(msg.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-border/40">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 300))}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            className="h-8 text-sm bg-muted/20 border-border/50"
          />
          {creatorId && creatorName && !isHost && (
            <TipCoinsButton creatorId={creatorId} creatorName={creatorName} />
          )}
          <SendGiftButton liveId={liveId} />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50 hover:scale-105 transition-all flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3 border-t border-border/40">
          Faça login para participar do chat
        </p>
      )}
    </div>
  );
}
