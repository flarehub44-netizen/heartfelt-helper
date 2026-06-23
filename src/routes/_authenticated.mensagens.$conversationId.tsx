import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendMessage } from "@/lib/messages.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mensagens/$conversationId")({
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = useParams({ from: "/_authenticated/mensagens/$conversationId" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const send = useServerFn(sendMessage);

  const { data: conv } = useQuery({
    queryKey: ["conv", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, creator_id, fan_id, creator:profiles!conversations_creator_id_fkey(handle, display_name, avatar_url), fan:profiles!conversations_fan_id_fkey(handle, display_name, avatar_url)")
        .eq("id", conversationId)
        .maybeSingle();
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => send({ data: { conversationId, body } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const other = conv?.creator_id === user?.id ? conv?.fan : conv?.creator;

  return (
    <div className="flex h-screen flex-col md:h-[100dvh]">
      <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
        <Link to="/mensagens" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-sm font-bold uppercase">
          {other?.avatar_url ? (
            <img src={other.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            other?.display_name?.[0] ?? "?"
          )}
        </div>
        <div>
          <p className="font-semibold leading-tight">{other?.display_name}</p>
          <p className="text-xs text-muted-foreground">@{other?.handle}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "gradient-primary text-primary-foreground"
                      : "bg-card text-card-foreground"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Comece a conversa enviando uma mensagem.
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) sendMutation.mutate(text.trim());
        }}
        className="border-t border-border bg-background/80 p-3 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..." />
          <Button type="submit" disabled={!text.trim() || sendMutation.isPending} className="gradient-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
