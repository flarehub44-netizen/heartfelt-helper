import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformHealth {
  pix_last_hour: number;
  pix_last_24h: number;
  pix_throttled_users: number;
  pending_payments_24h: number;
  pending_creators: number;
  new_signups_24h: number;
  new_subs_24h: number;
  expiring_subs_7d: number;
  posts_24h: number;
}

export interface RateLimitLog {
  id: string;
  user_id: string;
  user_name: string | null;
  user_handle: string | null;
  created_at: string;
  hourly_count: number;
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platformHealth"],
    queryFn: async (): Promise<PlatformHealth> => {
      const { data, error } = await supabase.rpc("get_platform_health");
      if (error) throw error;
      return data as unknown as PlatformHealth;
    },
    refetchInterval: 30_000,
  });
}

export function useRateLimitLogs(limit = 100) {
  return useQuery({
    queryKey: ["rateLimitLogs", limit],
    queryFn: async (): Promise<RateLimitLog[]> => {
      const { data, error } = await supabase.rpc("get_rate_limit_logs", { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as RateLimitLog[];
    },
    refetchInterval: 30_000,
  });
}
