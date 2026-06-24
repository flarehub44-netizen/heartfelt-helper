import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  Menu, X, Flame, Search, User, LayoutDashboard, MessageCircle, Rss,
  LogOut, UserCircle2, Settings, Compass, CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/NotificationBell";
import { avatarUrl } from "@/lib/imageTransform";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loggedIn = !!user;
  const isCreator = profile?.role === "creator";
  const { data: conversations } = useConversations();
  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
  const queryClient = useQueryClient();

  // Real-time toast for new messages (only when not on /messages)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`new-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
          if (window.location.pathname === "/messages") return;
          const msg = payload.new as { sender_id: string; text: string };
          const { data: sender } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", msg.sender_id)
            .single();
          const preview = msg.text?.slice(0, 60) ?? "";
          toast(`💬 ${sender?.name ?? "Mensagem"}`, {
            description: preview,
            action: { label: "Ver", onClick: () => navigate("/messages") },
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const guestLinks = [
    { label: "Início", to: "/" },
    { label: "Descobrir", to: "/discover" },
  ];

  const fanLinks = [
    { label: "Feed", to: "/feed" },
    { label: "Descobrir", to: "/discover" },
    { label: "Mensagens", to: "/messages" },
    { label: "Assinaturas", to: "/subscriptions" },
  ];

  const creatorLinks = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Mensagens", to: "/messages" },
  ];

  const navLinks = !loggedIn ? guestLinks : isCreator ? creatorLinks : fanLinks;

  const profilePath = isCreator ? `/creator/${user?.id}` : `/profile/${user?.id}`;

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    setDropdownOpen(false);
    navigate("/");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const linkClass = (to: string) =>
    `text-sm font-medium transition-colors duration-200 ${
      pathname === to ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow animate-pulse-glow">
            <Flame className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-gradient">Flare</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, to }) => (
            <Link key={to} to={to} className={`relative ${linkClass(to)}`}>
              {label}
              {to === "/messages" && unreadMessages > 0 && (
                <span className="absolute -top-2 -right-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
          >
            <Search className="h-4 w-4" />
          </button>

          {loggedIn && <NotificationBell />}

          {loggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="h-9 w-9 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
              >
                {profile?.avatar_url ? (
                  <img src={avatarUrl(profile.avatar_url, 36)} alt="" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-11 w-52 rounded-xl bg-card border border-border/50 shadow-lg py-1 z-50">
                  <Link
                    to={profilePath}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                    Meu perfil
                  </Link>
                  {!isCreator && (
                    <Link
                      to="/subscriptions"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Assinaturas
                    </Link>
                  )}
                  {isCreator && (
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Configurações
                    </Link>
                  )}
                  <div className="border-t border-border/40 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Entrar
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105"
              >
                <User className="h-3.5 w-3.5" />
                Criar conta
              </Link>
            </>
          )}
        </div>

        {/* Logged-in mobile: search + notifications (BottomNav handles main navigation) */}
        {loggedIn ? (
          <div className="md:hidden flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button className="md:hidden text-muted-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        )}
      </div>

      {/* Guest mobile menu */}
      {open && !loggedIn && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-4">
          {navLinks.map(({ label, to }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="text-sm font-medium text-foreground">
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground">
              Entrar
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Criar conta
            </Link>
          </div>
        </div>
      )}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Navbar;
