import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { planMeetsMin } from "@/lib/plans";

export interface MySubscription {
  creator_id: string;
  plan: string;
  expires_at: string | null;
}

function isActiveSubscription(sub: { active: boolean; expires_at?: string | null }): boolean {
  if (!sub.active) return false;
  if (!sub.expires_at) return true;
  return new Date(sub.expires_at) > new Date();
}

/**
 * Returns a Map of creator_id -> plan for active subscriptions.
 */
export function useMySubscriptionMap(): Map<string, string> {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["mySubscriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("creator_id, plan, active, expires_at")
        .eq("fan_id", user!.id)
        .eq("active", true);

      if (error) throw error;
      return (data ?? []).filter(isActiveSubscription);
    },
  });

  return new Map((data ?? []).map((row) => [row.creator_id, row.plan]));
}

/** @deprecated Use useMySubscriptionMap — kept for compatibility */
export function useMySubscriptions(): Set<string> {
  const map = useMySubscriptionMap();
  return new Set(map.keys());
}

export function useHasAccessToCreator(creatorId: string, minPlan = "free"): boolean {
  const map = useMySubscriptionMap();
  const plan = map.get(creatorId);
  return planMeetsMin(plan, minPlan);
}

export function useMySubscriptionsDetail() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mySubscriptionsDetail", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("id, creator_id, plan, active, created_at, expires_at, syncpay_id")
        .eq("fan_id", user!.id)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const activeSubs = (subs ?? []).filter(isActiveSubscription);
      if (!activeSubs.length) return [];

      const creatorIds = activeSubs.map((s) => s.creator_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, handle, avatar_url")
        .in("id", creatorIds);

      const { data: plans } = await supabase
        .from("creator_plans")
        .select("creator_id, plan_name, price")
        .in("creator_id", creatorIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return activeSubs.map((sub) => {
        const creator = profileMap.get(sub.creator_id);
        const planRow = plans?.find(
          (p) => p.creator_id === sub.creator_id && p.plan_name === sub.plan
        );
        return {
          ...sub,
          creator_name: creator?.name ?? "Criador",
          creator_handle: creator?.handle,
          creator_avatar: creator?.avatar_url,
          price: planRow ? Number(planRow.price) : 0,
        };
      });
    },
  });
}

export function useExpiringSubscriptions(withinDays = 7) {
  const { data: subs = [], ...rest } = useMySubscriptionsDetail();

  const expiring = subs.filter((sub) => {
    if (!sub.expires_at) return false;
    const expires = new Date(sub.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= withinDays;
  });

  return { data: expiring, ...rest };
}
