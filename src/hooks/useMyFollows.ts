import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Returns a Set of creator ids the current user follows. */
export function useMyFollows() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["myFollows", user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from("follows")
        .select("creator_id")
        .eq("fan_id", user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.creator_id as string));
    },
    enabled: !!user,
  });

  return data ?? new Set<string>();
}
