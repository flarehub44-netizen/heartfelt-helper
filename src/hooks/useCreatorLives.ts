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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as CreatorLive[]).sort((a, b) => {
        const statusRank = { live: 0, scheduled: 1, ended: 2 } as const;
        const byStatus = statusRank[a.status] - statusRank[b.status];
        if (byStatus !== 0) return byStatus;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
  });
}

export function useManageLives(creatorId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["creatorLives", creatorId] });

  const create = useMutation({
    mutationFn: async (live: NewLive) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Faça login novamente para iniciar a live.");
      }

      if (!creatorId || creatorId !== authData.user.id) {
        throw new Error("Você só pode iniciar live no seu próprio perfil.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", creatorId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        const meta = authData.user.user_metadata ?? {};
        const { error: createProfileError } = await supabase.from("profiles").insert({
          id: creatorId,
          name: meta.name || authData.user.email?.split("@")[0] || "Criador",
          role: "creator",
          handle: meta.handle || null,
          category: meta.category || null,
          approved: true,
        });
        if (createProfileError) throw createProfileError;
      } else if (profile.role !== "creator") {
        throw new Error("Sua conta precisa estar como criador para iniciar lives.");
      }

      const { data, error } = await supabase
        .from("creator_lives")
        .insert({ ...live, creator_id: creatorId })
        .select("*")
        .single();
      if (error) throw error;
      return data as CreatorLive;
    },
    onSuccess: (createdLive) => {
      queryClient.setQueryData<CreatorLive[]>(["creatorLives", creatorId], (current = []) => {
        const withoutDuplicate = current.filter((live) => live.id !== createdLive.id);
        return [createdLive, ...withoutDuplicate].sort((a, b) => {
          const statusRank = { live: 0, scheduled: 1, ended: 2 } as const;
          const byStatus = statusRank[a.status] - statusRank[b.status];
          if (byStatus !== 0) return byStatus;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreatorLive> & { id: string }) => {
      const { data: updatedLive, error } = await supabase
        .from("creator_lives")
        .update(data)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return updatedLive as CreatorLive;
    },
    onSuccess: (updatedLive) => {
      queryClient.setQueryData<CreatorLive[]>(["creatorLives", creatorId], (current = []) =>
        current.map((live) => (live.id === updatedLive.id ? updatedLive : live)).sort((a, b) => {
          const statusRank = { live: 0, scheduled: 1, ended: 2 } as const;
          const byStatus = statusRank[a.status] - statusRank[b.status];
          if (byStatus !== 0) return byStatus;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }),
      );
      invalidate();
    },
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
