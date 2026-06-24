import { Link, useLocation } from "react-router-dom";
import { Home, Compass, MessageCircle, User, LayoutDashboard, Bookmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";

const BottomNav = () => {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const { data: conversations } = useConversations();
  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0);

  if (!user) return null;

  const isCreator = profile?.role === "creator";

  type Tab = { to: string; icon: React.ElementType; label: string; badge?: number };

  const tabs: Tab[] = isCreator
    ? [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/messages", icon: MessageCircle, label: "Mensagens", badge: unreadMessages },
        { to: `/creator/${user.id}`, icon: User, label: "Perfil" },
      ]
    : [
        { to: "/feed", icon: Home, label: "Feed" },
        { to: "/discover", icon: Compass, label: "Descobrir" },
        { to: "/messages", icon: MessageCircle, label: "Mensagens", badge: unreadMessages },
        { to: "/bookmarks", icon: Bookmark, label: "Salvos" },
        { to: `/profile/${user.id}`, icon: User, label: "Perfil" },
      ];

  const isActive = (to: string) => {
    if (to === "/feed") return pathname === "/feed";
    if (to.startsWith("/creator/") || to.startsWith("/profile/")) return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <>
      <div className="md:hidden h-16" />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center justify-around h-16">
          {tabs.map(({ to, icon: Icon, label, badge }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
