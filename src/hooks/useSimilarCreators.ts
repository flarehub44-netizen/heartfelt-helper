import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SimilarCreator {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function useSimilarCreators(
  creatorId: string | undefined,
  category: string | null | undefined
) {
  return useQuery({
    queryKey: ["similarCreators", creatorId, category],
    enabled: !!creatorId,
    queryFn: async (): Promise<SimilarCreator[]> => {
      let q = supabase
        .from("profiles")
        .select("id, name, handle, avatar_url, bio")
        .eq("role", "creator")
        .eq("approved", true)
        .neq("id", creatorId!)
        .limit(6);

      if (category) q = (q as any).eq("category", category);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SimilarCreator[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
