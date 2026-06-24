import { useState, useRef, useEffect } from "react";
import { Send, Search, Phone, Video, MoreVertical, Image, Smile, ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const contactFromUrl = searchParams.get("contact");
  const { data: realConversations, isLoading } = useConversations();
  const conversations = realConversations ?? [];

  const [selectedContactId, setSelectedContactId] = useState<string | null>(contactFromUrl);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
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

  const { messages: realMessages, sendMessage } = useMessages(selectedContactId);
  const selected = conversations.find((c) => c.contactId === selectedContactId) ?? conversations[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (user && selectedContactId) {
      sendMessage.mutate(input.trim());
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
          {/* Conversation list — hidden on mobile when a chat is open */}
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
                  <div className="relative flex-shrink-0">
                    <img src={conv.contactAvatar ?? ""} alt={conv.contactName} className="h-11 w-11 rounded-full object-cover" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  </div>
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

          {/* Chat panel — hidden on mobile when no chat is open */}
          <div className={`flex-1 flex-col min-w-0 ${selectedContactId ? "flex" : "hidden md:flex"}`}>
            {selected && (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedContactId(null)}
                      className="md:hidden flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      aria-label="Voltar"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <img src={selected.contactAvatar ?? ""} alt={selected.contactName} className="h-10 w-10 rounded-full object-cover" />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{selected.contactName}</p>
                      <p className="text-xs text-green-400">Online agora</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                      <Video className="h-4 w-4" />
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {realMessages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isMe ? "justify-end" : "justify-start")}
                      >
                        {!isMe && (
                          <img src={selected.contactAvatar ?? ""} alt="" className="h-7 w-7 rounded-full object-cover mr-2 self-end flex-shrink-0" />
                        )}
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                          isMe
                            ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/50 text-foreground rounded-bl-md"
                        )}>
                          <p>{msg.text}</p>
                          <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                      <Image className="h-5 w-5" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                      <Smile className="h-5 w-5" />
                    </button>
                    <Input
                      placeholder="Escreva uma mensagem..."
                      className="bg-muted/20 border-border/50 flex-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
