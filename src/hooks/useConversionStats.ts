import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStats {
  profile_views: number;
  checkout_initiated: number;
  pix_generated: number;
  subscription_activated: number;
}

export function useConversionStats() {
  return useQuery({
    queryKey: ["conversionStats"],
    queryFn: async (): Promise<FunnelStats> => {
      const events = ["profile_view", "checkout_initiated", "pix_generated", "subscription_activated"] as const;
      const counts: FunnelStats = {
        profile_views: 0,
        checkout_initiated: 0,
        pix_generated: 0,
        subscription_activated: 0,
      };

      for (const event of events) {
        const { count } = await supabase
          .from("conversion_events")
          .select("*", { count: "exact", head: true })
          .eq("event_name", event);
        const key = event === "profile_view" ? "profile_views"
          : event === "checkout_initiated" ? "checkout_initiated"
          : event === "pix_generated" ? "pix_generated"
          : "subscription_activated";
        counts[key] = count ?? 0;
      }

      return counts;
    },
  });
}
