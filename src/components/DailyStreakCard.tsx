import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Coins, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const TZ_TODAY = () => {
  // Approximate São Paulo date (UTC-3) on client for UI gating; server is source of truth.
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utc - 3 * 3600_000).toISOString().slice(0, 10);
};

const DailyStreakCard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: streak } = useQuery({
    queryKey: ["fanStreak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("fan_streaks")
        .select("current_streak, longest_streak, last_check_in")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const todayStr = TZ_TODAY();
  const alreadyToday = streak?.last_check_in === todayStr;
  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const nextMilestone = Math.ceil(((alreadyToday ? current : current + 1) || 1) / 7) * 7;

  const checkIn = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("daily_check_in");
      if (error) throw error;
      return data as { already_checked_in: boolean; current_streak: number; bonus: number };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["fanStreak", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      if (res.already_checked_in) {
        toast({ title: "Você já fez check-in hoje", description: `Streak atual: ${res.current_streak} dias` });
      } else {
        toast({
          title: `+${res.bonus} moedas! 🔥`,
          description: `Streak de ${res.current_streak} dia${res.current_streak > 1 ? "s" : ""}`,
        });
      }
    },
    onError: () => toast({ title: "Erro no check-in", variant: "destructive" }),
  });

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Streak diário
        </h2>
        <span className="text-xs text-muted-foreground">Recorde: {longest}d</span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <span className="font-display text-4xl font-extrabold text-foreground leading-none">{current}</span>
        <span className="text-sm text-muted-foreground pb-1">dia{current === 1 ? "" : "s"} seguidos</span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Próximo bônus em {Math.max(0, nextMilestone - (alreadyToday ? current : current + 1) + 1)} check-ins</span>
          <span>{nextMilestone}d</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-primary transition-all"
            style={{ width: `${Math.min(100, ((current % 7) / 7) * 100)}%` }}
          />
        </div>
      </div>

      <Button
        onClick={() => checkIn.mutate()}
        disabled={alreadyToday || checkIn.isPending}
        className="w-full"
        size="sm"
      >
        {alreadyToday ? (
          <><Check className="h-4 w-4 mr-1.5" /> Check-in feito hoje</>
        ) : (
          <><Coins className="h-4 w-4 mr-1.5" /> Check-in (+5 moedas)</>
        )}
      </Button>
    </div>
  );
};

export default DailyStreakCard;
