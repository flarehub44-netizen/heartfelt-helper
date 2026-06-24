import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreatorLive {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  stream_url: string | null;
  thumbnail_url: string | null;
  scheduled_at: string | null;
  status: "scheduled" | "live" | "ended";
  min_plan: string;
  created_at: string;
}

export interface NewLive {
  title: string;
  description?: string;
  stream_url?: string;
  scheduled_at?: string;
  status?: "scheduled" | "live" | "ended";
  min_plan?: string;
}

export function useCreatorLives(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["creatorLives", creatorId],
    enabled: !!creatorId,
    queryFn: async (): Promise<CreatorLive[]> => {
      const { data, error } = await supabase
        .from("creator_lives")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CreatorLive[];
    },
  });
}

export function useManageLives(creatorId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["creatorLives", creatorId] });

  const create = useMutation({
    mutationFn: async (live: NewLive) => {
      const { error } = await supabase
        .from("creator_lives")
        .insert({ ...live, creator_id: creatorId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreatorLive> & { id: string }) => {
      const { error } = await supabase
        .from("creator_lives")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("creator_lives")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function getEmbedUrl(streamUrl: string): string | null {
  try {
    const url = new URL(streamUrl);

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID or youtube.com/live/ID
    if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") {
      let videoId: string | null = null;
      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1);
      } else if (url.pathname.startsWith("/live/")) {
        videoId = url.pathname.split("/live/")[1]?.split("?")[0] ?? null;
      } else {
        videoId = url.searchParams.get("v");
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    // Twitch: twitch.tv/CHANNEL
    if (url.hostname.includes("twitch.tv")) {
      const channel = url.pathname.slice(1).split("/")[0];
      if (channel) {
        return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true`;
      }
    }
  } catch {
    // invalid URL
  }
  return null;
}
