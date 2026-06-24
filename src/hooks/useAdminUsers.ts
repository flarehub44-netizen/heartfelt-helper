import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  sub_count: number;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, handle, avatar_url, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("fan_id")
        .eq("active", true);

      const subMap: Record<string, number> = {};
      (subs ?? []).forEach((s) => {
        subMap[s.fan_id] = (subMap[s.fan_id] ?? 0) + 1;
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        sub_count: subMap[p.id] ?? 0,
      })) as AdminUser[];
    },
  });
}
