import { useState, useRef, useEffect } from "react";
import { Send, Search, ChevronLeft, Coins } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const contactFromUrl = searchParams.get("contact");
  const { data: realConversations, isLoading } = useConversations();
  const conversations = realConversations ?? [];

  const [selectedContactId, setSelectedContactId] = useState<string | null>(contactFromUrl);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [unlockPrice, setUnlockPrice] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contactFromUrl) {
      setSelectedContactId(contactFromUrl);
    }
  }, [contactFromUrl]);

  useEffect(() => {
    if (!selectedContactId && conversations.length) {
      setSelectedContactId(conversations[0].contactId);
    }
  }, [conversations, selectedContactId]);

  const { messages: realMessages, sendMessage, unlockDm } = useMessages(selectedContactId);
  const selected = conversations.find((c) => c.contactId === selectedContactId) ?? conversations[0];

  useEffect(() => {
    setUnlockPrice(null);
  }, [selectedContactId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (user && selectedContactId) {
      try {
        await sendMessage.mutateAsync(input.trim());
        setInput("");
        setUnlockPrice(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("DM_UNLOCK_REQUIRED:")) {
          setUnlockPrice(Number(msg.split(":")[1]) || 0);
          toast.error("Desbloqueie a DM com moedas para continuar");
        } else {
          toast.error(msg || "Não foi possível enviar");
        }
      }
      return;
    }
    setInput("");
  };

  const filteredConvs = conversations.filter((c) =>
    c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container max-w-6xl pt-20 pb-0 flex-1 flex" style={{ height: "calc(100vh - 80px)" }}>
        <div className="flex w-full rounded-2xl overflow-hidden glass-card my-4 gap-0">
          <div className={`md:w-80 w-full md:flex-shrink-0 border-r border-border/50 flex flex-col ${selectedContactId ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-border/50">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">Mensagens</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa..."
                  className="pl-9 bg-muted/20 border-border/50 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isLoading && filteredConvs.length === 0 && (
                <div className="p-8 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma conversa ainda.</p>
                  <Link to="/discover" className="text-sm text-primary hover:underline">
                    Encontrar criadores
                  </Link>
                </div>
              )}
              {filteredConvs.map((conv) => (
                <button
                  key={conv.contactId}
                  onClick={() => setSelectedContactId(conv.contactId)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/20 border-b border-border/30",
                    selectedContactId === conv.contactId && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                >
                  <img
                    src={conv.contactAvatar ?? ""}
                    alt={conv.contactName}
                    className="h-11 w-11 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">{conv.contactName}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex-1 flex-col min-w-0 ${selectedContactId ? "flex" : "hidden md:flex"}`}>
            {selected && (
              <>
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedContactId(null)}
                      className="md:hidden flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      aria-label="Voltar"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <img
                      src={selected.contactAvatar ?? ""}
                      alt={selected.contactName}
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{selected.contactName}</p>
                      <p className="text-xs text-muted-foreground">Conversa</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {realMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma mensagem ainda. Diga oi!
                    </p>
                  )}
                  {realMessages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isMe ? "justify-end" : "justify-start")}
                      >
                        {!isMe && (
                          <img
                            src={selected.contactAvatar ?? ""}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover mr-2 self-end flex-shrink-0"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                            isMe
                              ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                              : "bg-muted/50 text-foreground rounded-bl-md"
                          )}
                        >
                          <p>{msg.text}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isMe ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                            )}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-border/50">
                  {unlockPrice != null && unlockPrice > 0 && (
                    <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-foreground">
                        Desbloqueie mensagens com esta criadora por{" "}
                        <span className="font-bold text-amber-400">{unlockPrice} moedas</span>
                        <span className="block text-muted-foreground mt-0.5">
                          Pagamento em moedas da carteira (não é Pix).
                        </span>
                      </p>
                      <Button
                        size="sm"
                        className="rounded-full bg-gradient-primary text-primary-foreground h-8 gap-1"
                        disabled={unlockDm.isPending}
                        onClick={async () => {
                          try {
                            await unlockDm.mutateAsync();
                            setUnlockPrice(null);
                            toast.success("DM desbloqueada!");
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : "Saldo insuficiente");
                          }
                        }}
                      >
                        <Coins className="h-3.5 w-3.5" />
                        Desbloquear
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Escreva uma mensagem..."
                      className="bg-muted/20 border-border/50 flex-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                    />
                    <button
                      onClick={() => void handleSend()}
                      disabled={!input.trim() || sendMessage.isPending}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
            {!selected && !isLoading && (
              <div className="flex-1 hidden md:flex items-center justify-center text-sm text-muted-foreground">
                Selecione uma conversa
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
