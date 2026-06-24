import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function generateCode() {
  return Math.random().toString(36).substring(2, 10);
}

export function useAffiliateLinks(creatorId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["affiliateLinks", user?.id, creatorId],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("affiliate_links")
        .select("*")
        .eq("affiliate_id", user!.id)
        .order("created_at", { ascending: false });
      if (creatorId) q = q.eq("creator_id", creatorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createLink = useMutation({
    mutationFn: async (cId: string) => {
      const code = generateCode();
      const { data, error } = await supabase
        .from("affiliate_links")
        .insert({ affiliate_id: user!.id, creator_id: cId, code })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliateLinks"] }),
  });

  return { links, isLoading, createLink };
}
