-- Security hardening P0–P1:
-- processed_webhooks, pix IP rate limit, REVOKE triggers from anon,
-- security_invoker view, race-safe unlock/bonus/check-in, live chat RLS assert.

-- ---------------------------------------------------------------------------
-- 1) Idempotency table for SyncPay webhooks (service_role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  syncpay_id text PRIMARY KEY,
  kind text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.processed_webhooks FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.processed_webhooks TO service_role;

-- ---------------------------------------------------------------------------
-- 2) pix_rate_limit: optional IP column for DB-backed IP throttle
-- ---------------------------------------------------------------------------
ALTER TABLE public.pix_rate_limit
  ADD COLUMN IF NOT EXISTS ip text;

CREATE INDEX IF NOT EXISTS idx_pix_rate_limit_ip_time
  ON public.pix_rate_limit (ip, created_at DESC)
  WHERE ip IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Restore bonus/check-in ledger types (dropped by gift_converted migration)
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
    'gift_converted'::text,
    'welcome_bonus'::text,
    'daily_checkin'::text
  ]));

CREATE UNIQUE INDEX IF NOT EXISTS coin_tx_welcome_bonus_uidx
  ON public.coin_transactions (user_id)
  WHERE type = 'welcome_bonus';

CREATE UNIQUE INDEX IF NOT EXISTS coin_tx_daily_checkin_day_uidx
  ON public.coin_transactions (user_id, description)
  WHERE type = 'daily_checkin';

-- ---------------------------------------------------------------------------
-- 4) View creator_lives_public with security_invoker (no stream_url)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.creator_lives_public
WITH (security_invoker = true)
AS
SELECT
  id,
  creator_id,
  title,
  description,
  thumbnail_url,
  scheduled_at,
  status,
  min_plan,
  created_at
FROM public.creator_lives;

GRANT SELECT ON public.creator_lives_public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Live chat SELECT must use can_access_live_chat (idempotent)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone_read_live_chat" ON public.live_chat_messages;
DROP POLICY IF EXISTS "plan_gated_read_live_chat" ON public.live_chat_messages;
DROP POLICY IF EXISTS "anon_cannot_read_live_chat" ON public.live_chat_messages;

