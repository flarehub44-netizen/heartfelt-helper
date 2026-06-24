import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PostWithCreator } from "@/types/profile";

const PAGE_SIZE = 20;

type FeedRow = {
  id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  min_plan: string;
  created_at: string;
  creator_id: string;
  creator: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
    category?: string | null;
  };
};

function mapRow(row: FeedRow): PostWithCreator {
  return {
    id: row.id,
    text: row.text,
    media_url: row.media_url,
    media_type: row.media_type,
    likes_count: row.likes_count,
    min_plan: row.min_plan,
    created_at: row.created_at,
    creator_id: row.creator_id,
    creator: {
      ...row.creator,
      category: row.creator.category ?? null,
    },
  };
}

export function usePosts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useInfiniteQuery({
    queryKey: ["feedPosts"],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<PostWithCreator[]> => {
      const { data, error } = await supabase.rpc("get_feed_posts", {
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });
      if (error) throw error;
      return (data ?? []).map((row: FeedRow) => mapRow(row));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((acc, page) => acc + page.length, 0);
    },
  });

  const likePost = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
    },
  });

  return {
    posts: postsQuery.data?.pages.flat() ?? [],
    isLoading: postsQuery.isLoading,
    isFetchingNextPage: postsQuery.isFetchingNextPage,
    hasNextPage: postsQuery.hasNextPage ?? false,
    fetchNextPage: postsQuery.fetchNextPage,
    likePost,
  };
}
