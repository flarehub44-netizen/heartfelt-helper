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
      const { data: lives, error } = await supabase
        .from("creator_lives_public")
        .select("id, creator_id, title, thumbnail_url, min_plan, created_at")
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      const rows = lives ?? [];
      if (rows.length === 0) return [];

      const creatorIds = [...new Set(rows.map((r) => r.creator_id).filter(Boolean) as string[])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, handle, avatar_url")
        .in("id", creatorIds);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return rows.map((r) => ({
        id: r.id as string,
        creator_id: r.creator_id as string,
        title: (r.title as string) ?? "Ao vivo",
        thumbnail_url: r.thumbnail_url,
        min_plan: (r.min_plan as string) ?? "free",
        creator: byId.get(r.creator_id as string) ?? null,
      }));
    },
  });
}
