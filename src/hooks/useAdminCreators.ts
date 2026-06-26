import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_PROJECT_ID, SUPABASE_PUBLISHABLE_KEY } from "@/lib/env";

export interface AdminCreator {
  creator_id: string;
  creator_name: string;
  creator_handle: string | null;
  creator_category: string | null;
  active_subs: number;
  estimated_revenue: number;
  post_count: number;
}

export interface PendingCreator {
  id: string;
  name: string;
  handle: string | null;
  category: string | null;
  created_at: string;
}

export function useAdminCreators() {
  return useQuery({
    queryKey: ["adminCreators"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_creator_stats");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        creator_id: r.creator_id,
        creator_name: r.creator_name,
        creator_handle: r.creator_handle,
        creator_category: r.creator_category,
        active_subs: Number(r.active_subs ?? 0),
        estimated_revenue: Number(r.estimated_revenue ?? 0),
        post_count: Number(r.post_count ?? 0),
      })) as AdminCreator[];
    },
  });
}

export function useAdminPendingCreators() {
  return useQuery({
    queryKey: ["adminPendingCreators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, handle, category, created_at")
        .eq("role", "creator")
        .eq("approved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PendingCreator[];
    },
  });
}

async function sendCreatorApprovedEmail(creatorId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", creatorId)
    .maybeSingle();

  await fetch(`https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      user_id: creatorId,
      subject: "Sua conta criador foi aprovada na Flare",
      body: `Olá${profile?.name ? ` ${profile.name}` : ""}! Seu perfil de criador foi aprovado. Acesse o dashboard para começar.`,
      template: "creator_approved",
    }),
  }).catch(() => {});
}

export function useApproveCreator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: true })
        .eq("id", creatorId);
      if (error) throw error;
      await sendCreatorApprovedEmail(creatorId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPendingCreators"] });
      qc.invalidateQueries({ queryKey: ["adminCreators"] });
    },
  });
}
