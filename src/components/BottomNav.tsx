import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Compass,
  MessageCircle,
  User,
  LayoutDashboard,
  Video,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { useExpiringSubscriptions } from "@/hooks/useMySubscriptions";
import { usePendingCheckouts } from "@/hooks/usePendingCheckouts";

const BottomNav = () => {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const { data: conversations } = useConversations();
  const { data: expiring = [] } = useExpiringSubscriptions(7);
  const { data: pendingCheckouts } = usePendingCheckouts();
  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
  const hasGmvAction = expiring.length > 0 || (pendingCheckouts?.length ?? 0) > 0;

  if (!user) return null;

  const isCreator = profile?.role === "creator";
  const ownHandle = profile?.handle?.replace(/^@/, "") ?? null;
  const ownProfilePath =
    isCreator
      ? ownHandle
        ? `/u/${ownHandle}`
        : user
          ? `/creator/${user.id}`
          : null
      : user
        ? `/profile/${user.id}`
        : null;

  type Tab = {
    to: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
    warn?: boolean;
  };

  const tabs: Tab[] = isCreator
    ? [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/messages", icon: MessageCircle, label: "Mensagens", badge: unreadMessages },
        { to: "/dashboard?live=1", icon: Video, label: "Ao vivo" },
        { to: "/me", icon: User, label: "Perfil" },
      ]
    : [
        { to: "/feed", icon: Home, label: "Feed" },
        { to: "/discover", icon: Compass, label: "Descobrir" },
        { to: "/subscriptions", icon: CreditCard, label: "Assinaturas", warn: hasGmvAction },
        { to: "/messages", icon: MessageCircle, label: "Mensagens", badge: unreadMessages },
        { to: "/me", icon: User, label: "Perfil" },
      ];

  const isActive = (to: string) => {
    const pathOnly = to.split("?")[0];
    if (pathOnly === "/feed") return pathname === "/feed";
    if (pathOnly === "/subscriptions") return pathname.startsWith("/subscriptions");
    if (pathOnly === "/dashboard" && to.includes("live=1")) {
      return false; // highlight only via explicit live action is awkward; keep Dashboard for /dashboard
    }
    if (pathOnly === "/dashboard") {
      return pathname.startsWith("/dashboard") && !pathname.includes("?");
    }
    if (to === "/me") {
      if (pathname === "/me") return true;
      if (ownProfilePath && (pathname === ownProfilePath || pathname.startsWith(`${ownProfilePath}/`))) {
        return true;
      }
      return false;
    }
    return pathname.startsWith(pathOnly);
  };

  return (
    <>
      <div className="md:hidden h-16" />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center justify-around h-16">
          {tabs.map(({ to, icon: Icon, label, badge, warn }) => {
            const active = isActive(to);
            return (
              <Link
                key={`${to}-${label}`}
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
                  {warn && !(badge != null && badge > 0) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background" />
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
