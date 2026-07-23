import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PendingCheckout = {
  id: string;
  creator_id: string;
  plan_name: string;
  amount: number;
  created_at: string;
  creator_name: string | null;
  creator_handle: string | null;
};

const WINDOW_MS = 48 * 60 * 60 * 1000;

export function usePendingCheckouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-checkouts", user?.id],
    queryFn: async (): Promise<PendingCheckout[]> => {
      if (!user) return [];
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from("pending_checkouts")
        .select("id, creator_id, plan_name, amount, created_at")
        .eq("fan_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];

      const creatorIds = [...new Set(rows.map((r) => r.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, handle")
        .in("id", creatorIds);
      const byId = new Map(
        (profiles ?? []).map((p) => [p.id, { name: p.name, handle: p.handle }])
      );

      return rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        creator_name: byId.get(r.creator_id)?.name ?? null,
        creator_handle: byId.get(r.creator_id)?.handle ?? null,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useResolvePendingCheckout() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user) return;
      // Prefer RPC if available; fall back to delete (requires RLS)
      const { error: rpcError } = await supabase.rpc("resolve_pending_checkout", {
        p_creator_id: creatorId,
      });
      if (rpcError) {
        const { error } = await supabase
          .from("pending_checkouts")
          .delete()
          .eq("fan_id", user.id)
          .eq("creator_id", creatorId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pending-checkouts", user?.id] });
    },
  });
}
