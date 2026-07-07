import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveNowItem {
  id: string;
  creator_id: string;
  title: string;
  thumbnail_url: string | null;
  min_plan: string;
  creator: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
  } | null;
}

export function useLiveNow() {
  return useQuery({
    queryKey: ["liveNow"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<LiveNowItem[]> => {
      const { data, error } = await supabase
        .from("creator_lives_public")
        .select(
          "id, creator_id, title, thumbnail_url, min_plan, creator:profiles!creator_lives_creator_id_fkey(id, name, handle, avatar_url)"
        )
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as unknown as LiveNowItem[];
    },
  });
}
