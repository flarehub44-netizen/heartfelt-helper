-- Lock platform fee at 20% for creator Pix earnings (live gifts, tips, subs).
-- Fixes: (1) authenticated could call credit_creator_earning with p_fee_rate=0
--         (2) convert_live_gifts_to_brl credited BRL without debiting gift coins

-- ---------------------------------------------------------------------------
-- 1) Canonical platform fee setting
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES ('platform_fee_rate', '0.20')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Allow coin ledger type for gift → BRL conversion
-- ---------------------------------------------------------------------------
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'purchase'::text,
    'gift_sent'::text,
    'gift_received'::text,
    'tip_sent'::text,
    'tip_received'::text,
    'ppv_spent'::text,
    'ppv_received'::text,
    'refund'::text,
    'admin_adjust'::text,
    'gift_converted'::text
  ]));

-- ---------------------------------------------------------------------------
-- 3) Harden credit_creator_earning — fee from settings, not caller
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_creator_earning(
  p_creator_id uuid,
  p_source_type text,
  p_gross numeric,
  p_ref_type text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_fee_rate numeric DEFAULT 0.20
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_rate numeric;
  v_fee numeric;
  v_net numeric;
  v_id uuid;
BEGIN
  IF p_creator_id IS NULL OR p_gross IS NULL OR p_gross <= 0 THEN
    RETURN NULL;
  END IF;

  -- Platform rate from settings (fallback 0.20)
  SELECT COALESCE(NULLIF(value, '')::numeric, 0.20)
  INTO v_fee_rate
  FROM public.platform_settings
  WHERE key = 'platform_fee_rate';

  IF v_fee_rate IS NULL OR v_fee_rate < 0 OR v_fee_rate > 1 THEN
    v_fee_rate := 0.20;
  END IF;

  -- Only adjustments may override fee; all Pix revenue sources use platform rate
  IF p_source_type = 'adjustment' AND p_fee_rate IS NOT NULL THEN
    IF p_fee_rate < 0 OR p_fee_rate > 1 THEN
      RAISE EXCEPTION 'invalid fee rate';
    END IF;
    v_fee_rate := p_fee_rate;
  END IF;

  v_fee := round(p_gross * v_fee_rate, 2);
  v_net := round(p_gross - v_fee, 2);
  IF v_net < 0 THEN
    v_net := 0;
  END IF;

  INSERT INTO public.creator_earnings (
    creator_id, source_type, gross_amount, platform_fee, net_amount,
    ref_type, ref_id, description
  )
  VALUES (
    p_creator_id, p_source_type, p_gross, v_fee, v_net,
    p_ref_type, p_ref_id, p_description
  )
  ON CONFLICT (ref_type, ref_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN NULL; -- duplicate
  END IF;

  INSERT INTO public.creator_balances (creator_id, available_brl, lifetime_earned_brl, updated_at)
  VALUES (p_creator_id, v_net, v_net, now())
  ON CONFLICT (creator_id) DO UPDATE SET
    available_brl = public.creator_balances.available_brl + EXCLUDED.available_brl,
    lifetime_earned_brl = public.creator_balances.lifetime_earned_brl + EXCLUDED.lifetime_earned_brl,
    updated_at = now();

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_creator_earning(uuid, text, numeric, text, text, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_creator_earning(uuid, text, numeric, text, text, text, numeric)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Convert live gifts → BRL: debit coins, return net (80%)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_live_gifts_to_brl(p_live_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_creator uuid;
  v_coins integer;
  v_rate numeric;
  v_gross numeric;
  v_net numeric;
  v_ref text;
  v_earn_id uuid;
  v_wallet integer;
  v_debit integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT creator_id, COALESCE(gifts_total_coins, 0)
  INTO v_creator, v_coins
  FROM public.creator_lives WHERE id = p_live_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'live not found'; END IF;
  IF v_creator IS DISTINCT FROM v_uid AND NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_coins <= 0 THEN RETURN 0; END IF;

  SELECT COALESCE(NULLIF(value, '')::numeric, 0.10) INTO v_rate
  FROM public.platform_settings WHERE key = 'coin_to_brl_rate';
  IF v_rate IS NULL OR v_rate <= 0 THEN v_rate := 0.10; END IF;

  v_gross := round(v_coins * v_rate, 2);
  v_ref := 'live_gifts:' || p_live_id::text;

  v_earn_id := public.credit_creator_earning(
    v_creator, 'bonus', v_gross, 'live_gifts', v_ref,
    'Conversão de presentes da live', 0.20
  );

  -- Idempotent: already converted — return existing net, do not debit again
  IF v_earn_id IS NULL THEN
    SELECT net_amount INTO v_net
    FROM public.creator_earnings
    WHERE ref_type = 'live_gifts' AND ref_id = v_ref;
    RETURN COALESCE(v_net, 0);
  END IF;

  SELECT net_amount INTO v_net
  FROM public.creator_earnings WHERE id = v_earn_id;

  -- Debit gift coins from creator wallet (cap at available balance)
  SELECT COALESCE(balance, 0) INTO v_wallet
  FROM public.wallets WHERE user_id = v_creator FOR UPDATE;

  v_debit := LEAST(COALESCE(v_wallet, 0), v_coins);

  IF v_debit > 0 THEN
    UPDATE public.wallets
    SET balance = balance - v_debit, updated_at = now()
    WHERE user_id = v_creator;

    INSERT INTO public.coin_transactions (
      user_id, amount, type, ref_type, ref_id, description
    ) VALUES (
      v_creator, -v_debit, 'gift_converted', 'live_gifts', p_live_id::text,
      'Conversão de presentes da live → Pix'
    );
  END IF;

  RETURN COALESCE(v_net, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.convert_live_gifts_to_brl(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_live_gifts_to_brl(uuid) TO authenticated;
