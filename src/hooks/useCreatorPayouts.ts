import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PayoutMethod = {
  creator_id: string;
  pix_key: string;
  pix_key_type: string | null;
  bank_name: string | null;
  account_type: string | null;
  agency: string | null;
  account_number: string | null;
  updated_at: string;
};

export type CreatorBalance = {
  creator_id: string;
  available_brl: number;
  pending_brl: number;
  lifetime_earned_brl: number;
  lifetime_paid_brl: number;
};

export type CreatorEarning = {
  id: string;
  source_type: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  description: string | null;
  created_at: string;
};

export type PayoutRow = {
  id: string;
  amount: number;
  net_amount: number;
  status: string;
  pix_key: string;
  created_at: string;
  paid_at: string | null;
  failure_reason: string | null;
};

export type WithdrawalEligibility = {
  available_brl: number;
  eligible_brl: number;
  pending_brl: number;
  daily_used_brl: number;
  daily_remaining_brl: number;
  min_withdrawal_brl: number;
  daily_limit_brl: number;
  hold_days: number;
  has_cpf: boolean;
  has_pix: boolean;
};

export function useCreatorPayouts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  const balance = useQuery({
    queryKey: ["creator-balance", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_balances" as never)
        .select("*")
        .eq("creator_id", uid!)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          creator_id: uid!,
          available_brl: 0,
          pending_brl: 0,
          lifetime_earned_brl: 0,
          lifetime_paid_brl: 0,
        } as CreatorBalance;
      }
      const row = data as Record<string, unknown>;
      return {
        creator_id: String(row.creator_id),
        available_brl: Number(row.available_brl ?? 0),
        pending_brl: Number(row.pending_brl ?? 0),
        lifetime_earned_brl: Number(row.lifetime_earned_brl ?? 0),
        lifetime_paid_brl: Number(row.lifetime_paid_brl ?? 0),
      } as CreatorBalance;
    },
  });

  const eligibility = useQuery({
    queryKey: ["withdrawal-eligibility", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_withdrawal_eligibility" as never);
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
      if (!row) {
        return {
          available_brl: 0,
          eligible_brl: 0,
          pending_brl: 0,
          daily_used_brl: 0,
          daily_remaining_brl: 5000,
          min_withdrawal_brl: 30,
          daily_limit_brl: 5000,
          hold_days: 7,
          has_cpf: false,
          has_pix: false,
        } as WithdrawalEligibility;
      }
      return {
        available_brl: Number(row.available_brl ?? 0),
        eligible_brl: Number(row.eligible_brl ?? 0),
        pending_brl: Number(row.pending_brl ?? 0),
        daily_used_brl: Number(row.daily_used_brl ?? 0),
        daily_remaining_brl: Number(row.daily_remaining_brl ?? 0),
        min_withdrawal_brl: Number(row.min_withdrawal_brl ?? 30),
        daily_limit_brl: Number(row.daily_limit_brl ?? 5000),
        hold_days: Number(row.hold_days ?? 7),
        has_cpf: Boolean(row.has_cpf),
        has_pix: Boolean(row.has_pix),
      } as WithdrawalEligibility;
    },
  });

  const method = useQuery({
    queryKey: ["creator-payout-method", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_payout_methods" as never)
        .select("*")
        .eq("creator_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return (data as PayoutMethod | null) ?? null;
    },
  });

  const earnings = useQuery({
    queryKey: ["creator-earnings", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_earnings" as never)
        .select("id, source_type, gross_amount, platform_fee, net_amount, description, created_at")
        .eq("creator_id", uid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as CreatorEarning[]).map((e) => ({
        ...e,
        gross_amount: Number(e.gross_amount),
        platform_fee: Number(e.platform_fee),
        net_amount: Number(e.net_amount),
      }));
    },
  });

  const payouts = useQuery({
    queryKey: ["creator-payouts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals" as never)
        .select("id, amount, net_amount, status, pix_key, created_at, paid_at, failure_reason")
        .eq("creator_id", uid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as PayoutRow[]).map((p) => ({
        ...p,
        amount: Number(p.amount),
        net_amount: Number(p.net_amount),
      }));
    },
  });

  const saveMethod = useMutation({
    mutationFn: async (payload: {
      pix_key: string;
      pix_key_type?: string;
      bank_name?: string;
      account_type?: string;
      agency?: string;
      account_number?: string;
    }) => {
      if (!uid) throw new Error("not authenticated");
      const { error } = await supabase.from("creator_payout_methods" as never).upsert({
        creator_id: uid,
        pix_key: payload.pix_key.trim(),
        pix_key_type: payload.pix_key_type || null,
        bank_name: payload.bank_name || null,
        account_type: payload.account_type || null,
        agency: payload.agency || null,
        account_number: payload.account_number || null,
        updated_at: new Date().toISOString(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-payout-method", uid] });
      qc.invalidateQueries({ queryKey: ["withdrawal-eligibility", uid] });
    },
  });

  const saveCpf = useMutation({
    mutationFn: async (cpfRaw: string) => {
      if (!uid) throw new Error("not authenticated");
      const cpf = cpfRaw.replace(/\D/g, "");
      if (cpf.length !== 11) throw new Error("CPF deve ter 11 dígitos");
      const { error } = await supabase
        .from("profiles")
        .update({ cpf } as never)
        .eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawal-eligibility", uid] });
    },
  });

  const requestPayout = useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.functions.invoke("request-withdrawal", {
        body: { amount },
      });
      const body = data as { error?: string; ok?: boolean } | null;
      if (body?.error) throw new Error(body.error);
      if (error) throw new Error(error.message || "Erro ao solicitar saque");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-balance", uid] });
      qc.invalidateQueries({ queryKey: ["creator-payouts", uid] });
      qc.invalidateQueries({ queryKey: ["withdrawal-eligibility", uid] });
    },
  });

  const convertibleCoins = useQuery({
    queryKey: ["convertible-coin-balance", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_convertible_coin_balance" as never);
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const convertCoins = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("convert_coin_earnings_to_brl" as never);
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["convertible-coin-balance", uid] });
      qc.invalidateQueries({ queryKey: ["creator-balance", uid] });
      qc.invalidateQueries({ queryKey: ["creator-earnings", uid] });
      qc.invalidateQueries({ queryKey: ["withdrawal-eligibility", uid] });
      qc.invalidateQueries({ queryKey: ["wallet", uid] });
    },
  });

  const bootstrap = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("bootstrap_creator_earnings" as never);
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-balance", uid] });
      qc.invalidateQueries({ queryKey: ["creator-earnings", uid] });
      qc.invalidateQueries({ queryKey: ["withdrawal-eligibility", uid] });
    },
  });

  return {
    balance,
    eligibility,
    method,
    earnings,
    payouts,
    convertibleCoins,
    convertCoins,
    saveMethod,
    saveCpf,
    requestPayout,
    bootstrap,
  };
}
