import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useCreatorProfile(creatorId: string | undefined, user?: User | null) {
  const profileQuery = useQuery({
    queryKey: ["creatorProfile", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", creatorId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const plansQuery = useQuery({
    queryKey: ["creatorPlans", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_plans")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("price", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const postsQuery = useQuery({
    queryKey: ["creatorPosts", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const subsCountQuery = useQuery({
    queryKey: ["creatorSubsCount", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId!)
        .eq("active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const recentSubsQuery = useQuery({
    queryKey: ["creatorRecentSubs", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId!)
        .eq("active", true)
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    profile: profileQuery.data,
    plans: plansQuery.data ?? [],
    posts: postsQuery.data ?? [],
    subscriberCount: subsCountQuery.data ?? 0,
    recentSubsCount: recentSubsQuery.data ?? 0,
    isLoading: profileQuery.isLoading,
  };
}
