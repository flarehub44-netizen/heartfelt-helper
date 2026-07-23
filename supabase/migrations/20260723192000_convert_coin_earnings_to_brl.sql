-- Convert creator coin earnings (gifts, tips, PPV/DM) into sacável BRL ledger.
-- Complements convert_live_gifts_to_brl with a single Dashboard CTA for all coin revenue.

CREATE OR REPLACE FUNCTION public.get_convertible_coin_balance()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_earned integer;
  v_converted integer;
  v_wallet integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer INTO v_earned
  FROM public.coin_transactions
  WHERE user_id = v_uid
    AND type IN ('gift_received', 'tip_received', 'ppv_received');

  SELECT COALESCE(SUM(ABS(amount)), 0)::integer INTO v_converted
  FROM public.coin_transactions
  WHERE user_id = v_uid
    AND type = 'gift_converted';

  SELECT COALESCE(balance, 0) INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_uid;

  RETURN GREATEST(0, LEAST(COALESCE(v_wallet, 0), v_earned - v_converted));
END;
$$;

REVOKE ALL ON FUNCTION public.get_convertible_coin_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_convertible_coin_balance() TO authenticated;

CREATE OR REPLACE FUNCTION public.convert_coin_earnings_to_brl()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_coins integer;
  v_rate numeric;
  v_gross numeric;
  v_net numeric;
  v_ref text;
  v_earn_id uuid;
  v_wallet integer;
  v_earned integer;
  v_converted integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role = 'creator'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Lock wallet first so BRL credit matches coins debited
  PERFORM 1 FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (v_uid, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_wallet
  FROM public.wallets WHERE user_id = v_uid FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0)::integer INTO v_earned
  FROM public.coin_transactions
  WHERE user_id = v_uid
    AND type IN ('gift_received', 'tip_received', 'ppv_received');

  SELECT COALESCE(SUM(ABS(amount)), 0)::integer INTO v_converted
  FROM public.coin_transactions
  WHERE user_id = v_uid
    AND type = 'gift_converted';

  v_coins := GREATEST(0, LEAST(COALESCE(v_wallet, 0), v_earned - v_converted));
  IF v_coins <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(NULLIF(value, '')::numeric, 0.10) INTO v_rate
  FROM public.platform_settings WHERE key = 'coin_to_brl_rate';
  IF v_rate IS NULL OR v_rate <= 0 THEN
    v_rate := 0.10;
  END IF;

  v_gross := round(v_coins * v_rate, 2);
  IF v_gross <= 0 THEN
    RETURN 0;
  END IF;

  v_ref := 'coin_earnings:' || gen_random_uuid()::text;

  v_earn_id := public.credit_creator_earning(
    v_uid, 'bonus', v_gross, 'coin_earnings', v_ref,
    'Conversão de ganhos em moedas (gifts/tips/PPV) → Pix', 0.20
  );

  IF v_earn_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT net_amount INTO v_net
  FROM public.creator_earnings WHERE id = v_earn_id;

  UPDATE public.wallets
  SET balance = balance - v_coins, updated_at = now()
  WHERE user_id = v_uid;

  INSERT INTO public.coin_transactions (
    user_id, amount, type, ref_type, ref_id, description
  ) VALUES (
    v_uid, -v_coins, 'gift_converted', 'coin_earnings', v_ref,
    'Conversão de ganhos em moedas → Pix'
  );

  RETURN COALESCE(v_net, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.convert_coin_earnings_to_brl() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_coin_earnings_to_brl() TO authenticated;
