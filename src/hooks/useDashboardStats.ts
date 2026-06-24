import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboardStats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const userId = user!.id;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [subsResult, plansResult, postCountResult, churnedResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, plan, fan_id, created_at")
          .eq("creator_id", userId)
          .eq("active", true),
        supabase
          .from("creator_plans")
          .select("plan_name, price")
          .eq("creator_id", userId),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("creator_id", userId),
        supabase
          .from("subscriptions")
          .select("id, plan")
          .eq("creator_id", userId)
          .eq("active", false)
          .gte("expires_at", thirtyDaysAgo),
      ]);

      const subs = subsResult.data ?? [];
      const plans = plansResult.data ?? [];
      const churned = (churnedResult.data ?? []) as { id: string; plan: string }[];
      const churnedCount = churned.length;

      const planPriceMap = new Map<string, number>();
      plans.forEach((p) => planPriceMap.set(p.plan_name, p.price));

      const grossRevenue = subs.reduce((sum, s) => sum + (planPriceMap.get(s.plan) ?? 0), 0);
      const revenue = grossRevenue * (1 - PLATFORM_FEE_RATE);

      // Plan breakdown: count per plan key
      const planBreakdown: Record<string, number> = {};
      subs.forEach((s) => {
        planBreakdown[s.plan] = (planBreakdown[s.plan] || 0) + 1;
      });

      // Churn: expired this month / (active + expired this month)
      const totalForChurn = subs.length + churnedCount;
      const churnRate = totalForChurn > 0 ? (churnedCount / totalForChurn) * 100 : 0;

      // Churn breakdown by plan
      const churnByPlan: Record<string, { churned: number; active: number; rate: number }> = {};
      ["fan", "superfan", "vip"].forEach((plan) => {
        const activePlan = subs.filter((s) => s.plan === plan).length;
        const churnedPlan = churned.filter((s) => s.plan === plan).length;
        const total = activePlan + churnedPlan;
        churnByPlan[plan] = {
          churned: churnedPlan,
          active: activePlan,
          rate: total > 0 ? (churnedPlan / total) * 100 : 0,
        };
      });

      // Recent subscribers with profile info
      const recentSubIds = [...subs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      let recentSubscribers: { name: string; avatar: string; plan: string; since: string }[] = [];
      if (recentSubIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", recentSubIds.map((s) => s.fan_id));

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

        recentSubscribers = recentSubIds.map((s) => {
          const profile = profileMap.get(s.fan_id);
          const diff = Date.now() - new Date(s.created_at).getTime();
          const hours = Math.floor(diff / 3600000);
          const since = hours < 24 ? `há ${hours}h` : `há ${Math.floor(hours / 24)}d`;
          return {
            name: profile?.name ?? "Usuário",
            avatar: profile?.avatar_url ?? "",
            plan: s.plan,
            since,
          };
        });
      }

      return {
        revenue,
        mrr: grossRevenue,
        subscriberCount: subs.length,
        postCount: postCountResult.count ?? 0,
        churnRate,
        planBreakdown,
        churnByPlan,
        recentSubscribers,
      };
    },
  });
}
