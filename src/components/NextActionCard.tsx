import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Coins, Flame, Sparkles, Users, Compass } from "lucide-react";

type Action = {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: React.ReactNode;
  tone: "primary" | "warn" | "success";
};

const TZ_TODAY = () => {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utc - 3 * 3600_000).toISOString().slice(0, 10);
};

const NextActionCard = () => {
  const { user } = useAuth();

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

  if (isLoading || !data) return null;

  const today = TZ_TODAY();
  const action: Action = (() => {
    if (data.lastCheckIn !== today) {
      return {
        title: "Faça check-in diário",
        description: `Ganhe +5 moedas e mantenha seu streak${data.currentStreak > 0 ? ` de ${data.currentStreak}d` : ""}.`,
        cta: "Fazer check-in",
        href: "#streak",
        icon: <Flame className="h-5 w-5" />,
        tone: "warn",
      };
    }
    if (data.followsCount < 3) {
      return {
        title: "Descubra novos criadores",
        description: "Siga ao menos 3 criadores para personalizar seu feed.",
        cta: "Explorar",
        href: "/discover",
        icon: <Compass className="h-5 w-5" />,
        tone: "primary",
      };
    }
    if (data.subsCount === 0) {
      return {
        title: "Conheça os planos dos seus favoritos",
        description: "Cada criador define os próprios planos. Apoie quem você ama.",
        cta: "Ver criadores",
        href: "/discover",
        icon: <Users className="h-5 w-5" />,
        tone: "primary",
      };
    }
    if (data.balance < 50) {
      return {
        title: "Recarregue suas moedas",
        description: `Saldo atual: ${data.balance}. Recarregue para dar gorjetas, presentes e desbloquear conteúdos.`,
        cta: "Recarregar",
        href: "/wallet#packages",
        icon: <Coins className="h-5 w-5" />,
        tone: "warn",
      };
    }
    return {
      title: "Tudo em dia! ✨",
      description: "Continue acompanhando o feed e interagindo com seus criadores.",
      cta: "Ver feed",
      href: "/feed",
      icon: <Sparkles className="h-5 w-5" />,
      tone: "success",
    };
  })();

  const tones = {
    primary: "from-primary/15 to-primary/5 border-primary/30 text-primary",
    warn: "from-orange-500/15 to-orange-500/5 border-orange-500/30 text-orange-500",
    success: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-500",
  } as const;

  const Wrap = action.href.startsWith("#") ? "div" : Link;
  const wrapProps = action.href.startsWith("#") ? {} : { to: action.href };

  return (
    <Wrap
      {...(wrapProps as never)}
      className={`block rounded-2xl border bg-gradient-to-br ${tones[action.tone]} p-5 transition-transform hover:scale-[1.01] group`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-background/60 backdrop-blur ${tones[action.tone].split(" ").slice(-1)[0]}`}>
          {action.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Próxima ação</span>
          </div>
          <h3 className="font-display font-bold text-foreground text-base leading-snug">{action.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-sm font-semibold flex-shrink-0 pt-2 group-hover:translate-x-0.5 transition-transform">
          {action.cta}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Wrap>
  );
};

export default NextActionCard;
