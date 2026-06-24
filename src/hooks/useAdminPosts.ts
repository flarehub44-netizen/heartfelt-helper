import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminPost {
  id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  min_plan: string;
  likes_count: number;
  created_at: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string | null;
  comment_count: number;
}

export function useAdminPosts() {
  return useQuery({
    queryKey: ["adminPosts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, text, media_url, media_type, min_plan, likes_count, created_at, creator_id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (!posts?.length) return [] as AdminPost[];

      const creatorIds = [...new Set(posts.map((p) => p.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, handle")
        .in("id", creatorIds);

      const { data: comments } = await supabase
        .from("post_comments")
        .select("post_id");

      const profileMap: Record<string, { name: string; handle: string | null }> = {};
      (profiles ?? []).forEach((p) => { profileMap[p.id] = { name: p.name, handle: p.handle }; });

      const commentMap: Record<string, number> = {};
      (comments ?? []).forEach((c) => { commentMap[c.post_id] = (commentMap[c.post_id] ?? 0) + 1; });

      return posts.map((p) => ({
        ...p,
        creator_name: profileMap[p.creator_id]?.name ?? "—",
        creator_handle: profileMap[p.creator_id]?.handle ?? null,
        comment_count: commentMap[p.id] ?? 0,
      })) as AdminPost[];
    },
  });
}

export function useAdminDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.rpc("admin_delete_post", { p_post_id: postId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPosts"] }),
  });
}
