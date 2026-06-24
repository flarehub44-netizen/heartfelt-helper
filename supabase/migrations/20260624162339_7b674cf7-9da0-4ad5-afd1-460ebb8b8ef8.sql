CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bonus integer := 10;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Idempotent: only credit if no welcome_bonus tx exists yet for this user
  IF EXISTS (
    SELECT 1 FROM public.coin_transactions
    WHERE user_id = v_user AND type = 'welcome_bonus'
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.wallets(user_id, balance)
    VALUES (v_user, v_bonus)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + v_bonus, updated_at = now();

  INSERT INTO public.coin_transactions(user_id, amount, type, ref_type, ref_id, description)
    VALUES (v_user, v_bonus, 'welcome_bonus', 'onboarding', NULL, 'B\u00f4nus de boas-vindas');

  RETURN v_bonus;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;