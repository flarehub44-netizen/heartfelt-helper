import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("wallets")
        .select("balance, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return data ?? { balance: 0, updated_at: null };
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}
