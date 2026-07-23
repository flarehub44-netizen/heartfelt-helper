import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RenewalFan = {
  fan_id: string;
  fan_name: string | null;
  fan_avatar: string | null;
  plan: string;
  expires_at: string;
  active: boolean;
  bucket: "expiring_7d" | "expired_30d" | string;
};

export function useCreatorRenewalPipeline() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["creator-renewal-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creator_renewal_pipeline" as never);
      if (error) throw error;
      return (data ?? []) as RenewalFan[];
    },
  });

  const notify = useMutation({
    mutationFn: async ({ fanId, message }: { fanId: string; message?: string }) => {
      const { error } = await supabase.rpc("notify_fan_renewal" as never, {
        p_fan_id: fanId,
        p_message: message ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creator-renewal-pipeline"] }),
  });

  const notifyAll = useMutation({
    mutationFn: async ({
      fans,
      message,
    }: {
      fans: RenewalFan[];
      message?: string;
    }) => {
      const uniqueIds = [...new Set(fans.map((f) => f.fan_id))];
      let ok = 0;
      let failed = 0;
      for (const fanId of uniqueIds) {
        const { error } = await supabase.rpc("notify_fan_renewal" as never, {
          p_fan_id: fanId,
          p_message: message ?? null,
        } as never);
        if (error) failed += 1;
        else ok += 1;
      }
      return { ok, failed };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creator-renewal-pipeline"] }),
  });

  return { ...query, notify, notifyAll };
}

export function useCreatorConversionStats() {
  return useQuery({
    queryKey: ["creator-conversion-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creator_conversion_stats" as never);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return { profile_views: 0, subscribe_clicks: 0, activations: 0, conversion_rate: 0 };
      }
      const r = row as Record<string, unknown>;
      return {
        profile_views: Number(r.profile_views ?? 0),
        subscribe_clicks: Number(r.subscribe_clicks ?? 0),
        activations: Number(r.activations ?? 0),
        conversion_rate: Number(r.conversion_rate ?? 0),
      };
    },
  });
}
