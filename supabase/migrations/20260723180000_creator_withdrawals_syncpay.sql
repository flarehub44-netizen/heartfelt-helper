-- Creator withdrawals via SyncPay cash-out.
-- Constants: MIN_WITHDRAWAL_BRL = 30, DAILY_LIMIT_BRL = 5000, HOLD_DAYS = 7.

-- ---------------------------------------------------------------------------
-- 1) Rename payouts → withdrawals + column renames
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payouts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'withdrawals'
  ) THEN
    ALTER TABLE public.payouts RENAME TO withdrawals;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'requested_at'
  ) THEN
    ALTER TABLE public.withdrawals RENAME COLUMN requested_at TO created_at;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.withdrawals RENAME COLUMN processed_at TO paid_at;
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_payouts_creator RENAME TO idx_withdrawals_creator;

DROP POLICY IF EXISTS "Creators view own payouts" ON public.withdrawals;
CREATE POLICY "Creators view own withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = creator_id);

GRANT SELECT ON public.withdrawals TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) KYC: CPF on profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL AND length(trim(cpf)) > 0;

-- ---------------------------------------------------------------------------
-- 3) Eligibility helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_withdrawal_eligibility(p_creator_id uuid DEFAULT NULL)
RETURNS TABLE (
  available_brl numeric,
  eligible_brl numeric,
  pending_brl numeric,
  daily_used_brl numeric,
  daily_remaining_brl numeric,
  min_withdrawal_brl numeric,
  daily_limit_brl numeric,
  hold_days integer,
  has_cpf boolean,
  has_pix boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_creator_id, auth.uid());
  v_available numeric := 0;
  v_pending numeric := 0;
  v_paid numeric := 0;
  v_old_earnings numeric := 0;
  v_eligible numeric := 0;
  v_daily_used numeric := 0;
  v_cpf text;
  v_pix text;
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Allow: self, service_role, admin, or privileged DB role (nested RPC / console)
  IF p_creator_id IS NOT NULL
     AND p_creator_id IS DISTINCT FROM auth.uid()
     AND v_jwt_role IS DISTINCT FROM 'service_role'
     AND NOT (
       auth.uid() IS NOT NULL
       AND public.has_role(auth.uid(), 'admin'::app_role)
     )
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COALESCE(b.available_brl, 0),
    COALESCE(b.pending_brl, 0),
    COALESCE(b.lifetime_paid_brl, 0)
  INTO v_available, v_pending, v_paid
  FROM public.creator_balances b
  WHERE b.creator_id = v_uid;

  SELECT COALESCE(SUM(e.net_amount), 0) INTO v_old_earnings
  FROM public.creator_earnings e
  WHERE e.creator_id = v_uid
    AND e.created_at <= (now() - interval '7 days');

  v_eligible := GREATEST(0, LEAST(v_available, v_old_earnings - v_paid - v_pending));

  SELECT COALESCE(SUM(w.amount), 0) INTO v_daily_used
  FROM public.withdrawals w
  WHERE w.creator_id = v_uid
    AND w.status IN ('pending', 'processing', 'paid')
    AND w.created_at >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
        AT TIME ZONE 'America/Sao_Paulo';

  SELECT p.cpf INTO v_cpf FROM public.profiles p WHERE p.id = v_uid;
  SELECT m.pix_key INTO v_pix FROM public.creator_payout_methods m WHERE m.creator_id = v_uid;

  available_brl := v_available;
  eligible_brl := v_eligible;
  pending_brl := v_pending;
  daily_used_brl := v_daily_used;
  daily_remaining_brl := GREATEST(0, 5000 - v_daily_used);
  min_withdrawal_brl := 30;
  daily_limit_brl := 5000;
  hold_days := 7;
  has_cpf := v_cpf IS NOT NULL AND length(regexp_replace(v_cpf, '\D', '', 'g')) = 11;
  has_pix := v_pix IS NOT NULL AND length(trim(v_pix)) > 0;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) create_withdrawal_pending
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_withdrawal_pending(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_min numeric := 30;
  v_daily_limit numeric := 5000;
  v_available numeric;
  v_eligible numeric;
  v_daily_remaining numeric;
  v_pix text;
  v_cpf text;
  v_id uuid;
BEGIN
  -- Allow service_role to set uid via request header is not available;
  -- edge should call with user JWT. Fallback: jwt sub when auth.uid null via claim.
  IF v_uid IS NULL THEN
    BEGIN
      v_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_uid := NULL;
    END;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de saque é R$ %', v_min;
  END IF;

  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = v_uid;
  IF v_cpf IS NULL OR length(regexp_replace(v_cpf, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'Cadastre um CPF válido antes de sacar';
  END IF;

  SELECT pix_key INTO v_pix
  FROM public.creator_payout_methods
  WHERE creator_id = v_uid;

  IF v_pix IS NULL OR length(trim(v_pix)) = 0 THEN
    RAISE EXCEPTION 'Cadastre uma chave PIX antes de sacar';
  END IF;

  SELECT e.eligible_brl, e.available_brl, e.daily_remaining_brl
  INTO v_eligible, v_available, v_daily_remaining
  FROM public.get_withdrawal_eligibility(v_uid) e;

  IF p_amount > COALESCE(v_eligible, 0) THEN
    RAISE EXCEPTION 'Valor acima do saldo elegível (hold de 7 dias). Disponível para saque: R$ %',
      round(COALESCE(v_eligible, 0), 2);
  END IF;

  IF p_amount > COALESCE(v_daily_remaining, 0) THEN
    RAISE EXCEPTION 'Limite diário de saque é R$ %. Restante hoje: R$ %',
      v_daily_limit, round(COALESCE(v_daily_remaining, 0), 2);
  END IF;

  INSERT INTO public.creator_balances (creator_id)
  VALUES (v_uid)
  ON CONFLICT (creator_id) DO NOTHING;

  SELECT available_brl INTO v_available
  FROM public.creator_balances
  WHERE creator_id = v_uid
  FOR UPDATE;

  IF COALESCE(v_available, 0) < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.creator_balances
  SET
    available_brl = available_brl - p_amount,
    pending_brl = pending_brl + p_amount,
    updated_at = now()
  WHERE creator_id = v_uid;

  INSERT INTO public.withdrawals (creator_id, amount, fee_amount, net_amount, status, pix_key)
  VALUES (v_uid, p_amount, 0, p_amount, 'pending', trim(v_pix))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_withdrawal_pending(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_pending(numeric) TO authenticated, service_role;

-- Keep old name as thin wrapper for any stale clients (same rules, no SyncPay)
CREATE OR REPLACE FUNCTION public.request_creator_payout(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Use a função de saque do app (request-withdrawal). Valor mínimo R$ 30.';
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) mark processing + finalize
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_withdrawal_processing(
  p_withdrawal_id uuid,
  p_syncpay_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_withdrawal_id IS NULL OR p_syncpay_id IS NULL OR length(trim(p_syncpay_id)) = 0 THEN
    RAISE EXCEPTION 'invalid args';
  END IF;

  UPDATE public.withdrawals
  SET
    syncpay_id = trim(p_syncpay_id),
    status = 'processing'
  WHERE id = p_withdrawal_id
    AND status IN ('pending', 'processing');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_withdrawal_processing(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_processing(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_withdrawal(
  p_status text,
  p_failure_reason text DEFAULT NULL,
  p_withdrawal_id uuid DEFAULT NULL,
  p_syncpay_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawals%ROWTYPE;
  v_norm text := lower(trim(COALESCE(p_status, '')));
  v_paid boolean;
  v_failed boolean;
BEGIN
  IF p_withdrawal_id IS NULL AND (p_syncpay_id IS NULL OR length(trim(p_syncpay_id)) = 0) THEN
    RAISE EXCEPTION 'withdrawal id or syncpay_id required';
  END IF;

  IF p_withdrawal_id IS NOT NULL THEN
    SELECT * INTO v_row FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  ELSE
    SELECT * INTO v_row FROM public.withdrawals WHERE syncpay_id = trim(p_syncpay_id) FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_row.status IN ('paid', 'failed', 'cancelled') THEN
    RETURN true; -- idempotent
  END IF;

  v_paid := v_norm IN ('completed', 'paid', 'paid_out', 'approved');
  v_failed := v_norm IN ('failed', 'refunded', 'cancelled', 'canceled', 'med');

  IF v_paid THEN
    UPDATE public.withdrawals
    SET status = 'paid', paid_at = now(), failure_reason = NULL
    WHERE id = v_row.id;

    UPDATE public.creator_balances
    SET
      pending_brl = GREATEST(0, pending_brl - v_row.amount),
      lifetime_paid_brl = lifetime_paid_brl + v_row.amount,
      updated_at = now()
    WHERE creator_id = v_row.creator_id;

    RETURN true;
  END IF;

  IF v_failed THEN
    UPDATE public.withdrawals
    SET
      status = 'failed',
      failure_reason = COALESCE(p_failure_reason, failure_reason, 'failed'),
      paid_at = NULL
    WHERE id = v_row.id;

    UPDATE public.creator_balances
    SET
      pending_brl = GREATEST(0, pending_brl - v_row.amount),
      available_brl = available_brl + v_row.amount,
      updated_at = now()
    WHERE creator_id = v_row.creator_id;

    RETURN true;
  END IF;

  -- pending / processing: ensure processing if we have syncpay id
  IF v_row.status = 'pending' AND v_row.syncpay_id IS NOT NULL THEN
    UPDATE public.withdrawals SET status = 'processing' WHERE id = v_row.id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_withdrawal(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_withdrawal(text, text, uuid, text) TO service_role;

-- Service-role helper: create pending as a specific creator (edge after JWT verified)
CREATE OR REPLACE FUNCTION public.create_withdrawal_pending_for(
  p_creator_id uuid,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min numeric := 30;
  v_daily_limit numeric := 5000;
  v_available numeric;
  v_eligible numeric;
  v_daily_remaining numeric;
  v_pix text;
  v_cpf text;
  v_id uuid;
BEGIN
  IF p_creator_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de saque é R$ %', v_min;
  END IF;

  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = p_creator_id;
  IF v_cpf IS NULL OR length(regexp_replace(v_cpf, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'Cadastre um CPF válido antes de sacar';
  END IF;

  SELECT pix_key INTO v_pix
  FROM public.creator_payout_methods
  WHERE creator_id = p_creator_id;

  IF v_pix IS NULL OR length(trim(v_pix)) = 0 THEN
    RAISE EXCEPTION 'Cadastre uma chave PIX antes de sacar';
  END IF;

  SELECT e.eligible_brl, e.available_brl, e.daily_remaining_brl
  INTO v_eligible, v_available, v_daily_remaining
  FROM public.get_withdrawal_eligibility(p_creator_id) e;

  IF p_amount > COALESCE(v_eligible, 0) THEN
    RAISE EXCEPTION 'Valor acima do saldo elegível (hold de 7 dias). Disponível para saque: R$ %',
      round(COALESCE(v_eligible, 0), 2);
  END IF;

  IF p_amount > COALESCE(v_daily_remaining, 0) THEN
    RAISE EXCEPTION 'Limite diário de saque é R$ %. Restante hoje: R$ %',
      v_daily_limit, round(COALESCE(v_daily_remaining, 0), 2);
  END IF;

  INSERT INTO public.creator_balances (creator_id)
  VALUES (p_creator_id)
  ON CONFLICT (creator_id) DO NOTHING;

  SELECT available_brl INTO v_available
  FROM public.creator_balances
  WHERE creator_id = p_creator_id
  FOR UPDATE;

  IF COALESCE(v_available, 0) < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.creator_balances
  SET
    available_brl = available_brl - p_amount,
    pending_brl = pending_brl + p_amount,
    updated_at = now()
  WHERE creator_id = p_creator_id;

  INSERT INTO public.withdrawals (creator_id, amount, fee_amount, net_amount, status, pix_key)
  VALUES (p_creator_id, p_amount, 0, p_amount, 'pending', trim(v_pix))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_withdrawal_pending_for(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_pending_for(uuid, numeric) TO service_role;
