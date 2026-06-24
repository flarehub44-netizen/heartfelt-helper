import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { getLoginPath } from "@/lib/authRedirect";

export function useFollow(creatorId: string | undefined) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const loginPath = getLoginPath(location.pathname + location.search);

  // Check if the current user already follows this creator
  const { data: followData } = useQuery({
    queryKey: ["follow", user?.id, creatorId],
    queryFn: async () => {
      if (!user || !creatorId) return null;
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("fan_id", user.id)
        .eq("creator_id", creatorId)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!creatorId,
  });

  // Get followers count for this creator
  const { data: followersCount = 0 } = useQuery({
    queryKey: ["followersCount", creatorId],
    queryFn: async () => {
      if (!creatorId) return 0;
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId);
      return count ?? 0;
    },
    enabled: !!creatorId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["follow", user?.id, creatorId] });
    queryClient.invalidateQueries({ queryKey: ["followersCount", creatorId] });
  };

  const follow = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error("Faça login para seguir");
        navigate(loginPath);
        throw new Error("Not authenticated");
      }
      const { error } = await supabase
        .from("follows")
        .insert({ fan_id: user.id, creator_id: creatorId! });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Seguindo!");
      invalidate();
    },
    onError: () => {
      toast.error("Erro ao seguir. Tente novamente.");
    },
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("fan_id", user.id)
        .eq("creator_id", creatorId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deixou de seguir");
      invalidate();
    },
    onError: () => {
      toast.error("Erro ao deixar de seguir.");
    },
  });

  const isFollowing = !!followData;

  const toggle = () => {
    if (!user) {
      toast.error("Faça login para seguir");
      navigate(loginPath);
      return;
    }
    if (isFollowing) {
      unfollow.mutate();
    } else {
      follow.mutate();
    }
  };

  return {
    isFollowing,
    followersCount,
    follow: follow.mutate,
    unfollow: unfollow.mutate,
    toggle,
    isPending: follow.isPending || unfollow.isPending,
  };
}
