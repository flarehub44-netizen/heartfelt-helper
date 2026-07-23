import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Radio, Users, Coins } from "lucide-react";
import Navbar from "@/components/Navbar";
import { NativeLivePlayer } from "@/components/NativeLivePlayer";
import { LiveChat } from "@/components/LiveChat";
import { LiveGiftOverlay } from "@/components/LiveGiftOverlay";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHasAccessToCreator } from "@/hooks/useMySubscriptions";
import { creatorLivePath, creatorProfilePath } from "@/lib/creatorPaths";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { promptPushAfterHighIntent } from "@/lib/promptPush";

/**
 * Canonical live page: /u/:handle/live/:liveId
 */
export default function CreatorLivePage({
  creatorIdOverride,
}: {
  creatorIdOverride?: string;
} = {}) {
  const { handle, liveId, id: creatorIdParam } = useParams<{
    handle?: string;
    liveId: string;
    id?: string;
  }>();
  const { user } = useAuth();
  const { supported, vapidConfigured, subscribed, permission, enablePush } = usePushSubscription();
  const [creatorId, setCreatorId] = useState<string | null>(creatorIdOverride ?? creatorIdParam ?? null);
  const [creator, setCreator] = useState<{
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [live, setLive] = useState<{
    id: string;
    title: string;
    status: string;
    min_plan: string;
    creator_id: string;
    gifts_total_coins?: number;
    peak_viewers?: number;
    goal_coins?: number;
    ticket_price_coins?: number;
    ingest_mode?: string;
    vod_url?: string | null;
  } | null>(null);
  const [sessionGifts, setSessionGifts] = useState(0);
  const [ticketOk, setTicketOk] = useState(false);

  useEffect(() => {
    if (creatorIdOverride || creatorIdParam) {
      setCreatorId(creatorIdOverride ?? creatorIdParam ?? null);
      return;
    }
    if (!handle) return;
    const clean = handle.replace(/^@/, "");
    void supabase
      .from("profiles")
      .select("id, name, handle, avatar_url")
      .eq("handle", clean)
      .eq("role", "creator")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCreatorId(data.id);
          setCreator(data);
        }
      });
  }, [handle, creatorIdOverride, creatorIdParam]);

  useEffect(() => {
    if (!liveId) return;
    void supabase
      .from("creator_lives")
      .select("id, title, status, min_plan, creator_id, gifts_total_coins, peak_viewers, goal_coins, ticket_price_coins, ingest_mode, vod_url")
      .eq("id", liveId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setLive(data as typeof live);
          setSessionGifts(Number((data as { gifts_total_coins?: number }).gifts_total_coins ?? 0));
          setCreatorId(data.creator_id);
        }
      });
  }, [liveId]);

  useEffect(() => {
    if (!creatorId || creator) return;
    void supabase
      .from("profiles")
      .select("id, name, handle, avatar_url")
      .eq("id", creatorId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCreator(data);
      });
  }, [creatorId, creator]);

  const isOwner = !!user && user.id === live?.creator_id;
  const hasPlan = useHasAccessToCreator(live?.creator_id ?? "", live?.min_plan ?? "free");
  const needsTicket = (live?.ticket_price_coins ?? 0) > 0;
  const canView =
    isOwner ||
    live?.min_plan === "free" ||
    hasPlan ||
    (needsTicket && ticketOk);

  useEffect(() => {
    if (!user || !liveId || !needsTicket) return;
    void supabase
      .from("live_ticket_unlocks" as never)
      .select("id")
      .eq("live_id", liveId)
      .eq("fan_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTicketOk(true);
      });
  }, [user, liveId, needsTicket]);

  useEffect(() => {
    if (!user || !live || live.status !== "live" || isOwner) return;
    void promptPushAfterHighIntent({
      supported,
      vapidConfigured,
      subscribed,
      permission,
      enablePush,
      reason: "Ative alertas para não perder a próxima live",
    });
  }, [user, live?.id, live?.status, isOwner, supported, vapidConfigured, subscribed, permission, enablePush]);

  const shareUrl =
    typeof window !== "undefined" && live && creatorId
      ? `${window.location.origin}${creatorLivePath(creatorId, live.id, creator?.handle)}`
      : "";

  if (!live || !creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando live…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-5xl pt-20 pb-24 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={creatorProfilePath(creatorId, creator?.handle, { tab: "Lives" })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-foreground truncate">{live.title}</h1>
              {live.status === "live" && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  <Radio className="h-3 w-3" /> AO VIVO
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">@{creator?.handle ?? "criador"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl);
              toast.success("Link da live copiado!");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar link
          </Button>
        </div>

        {isOwner && (
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card rounded-xl p-3 text-center">
              <Users className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{live.peak_viewers ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Peak viewers</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <Coins className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{sessionGifts}</p>
              <p className="text-[10px] text-muted-foreground">Moedas em gifts</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Ingest</p>
              <p className="text-sm font-bold text-foreground uppercase">{live.ingest_mode ?? "mesh"}</p>
              <p className="text-[10px] text-muted-foreground">SFU em breve</p>
            </div>
          </div>
        )}

        {(live.goal_coins ?? 0) > 0 && (
          <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Meta da live</span>
              <span className="font-semibold text-foreground">
                {sessionGifts} / {live.goal_coins} moedas
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all"
                style={{
                  width: `${Math.min(100, (sessionGifts / (live.goal_coins || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {!canView ? (
          <div className="glass-card rounded-2xl p-10 text-center space-y-4">
            <p className="font-semibold text-foreground">Conteúdo exclusivo</p>
            <p className="text-sm text-muted-foreground">
              {needsTicket
                ? `Desbloqueie esta live por ${live.ticket_price_coins} moedas`
                : "Assine um plano elegível para assistir."}
            </p>
            {needsTicket && user ? (
              <Button
                className="rounded-full bg-gradient-primary text-primary-foreground"
                onClick={async () => {
                  const { error } = await supabase.rpc("unlock_live_ticket" as never, {
                    p_live_id: live.id,
                  } as never);
                  if (error) {
                    if (/saldo|insufficient/i.test(error.message)) {
                      toast.error("Saldo insuficiente", {
                        action: {
                          label: "Recarregar",
                          onClick: () => {
                            window.location.href = `/wallet#packages`;
                          },
                        },
                      });
                    } else {
                      toast.error(error.message);
                    }
                  } else {
                    setTicketOk(true);
                    toast.success("Ingresso liberado!");
                  }
                }}
              >
                Comprar ingresso
              </Button>
            ) : needsTicket && !user ? (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  to={`/login?returnTo=${encodeURIComponent(
                    creatorLivePath(creatorId!, live.id, creator?.handle),
                  )}`}
                >
                  <Button className="rounded-full bg-gradient-primary text-primary-foreground">
                    Entrar para comprar
                  </Button>
                </Link>
                <Link to="/wallet">
                  <Button variant="outline" className="rounded-full">
                    Ver carteira
                  </Button>
                </Link>
              </div>
            ) : (
              <Link
                to={creatorProfilePath(creatorId!, creator?.handle, {
                  openSubscribe: "1",
                })}
              >
                <Button className="rounded-full bg-gradient-primary text-primary-foreground">
                  Assinar agora
                </Button>
              </Link>
            )}
          </div>
        ) : live.status === "ended" && live ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="font-semibold text-foreground">Live encerrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Peak {live.peak_viewers ?? 0} viewers · {sessionGifts} moedas em presentes
            </p>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-red-500/30">
            <NativeLivePlayer
              liveId={live.id}
              isHost={!!isOwner}
              onEnd={
                isOwner
                  ? () => {
                      void supabase
                        .from("creator_lives")
                        .update({ status: "ended" })
                        .eq("id", live.id);
                    }
                  : undefined
              }
            />
            <LiveGiftOverlay
              liveId={live.id}
              onGift={(g) => setSessionGifts((n) => n + g.cost)}
            />
          </div>
        )}

        {canView && live.status === "live" && (
          <div className="flex flex-col gap-3">
            <LiveChat
              liveId={live.id}
              creatorId={creatorId}
              creatorName={creator?.name}
              isHost={!!isOwner}
              className="min-h-[280px]"
            />
          </div>
        )}

        {live.status === "ended" && live.vod_url && (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Replay (VOD)</p>
            <a href={live.vod_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Assistir gravação →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
