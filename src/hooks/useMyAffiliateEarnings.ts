import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AffiliateEarning {
  id: string;
  creatorName: string;
  creatorAvatar: string | null;
  commissionAmount: number;
  commissionRate: number;
  status: "pending" | "paid";
  createdAt: string;
}

export interface AffiliateEarningsSummary {
  totalEarned: number;
  pendingPayout: number;
  conversions: number;
  earnings: AffiliateEarning[];
}

export function useMyAffiliateEarnings() {
  const { user } = useAuth();

  return useQuery<AffiliateEarningsSummary>({
    queryKey: ["myAffiliateEarnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all affiliate links for this user
      const { data: links, error: linksErr } = await supabase
        .from("affiliate_links" as any)
        .select("id, creator_id")
        .eq("affiliate_id", user!.id);
      if (linksErr) throw linksErr;
      if (!links?.length) return { totalEarned: 0, pendingPayout: 0, conversions: 0, earnings: [] };

      const linkIds = (links as any[]).map((l: any) => l.id);
      const creatorIds = [...new Set((links as any[]).map((l: any) => l.creator_id as string))];

      const [referralsResult, profilesResult] = await Promise.all([
        supabase
          .from("affiliate_referrals" as any)
          .select("id, affiliate_link_id, commission_amount, commission_rate, status, created_at")
          .in("affiliate_link_id", linkIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", creatorIds),
      ]);

      const referrals = (referralsResult.data ?? []) as any[];
      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      ((profilesResult.data ?? []) as any[]).forEach((p) => { profileMap[p.id] = p; });

      const linkCreatorMap: Record<string, string> = {};
      (links as any[]).forEach((l: any) => { linkCreatorMap[l.id] = l.creator_id; });

      const earnings: AffiliateEarning[] = referrals.map((r) => {
        const creatorId = linkCreatorMap[r.affiliate_link_id];
        const creator = profileMap[creatorId];
        return {
          id: r.id,
          creatorName: creator?.name ?? "Criador",
          creatorAvatar: creator?.avatar_url ?? null,
          commissionAmount: Number(r.commission_amount),
          commissionRate: Number(r.commission_rate),
          status: r.status as "pending" | "paid",
          createdAt: r.created_at,
        };
      });

      const totalEarned = earnings.reduce((s, e) => s + e.commissionAmount, 0);
      const pendingPayout = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + e.commissionAmount, 0);

      return { totalEarned, pendingPayout, conversions: earnings.length, earnings };
    },
  });
}