CREATE POLICY "plan_gated_read_live_chat"
  ON public.live_chat_messages FOR SELECT TO authenticated
  USING (
    public.can_access_live_chat(live_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "anon_cannot_read_live_chat"
  ON public.live_chat_messages FOR SELECT TO anon
  USING (false);

-- ---------------------------------------------------------------------------
-- 6) Race-safe unlock_post_with_coins
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_post_with_coins(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price integer;
  v_creator uuid;
  v_user uuid := auth.uid();
  v_unlock_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Ensure wallet row exists, then lock it
  INSERT INTO public.wallets (user_id, balance)
  VALUES (v_user, 0)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1 FROM public.wallets WHERE user_id = v_user FOR UPDATE;

  SELECT ppv_price, creator_id INTO v_price, v_creator
  FROM public.posts
  WHERE id = p_post_id;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'post not for sale';
  END IF;
  IF v_creator = v_user THEN
    RAISE EXCEPTION 'cannot buy own post';
  END IF;

  -- Claim unlock first (unique post_id+user_id); conflict = already unlocked
  INSERT INTO public.post_unlocks (post_id, user_id, coins_paid)
  VALUES (p_post_id, v_user, v_price)
  ON CONFLICT (post_id, user_id) DO NOTHING
  RETURNING id INTO v_unlock_id;

  IF v_unlock_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_price, updated_at = now()
  WHERE user_id = v_user AND balance >= v_price;

  IF NOT FOUND THEN
    DELETE FROM public.post_unlocks WHERE id = v_unlock_id;
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (v_creator, v_price)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + v_price, updated_at = now();

  INSERT INTO public.coin_transactions (user_id, amount, type, ref_type, ref_id)
  VALUES (v_user, -v_price, 'ppv_spent', 'post', p_post_id);

  INSERT INTO public.coin_transactions (user_id, amount, type, ref_type, ref_id)
  VALUES (v_creator, v_price, 'ppv_received', 'post', p_post_id);
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_post_with_coins(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_post_with_coins(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Race-safe claim_welcome_bonus
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bonus integer := 10;
  v_tx_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (v_user, 0)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1 FROM public.wallets WHERE user_id = v_user FOR UPDATE;

  BEGIN
    INSERT INTO public.coin_transactions (user_id, amount, type, ref_type, ref_id, description)
    VALUES (v_user, v_bonus, 'welcome_bonus', 'onboarding', NULL, 'Bônus de boas-vindas')
    RETURNING id INTO v_tx_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN 0;
  END;

  UPDATE public.wallets
  SET balance = balance + v_bonus, updated_at = now()
  WHERE user_id = v_user;

  RETURN v_bonus;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Race-safe daily_check_in
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_check_in()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_row public.fan_streaks%ROWTYPE;
  v_new_streak int := 1;
  v_bonus int := 5;
  v_desc text;
  v_tx_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (v_user, 0)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1 FROM public.wallets WHERE user_id = v_user FOR UPDATE;

  -- Lock streak row if present
  SELECT * INTO v_row
  FROM public.fan_streaks
  WHERE user_id = v_user
  FOR UPDATE;

  IF FOUND AND v_row.last_check_in = v_today THEN
    RETURN jsonb_build_object(
      'already_checked_in', true,
      'current_streak', v_row.current_streak,
      'longest_streak', v_row.longest_streak,
      'bonus', 0
    );
  END IF;

  IF FOUND AND v_row.last_check_in = v_today - 1 THEN
    v_new_streak := v_row.current_streak + 1;
  END IF;

  IF v_new_streak % 7 = 0 THEN
    v_bonus := v_bonus + 5;
  END IF;

  v_desc := 'Check-in diário ' || v_today::text || ' (streak ' || v_new_streak || ')';

  BEGIN
    INSERT INTO public.coin_transactions (user_id, type, amount, description)
    VALUES (v_user, 'daily_checkin', v_bonus, v_desc)
    RETURNING id INTO v_tx_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_row FROM public.fan_streaks WHERE user_id = v_user;
      RETURN jsonb_build_object(
        'already_checked_in', true,
        'current_streak', COALESCE(v_row.current_streak, 0),
        'longest_streak', COALESCE(v_row.longest_streak, 0),
        'bonus', 0
      );
  END;

  INSERT INTO public.fan_streaks (user_id, current_streak, longest_streak, last_check_in, updated_at)
  VALUES (
    v_user,
    v_new_streak,
    GREATEST(v_new_streak, COALESCE(v_row.longest_streak, 0)),
    v_today,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(public.fan_streaks.longest_streak, EXCLUDED.current_streak),
        last_check_in = EXCLUDED.last_check_in,
        updated_at = now();

  UPDATE public.wallets
  SET balance = balance + v_bonus, updated_at = now()
  WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'already_checked_in', false,
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_new_streak, COALESCE(v_row.longest_streak, 0)),
    'bonus', v_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.daily_check_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.daily_check_in() TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) REVOKE trigger / internal SECURITY DEFINER from PUBLIC + anon
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
        'notify_creator_approved',
        'on_live_gift_received',
        'prevent_profile_privilege_escalation',
        'seed_default_creator_plans',
        'validate_post_publish',
        'handle_new_user',
        'handle_new_subscription',
        'handle_subscription_expired',
        'notify_new_post',
        'notify_live_started',
        'notify_comment_reply',
        'increment_post_likes',
        'ensure_wallet'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- can_access_live_chat: needed by authenticated RLS; not by anon
REVOKE ALL ON FUNCTION public.can_access_live_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_live_chat(uuid) TO authenticated, service_role;

-- resolve_pending_checkout: app calls as authenticated only
REVOKE ALL ON FUNCTION public.resolve_pending_checkout(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_pending_checkout(uuid) TO authenticated, service_role;

-- Keep intentional public discover RPCs for anon
GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_list(integer, integer, text, text, text) TO anon, authenticated;
