import { useRef, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { creatorProfilePath, creatorLivePath } from "@/lib/creatorPaths";
import { subscribePath } from "@/lib/checkoutIntent";
import { toast } from "sonner";

const typeIcon: Record<string, string> = {
  new_subscriber: "🎉",
  subscription_activated: "✅",
  renewal_reminder: "🔔",
  new_post: "📸",
  new_message: "💬",
  comment_reply: "🗨️",
  checkout_abandoned: "⏰",
  creator_live: "🔴",
  creator_approved: "✨",
};

function getNotificationPath(type: string, data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const creatorId = typeof data.creator_id === "string" ? data.creator_id : null;
  const handle =
    typeof data.handle === "string"
      ? data.handle
      : typeof data.creator_handle === "string"
        ? data.creator_handle
        : null;
  const liveId = typeof data.live_id === "string" ? data.live_id : null;

  if (typeof data.href === "string" && data.href.startsWith("/")) {
    return data.href;
  }
  if (type === "creator_live" && creatorId && liveId) {
    return creatorLivePath(creatorId, liveId, handle);
  }
  if ((type === "comment_reply" || type === "new_post" || type === "creator_live") && creatorId) {
    return creatorProfilePath(creatorId, handle, type === "creator_live" ? { tab: "Lives" } : undefined);
  }
  if (type === "checkout_abandoned" && creatorId) {
    const plan = typeof data.plan === "string" ? data.plan : undefined;
    return subscribePath(creatorId, { handle, plan });
  }
  if (type === "renewal_reminder" || type === "subscription_expired") {
    if (creatorId) return subscribePath(creatorId, { handle });
    return "/subscriptions";
  }
  if (type === "creator_approved") {
    return "/dashboard";
  }
  if (type === "new_message") return "/messages";
  return null;
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const {
    supported,
    subscribed,
    busy,
    enablePush,
    vapidConfigured,
  } = usePushSubscription();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const showPushCta = supported && vapidConfigured && !subscribed;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl bg-card border border-border/50 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm font-semibold text-foreground">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary hover:underline transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {showPushCta && (
            <div className="px-4 py-3 border-b border-border/40 bg-primary/5">
              <p className="text-xs text-muted-foreground mb-2">
                Ative alertas no navegador para Pix, lives e mensagens.
              </p>
              <button
                disabled={busy}
                onClick={async () => {
                  const res = await enablePush();
                  if (res.ok) {
                    toast.success("Alertas ativados");
                  } else {
                    toast.error(res.error ?? "Não foi possível ativar");
                  }
                }}
                className="w-full rounded-full bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-60"
              >
                {busy ? "Ativando…" : "Ativar alertas"}
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => {
                const path = getNotificationPath(n.type, n.data);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      if (path) {
                        setOpen(false);
                        navigate(path);
                      }
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {typeIcon[n.type] ?? "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !n.read ? "font-semibold text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
