import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CreatorWithStats } from "@/types/profile";

export function useFeaturedCreators() {
  return useQuery({
    queryKey: ["featured-creators"],
    queryFn: async (): Promise<CreatorWithStats[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "creator");

      if (error) throw error;
      if (!profiles?.length) return [];

      const creatorIds = profiles.map((p) => p.id);

      // Get lowest price per creator
      const { data: plans } = await supabase
        .from("creator_plans")
        .select("creator_id, price")
        .in("creator_id", creatorIds);

      const priceMap = new Map<string, number>();
      plans?.forEach((p) => {
        const current = priceMap.get(p.creator_id);
        if (current === undefined || p.price < current) {
          priceMap.set(p.creator_id, p.price);
        }
      });

      // Get subscriber counts
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("creator_id")
        .in("creator_id", creatorIds)
        .eq("active", true);

      const subsMap = new Map<string, number>();
      subs?.forEach((s) => {
        subsMap.set(s.creator_id, (subsMap.get(s.creator_id) || 0) + 1);
      });

      return profiles
        .map((p) => ({
          ...p,
          price: priceMap.get(p.id) ?? 0,
          subscribers: subsMap.get(p.id) ?? 0,
          postCount: 0,
          avatar: p.avatar_url || "",
          cover: p.cover_url || "",
          posts: 0,
          rating: 4.8,
          verified: true,
          tags: p.category ? [p.category] : [],
        }))
        .sort((a, b) => b.subscribers - a.subscribers)
        .slice(0, 4);
    },
  });
}
