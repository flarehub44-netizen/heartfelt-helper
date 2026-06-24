
CREATE TABLE public.fan_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_check_in DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.fan_streaks TO authenticated;
GRANT ALL ON public.fan_streaks TO service_role;

ALTER TABLE public.fan_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak"
  ON public.fan_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON public.fan_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON public.fan_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.daily_check_in()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_row public.fan_streaks%ROWTYPE;
  v_new_streak INT := 1;
  v_bonus INT := 5;
  v_already BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.fan_streaks WHERE user_id = v_user;

  IF FOUND AND v_row.last_check_in = v_today THEN
    RETURN jsonb_build_object(
      'already_checked_in', true,
      'current_streak', v_row.current_streak,
      'longest_streak', v_row.longest_streak,
      'bonus', 0
    );
  END IF;

  IF FOUND AND v_row.last_check_in = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_row.current_streak + 1;
  END IF;

  -- Weekly bonus
  IF v_new_streak % 7 = 0 THEN
    v_bonus := v_bonus + 5;
  END IF;

  INSERT INTO public.fan_streaks (user_id, current_streak, longest_streak, last_check_in, updated_at)
  VALUES (v_user, v_new_streak, GREATEST(v_new_streak, COALESCE(v_row.longest_streak, 0)), v_today, now())
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(public.fan_streaks.longest_streak, EXCLUDED.current_streak),
        last_check_in = EXCLUDED.last_check_in,
        updated_at = now();

  -- Credit coins
  INSERT INTO public.wallets (user_id, balance, updated_at)
  VALUES (v_user, v_bonus, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.wallets.balance + v_bonus,
        updated_at = now();

  INSERT INTO public.coin_transactions (user_id, type, amount, description)
  VALUES (v_user, 'daily_checkin', v_bonus, 'Check-in diário (streak ' || v_new_streak || ')');

  RETURN jsonb_build_object(
    'already_checked_in', false,
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_new_streak, COALESCE(v_row.longest_streak, 0)),
    'bonus', v_bonus
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.daily_check_in() TO authenticated;
