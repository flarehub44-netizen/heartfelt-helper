import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

export function useMonthlyRevenue(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["monthlyRevenue", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creator_monthly_revenue", {
        p_creator_id: creatorId!,
      });
      if (error) throw error;
      return ((data as { month: string; value: number }[]) ?? []).map((d) => ({
        ...d,
        value: d.value * (1 - PLATFORM_FEE_RATE),
      }));
    },
  });
}
