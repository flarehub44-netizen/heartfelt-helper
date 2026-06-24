import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AFFILIATE_FEE_KEY } from "@/lib/constants";

export function useAffiliateFeeRate() {
  return useQuery({
    queryKey: ["affiliateFeeRate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .select("value")
        .eq("key", AFFILIATE_FEE_KEY)
        .single();
      if (error) throw error;
      return parseFloat((data as any).value);
    },
  });
}

export function useUpdateAffiliateFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: number) => {
      const { error } = await supabase
        .from("platform_settings" as any)
        .update({ value: rate.toString(), updated_at: new Date().toISOString() })
        .eq("key", AFFILIATE_FEE_KEY);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliateFeeRate"] }),
  });
}

export function useAffiliateOverview() {
  return useQuery({
    queryKey: ["affiliateOverview"],
    queryFn: async () => {
      // Get all affiliate links with profiles
      const { data: links, error: linksErr } = await supabase
        .from("affiliate_links" as any)
        .select("id, affiliate_id, creator_id, code, created_at");
      if (linksErr) throw linksErr;

      if (!links?.length) return { affiliates: [], recentReferrals: [] };

      const linkIds = (links as any[]).map((l: any) => l.id);
      const affiliateIds = [...new Set((links as any[]).map((l: any) => l.affiliate_id))];

      // Get referrals
      const { data: referrals } = await supabase
        .from("affiliate_referrals" as any)
        .select("id, affiliate_link_id, commission_rate, commission_amount, status, created_at, subscription_id")
        .in("affiliate_link_id", linkIds)
        .order("created_at", { ascending: false });

      // Get affiliate profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", affiliateIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p) => { profileMap[p.id] = p; });

      // Build affiliate summary
      const affMap: Record<string, { name: string; avatar: string; linkCount: number; conversions: number; totalCommission: number }> = {};
      (links as any[]).forEach((l: any) => {
        if (!affMap[l.affiliate_id]) {
          const p = profileMap[l.affiliate_id];
          affMap[l.affiliate_id] = {
            name: p?.name ?? "Desconhecido",
            avatar: p?.avatar_url ?? "",
            linkCount: 0,
            conversions: 0,
            totalCommission: 0,
          };
        }
        affMap[l.affiliate_id].linkCount++;
      });

      (referrals as any[] ?? []).forEach((r: any) => {
        const link = (links as any[]).find((l: any) => l.id === r.affiliate_link_id);
        if (link && affMap[link.affiliate_id]) {
          affMap[link.affiliate_id].conversions++;
          affMap[link.affiliate_id].totalCommission += Number(r.commission_amount);
        }
      });

      const affiliates = Object.entries(affMap).map(([id, data]) => ({ id, ...data }));

      // Recent referrals (last 20)
      const recentReferrals = (referrals as any[] ?? []).slice(0, 20).map((r: any) => {
        const link = (links as any[]).find((l: any) => l.id === r.affiliate_link_id);
        const affiliate = link ? profileMap[link.affiliate_id] : null;
        return {
          id: r.id,
          affiliateName: affiliate?.name ?? "—",
          commissionRate: r.commission_rate,
          commissionAmount: r.commission_amount,
          status: r.status,
          createdAt: r.created_at,
        };
      });

      return { affiliates, recentReferrals };
    },
  });
}
