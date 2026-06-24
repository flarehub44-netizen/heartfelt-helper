import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  live_id: string;
  user_id: string;
  text: string;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

interface LiveChatProps {
  liveId: string;
  className?: string;
}

export function LiveChat({ liveId, className }: LiveChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load recent messages
  useEffect(() => {
    supabase
      .from("live_chat_messages" as any)
      .select("*, profiles(name, avatar_url)")
      .eq("live_id", liveId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });
  }, [liveId]);

  // Subscribe to new messages in real time
  useEffect(() => {
    const channel = supabase
      .channel(`live_chat:${liveId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_id=eq.${liveId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", newMsg.user_id)
            .single();
          setMessages((prev) => [...prev, { ...newMsg, profiles: profile ?? null }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [liveId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    setInput("");
    await supabase
      .from("live_chat_messages" as any)
      .insert({ live_id: liveId, user_id: user.id, text });
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className={cn("flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Chat ao vivo</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          AO VIVO
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0 max-h-64">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Seja o primeiro a comentar!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <img
              src={msg.profiles?.avatar_url ?? "/placeholder.svg"}
              alt=""
              className="h-6 w-6 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40"
            />
            <div className="bg-muted/50 rounded-xl px-3 py-1.5 min-w-0 max-w-[85%]">
              <span className="text-xs font-semibold text-primary mr-1.5">{msg.profiles?.name ?? "Usuário"}</span>
              <span className="text-xs text-foreground/90">{msg.text}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-border/40">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 300))}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            className="h-8 text-sm bg-muted/20 border-border/50"
          />
          <button
            onClick={handleSend}
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
