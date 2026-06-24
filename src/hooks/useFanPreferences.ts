import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFanPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fanPreferences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("fan_preferences")
        .select("categories")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.categories ?? [];
    },
  });
}
