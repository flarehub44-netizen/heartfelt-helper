import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMyAffiliateRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["affiliateRequest", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_requests")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as { id: string; user_id: string; status: string; created_at: string; reviewed_at: string | null } | null;
    },
  });
}

export function useCreateAffiliateRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_requests")
        .insert({ user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliateRequest"] }),
  });
}

// Admin hooks
export function useAdminAffiliateRequests() {
  return useQuery({
    queryKey: ["adminAffiliateRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const requests = data as any[];
      if (!requests.length) return [];

      // Get profiles for user names
      const userIds = requests.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p) => { profileMap[p.id] = p; });

      return requests.map((r: any) => ({
        ...r,
        userName: profileMap[r.user_id]?.name ?? "Desconhecido",
        userAvatar: profileMap[r.user_id]?.avatar_url ?? "",
      }));
    },
  });
}

export function useUpdateAffiliateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("affiliate_requests")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminAffiliateRequests"] });
      qc.invalidateQueries({ queryKey: ["affiliateRequest"] });
    },
  });
}
