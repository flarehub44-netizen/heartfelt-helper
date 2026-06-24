import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  author: {
    name: string;
    handle: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

export function useComments(postId: string) {
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ["comments", postId],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from("post_comments" as any)
        .select("*, author:profiles!post_comments_author_id_fkey(name, handle, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const flat = (data ?? []) as unknown as Comment[];
      // Nest replies under parent comments
      const roots: Comment[] = [];
      const byId = new Map<string, Comment>();
      flat.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
      byId.forEach((c) => {
        if (c.parent_id && byId.has(c.parent_id)) {
          byId.get(c.parent_id)!.replies!.push(c);
        } else {
          roots.push(c);
        }
      });
      return roots;
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async ({ text, authorId, parentId }: { text: string; authorId: string; parentId?: string }) => {
      const { error } = await supabase
        .from("post_comments" as any)
        .insert({ post_id: postId, author_id: authorId, text, parent_id: parentId ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    addComment,
  };
}
