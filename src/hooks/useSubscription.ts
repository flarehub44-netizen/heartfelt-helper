import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { planMeetsMin } from "@/lib/plans";

function isActiveSubscription(sub: {
  active: boolean;
  expires_at?: string | null;
}): boolean {
  if (!sub.active) return false;
  if (!sub.expires_at) return true;
  return new Date(sub.expires_at) > new Date();
}

export function useSubscription(creatorId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", user?.id, creatorId],
    enabled: !!user && !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("fan_id", user!.id)
        .eq("creator_id", creatorId!)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data || !isActiveSubscription(data)) return null;
      return data;
    },
  });

  const subscription = subscriptionQuery.data;
  const isSubscribed = !!subscription;

  const hasAccessTo = (minPlan: string) =>
    planMeetsMin(subscription?.plan, minPlan);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription", user?.id, creatorId] });
    queryClient.invalidateQueries({ queryKey: ["mySubscriptions", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["creatorSubsCount", creatorId] });
  };

  return {
    subscription,
    isSubscribed,
    hasAccessTo,
    isLoading: subscriptionQuery.isLoading,
    invalidate,
  };
}
