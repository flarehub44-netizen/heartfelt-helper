import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Coins, Flame, Sparkles, Users, Compass } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Action = {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: React.ReactNode;
  tone: "primary" | "warn" | "success";
  kind?: "streak" | "nav";
};

const TZ_TODAY = () => {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utc - 3 * 3600_000).toISOString().slice(0, 10);
};

type Props = {
  /** Compact strip for Feed (less padding / shorter copy). */
  compact?: boolean;
};

const NextActionCard = ({ compact = false }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["nextAction", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [wallet, streak, follows, subs] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("fan_streaks").select("last_check_in, current_streak").eq("user_id", user.id).maybeSingle(),
        supabase.from("follows").select("creator_id", { count: "exact", head: true }).eq("fan_id", user.id),
        supabase.from("subscriptions").select("creator_id", { count: "exact", head: true }).eq("fan_id", user.id).eq("active", true),
      ]);
      return {
        balance: wallet.data?.balance ?? 0,
        lastCheckIn: streak.data?.last_check_in ?? null,
        currentStreak: streak.data?.current_streak ?? 0,
        followsCount: follows.count ?? 0,
        subsCount: subs.count ?? 0,
      };
    },
    enabled: !!user,
  });

  const checkIn = useMutation({
    mutationFn: async () => {
      const { data: res, error } = await supabase.rpc("daily_check_in");
      if (error) throw error;
      return res as { already_checked_in: boolean; current_streak: number; bonus: number };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["fanStreak", user?.id] });
      qc.invalidateQueries({ queryKey: ["nextAction", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      if (res.already_checked_in) {
        toast({ title: "Você já fez check-in hoje", description: `Streak: ${res.current_streak} dias` });
      } else {
        toast({
          title: `+${res.bonus} moedas!`,
          description: `Streak de ${res.current_streak} dia${res.current_streak > 1 ? "s" : ""}`,
        });
      }
    },
    onError: () => toast({ title: "Erro no check-in", variant: "destructive" }),
  });

  if (isLoading || !data) return null;

  // Hide "all good" card in compact feed mode to reduce noise
  const today = TZ_TODAY();
  const action: Action = (() => {
    if (data.subsCount === 0) {
      return {
        title: "Conheça os planos dos seus favoritos",
        description: compact
          ? "Apoie quem você ama com uma assinatura."
          : "Cada criador define os próprios planos. Apoie quem você ama.",
        cta: "Ver criadores",
        href: "/discover",
        icon: <Users className={compact ? "h-4 w-4" : "h-5 w-5"} />,
        tone: "primary",
        kind: "nav",
      };
    }
    if (data.balance < 50) {
      return {
        title: "Recarregue suas moedas",
        description: compact
          ? `Saldo: ${data.balance} 🪙 — gifts, tips e PPV.`
          : `Saldo atual: ${data.balance}. Recarregue para dar gorjetas, presentes e desbloquear conteúdos.`,
        cta: "Recarregar",
        href: "/wallet#packages",
        icon: <Coins className={compact ? "h-4 w-4" : "h-5 w-5"} />,
        tone: "warn",
        kind: "nav",
      };
    }
    if (data.lastCheckIn !== today) {
      return {
        title: "Faça check-in diário",
        description: compact
          ? `+5 moedas${data.currentStreak > 0 ? ` · streak ${data.currentStreak}d` : ""}`
          : `Ganhe +5 moedas e mantenha seu streak${data.currentStreak > 0 ? ` de ${data.currentStreak}d` : ""}.`,
        cta: "Fazer check-in",
        href: "/me#streak",
        icon: <Flame className={compact ? "h-4 w-4" : "h-5 w-5"} />,
        tone: "warn",
        kind: "streak",
      };
    }
    if (data.followsCount < 3) {
      return {
        title: "Descubra novos criadores",
        description: compact
          ? "Siga ao menos 3 para personalizar o feed."
          : "Siga ao menos 3 criadores para personalizar seu feed.",
        cta: "Explorar",
        href: "/discover",
        icon: <Compass className={compact ? "h-4 w-4" : "h-5 w-5"} />,
        tone: "primary",
        kind: "nav",
      };
    }
    if (compact) return null as unknown as Action;
    return {
      title: "Tudo em dia!",
      description: "Continue acompanhando o feed e interagindo com seus criadores.",
      cta: "Ver feed",
      href: "/feed",
      icon: <Sparkles className="h-5 w-5" />,
      tone: "success",
      kind: "nav",
    };
  })();

  if (!action) return null;

  const tones = {
    primary: "from-primary/15 to-primary/5 border-primary/30 text-primary",
    warn: "from-orange-500/15 to-orange-500/5 border-orange-500/30 text-orange-500",
    success: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-500",
  } as const;

  const iconColor = tones[action.tone].split(" ").slice(-1)[0];
  const content = (
    <div className={`flex items-start gap-3 ${compact ? "gap-3" : "gap-4"}`}>
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-background/60 backdrop-blur ${iconColor} ${
          compact ? "h-9 w-9" : "h-11 w-11"
        }`}
      >
        {action.icon}
      </div>
      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Próxima ação</span>
          </div>
        )}
        <h3
          className={`font-display font-bold text-foreground leading-snug ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {action.title}
        </h3>
        <p className={`text-muted-foreground mt-0.5 ${compact ? "text-xs" : "text-sm mt-1"}`}>
          {action.description}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-sm font-semibold flex-shrink-0 pt-1 group-hover:translate-x-0.5 transition-transform">
        {action.cta}
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );

  const className = `block rounded-2xl border bg-gradient-to-br ${tones[action.tone]} transition-transform hover:scale-[1.01] group ${
    compact ? "p-3.5" : "p-5"
  }`;

  if (action.kind === "streak") {
    return (
      <button
        type="button"
        className={`${className} w-full text-left`}
        disabled={checkIn.isPending}
        onClick={() => checkIn.mutate()}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={action.href} className={className}>
      {content}
    </Link>
  );
};

export default NextActionCard;
