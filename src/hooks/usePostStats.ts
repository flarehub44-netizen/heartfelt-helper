import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PostStat {
  post_id: string;
  text: string | null;
  media_type: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
}

export function usePostStats() {
  const { user } = useAuth();

  return useQuery<PostStat[]>({
    queryKey: ["postStats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creator_post_stats", {
        p_creator_id: user!.id,
      });
      if (error) throw error;
      return (data ?? []) as PostStat[];
    },
  });
}

export async function trackPostView(postId: string) {
  try {
    await supabase.rpc("track_post_view", { p_post_id: postId });
  } catch {
    // Fire-and-forget — never block the user
  }
}
