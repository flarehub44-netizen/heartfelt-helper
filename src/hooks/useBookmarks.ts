import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BookmarkedPost {
  id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  min_plan: string;
  creator: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
  } | null;
}

export function useBookmarkedPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookmarkedPosts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BookmarkedPost[]> => {
      const { data, error } = await supabase
        .from("post_bookmarks")
        .select(`
          post_id,
          created_at,
          posts:post_id (
            id, text, media_url, media_type, created_at, min_plan,
            creator:creator_id ( id, name, handle, avatar_url )
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ((data ?? []) as any[])
        .map((r) => r.posts)
        .filter(Boolean) as BookmarkedPost[];
    },
  });
}

export function useBookmarks() {
  const { user } = useAuth();

  const { data: bookmarkedIds = new Set<string>() } = useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set<string>(((data ?? []) as any[]).map((r) => r.post_id));
    },
    select: (data) => data,
  });

  return { bookmarkedIds };
}

export function useToggleBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      if (!user) return;
      if (isBookmarked) {
        await supabase
          .from("post_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
      } else {
        await supabase
          .from("post_bookmarks")
          .insert({ user_id: user.id, post_id: postId });
      }
    },
    onMutate: async ({ postId, isBookmarked }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ["bookmarks", user?.id] });
      qc.setQueryData<Set<string>>(["bookmarks", user?.id], (prev = new Set()) => {
        const next = new Set(prev);
        isBookmarked ? next.delete(postId) : next.add(postId);
        return next;
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] }),
  });
}
