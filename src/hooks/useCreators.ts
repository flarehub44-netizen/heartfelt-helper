import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CreatorWithStats } from "@/types/profile";

type CreatorRow = {
  id: string;
  name: string;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  category: string | null;
  role: string;
  created_at: string;
  social_links: unknown;
  min_price: number;
  subscriber_count: number;
  post_count: number;
};

export function useCreators() {
  return useQuery({
    queryKey: ["creators"],
    queryFn: async (): Promise<CreatorWithStats[]> => {
      const { data, error } = await supabase.rpc("get_creator_list");
      if (error) throw error;
      return (data ?? []).map((row: CreatorRow) => ({
        id: row.id,
        name: row.name,
        handle: row.handle,
        bio: row.bio,
        avatar_url: row.avatar_url,
        cover_url: row.cover_url,
        category: row.category,
        role: row.role,
        created_at: row.created_at,
        social_links: row.social_links,
        price: Number(row.min_price),
        subscribers: Number(row.subscriber_count),
        postCount: Number(row.post_count),
        avatar: row.avatar_url || "",
        cover: row.cover_url || "",
        posts: Number(row.post_count),
        rating: 4.8,
        verified: true,
        tags: row.category ? [row.category] : [],
      }));
    },
  });
}
