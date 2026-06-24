import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  total_creators: number;
  total_fans: number;
  total_active_subs: number;
  total_posts: number;
  estimated_revenue: number;
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["platformStats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      const row = (data as any[])?.[0];
      return {
        total_creators: Number(row?.total_creators ?? 0),
        total_fans: Number(row?.total_fans ?? 0),
        total_active_subs: Number(row?.total_active_subs ?? 0),
        total_posts: Number(row?.total_posts ?? 0),
        estimated_revenue: Number(row?.estimated_revenue ?? 0),
      } as PlatformStats;
    },
  });
}
