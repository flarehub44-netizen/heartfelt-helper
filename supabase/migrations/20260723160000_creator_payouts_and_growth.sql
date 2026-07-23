-- Creator BRL ledger + payouts, discover for new creators, post scheduling,
-- paid DM unlock, win-back helpers, conversion stats for creators.

-- ---------------------------------------------------------------------------
-- 1) Payout methods + balances + earnings + payouts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_payout_methods (
  creator_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pix_key text NOT NULL,
  pix_key_type text CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf','email','phone','random','cnpj')),
  bank_name text,
  account_type text,
  agency text,
  account_number text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_balances (
  creator_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_brl numeric NOT NULL DEFAULT 0 CHECK (available_brl >= 0),
  pending_brl numeric NOT NULL DEFAULT 0 CHECK (pending_brl >= 0),
  lifetime_earned_brl numeric NOT NULL DEFAULT 0 CHECK (lifetime_earned_brl >= 0),
  lifetime_paid_brl numeric NOT NULL DEFAULT 0 CHECK (lifetime_paid_brl >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('subscription','tip','ppv_cash','adjustment','bonus')),
  gross_amount numeric NOT NULL CHECK (gross_amount >= 0),
  platform_fee numeric NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount numeric NOT NULL CHECK (net_amount >= 0),
  ref_type text,
  ref_id text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ref_type, ref_id)
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  fee_amount numeric NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  net_amount numeric NOT NULL CHECK (net_amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  pix_key text NOT NULL,
  syncpay_id text UNIQUE,
  failure_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator ON public.creator_earnings(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_creator ON public.payouts(creator_id, requested_at DESC);

ALTER TABLE public.creator_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage own payout methods" ON public.creator_payout_methods;
CREATE POLICY "Creators manage own payout methods"
  ON public.creator_payout_methods FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = creator_id)
  WITH CHECK ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Creators view own balance" ON public.creator_balances;
CREATE POLICY "Creators view own balance"
  ON public.creator_balances FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Creators view own earnings" ON public.creator_earnings;
CREATE POLICY "Creators view own earnings"
  ON public.creator_earnings FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Creators view own payouts" ON public.payouts;
CREATE POLICY "Creators view own payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_payout_methods TO authenticated;
GRANT SELECT ON public.creator_balances TO authenticated;
GRANT SELECT ON public.creator_earnings TO authenticated;
GRANT SELECT ON public.payouts TO authenticated;

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
  v_fee numeric;
  v_net numeric;
  v_id uuid;
BEGIN
  IF p_creator_id IS NULL OR p_gross IS NULL OR p_gross <= 0 THEN
    RETURN NULL;
  END IF;

  v_fee := round(p_gross * COALESCE(p_fee_rate, 0.20), 2);
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

REVOKE ALL ON FUNCTION public.credit_creator_earning(uuid, text, numeric, text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_creator_earning(uuid, text, numeric, text, text, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.request_creator_payout(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pix text;
  v_available numeric;
  v_id uuid;
  v_min numeric := 20;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de saque é R$ %', v_min;
  END IF;

  SELECT pix_key INTO v_pix
  FROM public.creator_payout_methods
  WHERE creator_id = v_uid;

  IF v_pix IS NULL OR length(trim(v_pix)) = 0 THEN
    RAISE EXCEPTION 'Cadastre uma chave PIX antes de sacar';
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

  INSERT INTO public.payouts (creator_id, amount, fee_amount, net_amount, status, pix_key)
  VALUES (v_uid, p_amount, 0, p_amount, 'pending', v_pix)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_creator_payout(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_creator_payout(numeric) TO authenticated;

-- Bootstrap historical Pix tips/subs into ledger (idempotent via unique ref)
CREATE OR REPLACE FUNCTION public.bootstrap_creator_earnings(p_creator_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_creator_id, auth.uid());
  v_count int := 0;
  r record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_creator_id IS NOT NULL AND p_creator_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT s.id, s.syncpay_id, COALESCE(pp.amount, cp.price, 0) AS gross
    FROM public.subscriptions s
    LEFT JOIN public.pending_payments pp ON pp.syncpay_id = s.syncpay_id
    LEFT JOIN public.creator_plans cp
      ON cp.creator_id = s.creator_id
     AND lower(cp.plan_name) LIKE '%' || CASE s.plan
          WHEN 'superfan' THEN 'super'
          WHEN 'vip' THEN 'vip'
          ELSE 'fa'
        END || '%'
    WHERE s.creator_id = v_uid
      AND s.syncpay_id IS NOT NULL
  LOOP
    IF r.gross > 0 AND public.credit_creator_earning(
      v_uid, 'subscription', r.gross, 'syncpay', r.syncpay_id,
      'Assinatura (histórico)', 0.20
    ) IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT t.id::text AS tip_id, t.amount, t.syncpay_id
    FROM public.tips t
    WHERE t.creator_id = v_uid
  LOOP
    IF public.credit_creator_earning(
      v_uid, 'tip', r.amount,
      CASE WHEN r.syncpay_id IS NOT NULL THEN 'syncpay' ELSE 'tip' END,
      COALESCE(r.syncpay_id, r.tip_id),
      'Gorjeta (histórico)', 0.20
    ) IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_creator_earnings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_creator_earnings(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Post scheduling (before get_creator_list references scheduled_at)
-- ---------------------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.posts(creator_id, scheduled_at);

-- ---------------------------------------------------------------------------
-- 3) Discover: approved creators even without posts (badge via post_count=0)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_creator_list(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.get_creator_list(integer, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.get_creator_list(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort text DEFAULT 'popular'
)
RETURNS TABLE (
  id uuid,
  name text,
  handle text,
  bio text,
  avatar_url text,
  cover_url text,
  category text,
  role text,
  created_at timestamptz,
  social_links jsonb,
  min_price numeric,
  subscriber_count bigint,
  post_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.handle,
    p.bio,
    p.avatar_url,
    p.cover_url,
    p.category,
    p.role,
    p.created_at,
    COALESCE(p.social_links::jsonb, '{}'::jsonb) AS social_links,
    COALESCE(MIN(cp.price), 0) AS min_price,
    COUNT(DISTINCT s.id) FILTER (WHERE s.active = true) AS subscriber_count,
    COUNT(DISTINCT po.id) FILTER (
      WHERE po.scheduled_at IS NULL OR po.scheduled_at <= now()
    ) AS post_count
  FROM public.profiles p
  LEFT JOIN public.creator_plans cp ON cp.creator_id = p.id
  LEFT JOIN public.subscriptions s ON s.creator_id = p.id
  LEFT JOIN public.posts po ON po.creator_id = p.id
  WHERE p.role = 'creator'
    AND COALESCE(p.approved, false) = true
    AND (
      p_category IS NULL OR p.category = p_category
    )
    AND (
      p_search IS NULL
      OR p.name ILIKE '%' || p_search || '%'
      OR p.handle ILIKE '%' || p_search || '%'
    )
    AND (
      -- Has published content OR complete enough profile to appear as "novo"
      EXISTS (
        SELECT 1 FROM public.posts px
        WHERE px.creator_id = p.id
          AND (px.scheduled_at IS NULL OR px.scheduled_at <= now())
      )
      OR (
        p.avatar_url IS NOT NULL
        AND p.handle IS NOT NULL
        AND length(trim(p.handle)) > 0
      )
    )
  GROUP BY p.id
  ORDER BY
    CASE WHEN lower(coalesce(p_sort, 'popular')) = 'preco' THEN COALESCE(MIN(cp.price), 0) END ASC NULLS LAST,
    CASE WHEN lower(coalesce(p_sort, 'popular')) = 'novo' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN lower(coalesce(p_sort, 'popular')) NOT IN ('preco', 'novo') THEN COUNT(DISTINCT s.id) FILTER (WHERE s.active = true) END DESC NULLS LAST,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION public.get_creator_list(integer, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_list(integer, integer, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Paid DM: optional coin unlock
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dm_price_coins integer NOT NULL DEFAULT 0 CHECK (dm_price_coins >= 0);

CREATE TABLE IF NOT EXISTS public.dm_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins_spent integer NOT NULL CHECK (coins_spent > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fan_id, creator_id)
);

ALTER TABLE public.dm_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fans view own dm unlocks" ON public.dm_unlocks;
CREATE POLICY "Fans view own dm unlocks"
  ON public.dm_unlocks FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = fan_id OR (SELECT auth.uid()) = creator_id);

GRANT SELECT ON public.dm_unlocks TO authenticated;

CREATE OR REPLACE FUNCTION public.can_message_creator(p_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = p_creator_id
    OR EXISTS (
      SELECT 1 FROM public.dm_unlocks d
      WHERE d.fan_id = auth.uid() AND d.creator_id = p_creator_id
    )
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.fan_id = auth.uid()
        AND s.creator_id = p_creator_id
        AND s.active = true
        AND (s.expires_at IS NULL OR s.expires_at > now())
        AND (
          s.plan = 'vip'
          OR COALESCE((SELECT dm_price_coins FROM public.profiles WHERE id = p_creator_id), 0) = 0
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.unlock_dm_with_coins(p_creator_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fan uuid := auth.uid();
  v_price integer;
  v_balance integer;
BEGIN
  IF v_fan IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_fan = p_creator_id THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.dm_unlocks WHERE fan_id = v_fan AND creator_id = p_creator_id
  ) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(dm_price_coins, 0) INTO v_price
  FROM public.profiles WHERE id = p_creator_id;

  IF v_price IS NULL OR v_price <= 0 THEN
    -- Free / subscription path — nothing to unlock
    RETURN public.can_message_creator(p_creator_id);
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_fan FOR UPDATE;
  IF COALESCE(v_balance, 0) < v_price THEN
    RAISE EXCEPTION 'Saldo de moedas insuficiente';
  END IF;

  UPDATE public.wallets SET balance = balance - v_price, updated_at = now() WHERE user_id = v_fan;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_creator_id, v_price)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + EXCLUDED.balance, updated_at = now();

  INSERT INTO public.coin_transactions (user_id, amount, type, ref_type, ref_id, description)
  VALUES
    (v_fan, -v_price, 'ppv_spent', 'dm_unlock', p_creator_id::text, 'Desbloqueio de DM'),
    (p_creator_id, v_price, 'ppv_received', 'dm_unlock', v_fan::text, 'DM desbloqueada');

  INSERT INTO public.dm_unlocks (fan_id, creator_id, coins_spent)
  VALUES (v_fan, p_creator_id, v_price);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_dm_with_coins(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_dm_with_coins(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Win-back / renewal CRM for creators
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_creator_renewal_pipeline()
RETURNS TABLE (
  fan_id uuid,
  fan_name text,
  fan_avatar text,
  plan text,
  expires_at timestamptz,
  active boolean,
  bucket text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.fan_id,
    p.name AS fan_name,
    p.avatar_url AS fan_avatar,
    s.plan,
    s.expires_at,
    s.active,
    CASE
      WHEN s.active = true AND s.expires_at IS NOT NULL AND s.expires_at <= now() + interval '7 days'
        AND s.expires_at > now() THEN 'expiring_7d'
      WHEN (s.active = false OR (s.expires_at IS NOT NULL AND s.expires_at <= now()))
        AND s.expires_at IS NOT NULL
        AND s.expires_at > now() - interval '30 days' THEN 'expired_30d'
      ELSE 'other'
    END AS bucket
  FROM public.subscriptions s
  JOIN public.profiles p ON p.id = s.fan_id
  WHERE s.creator_id = auth.uid()
    AND s.expires_at IS NOT NULL
    AND (
      (s.active = true AND s.expires_at <= now() + interval '7 days' AND s.expires_at > now())
      OR (
        (s.active = false OR s.expires_at <= now())
        AND s.expires_at > now() - interval '30 days'
      )
    )
  ORDER BY s.expires_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_creator_renewal_pipeline() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_renewal_pipeline() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_fan_renewal(p_fan_id uuid, p_message text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid := auth.uid();
  v_name text;
  v_handle text;
BEGIN
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE creator_id = v_creator AND fan_id = p_fan_id
  ) THEN
    RAISE EXCEPTION 'no subscription relationship';
  END IF;

  SELECT name, handle INTO v_name, v_handle FROM public.profiles WHERE id = v_creator;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_fan_id,
    'renewal_reminder',
    COALESCE(v_name, 'Sua criadora') || ' te espera de volta',
    COALESCE(p_message, 'Sua assinatura precisa de atenção. Renove e continue acompanhando o conteúdo exclusivo.'),
    jsonb_build_object(
      'creator_id', v_creator,
      'handle', v_handle,
      'href', CASE WHEN v_handle IS NOT NULL THEN '/u/' || v_handle || '?openSubscribe=1' ELSE '/creator/' || v_creator || '?openSubscribe=1' END
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_fan_renewal(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_fan_renewal(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Creator conversion stats
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_creator_conversion_stats()
RETURNS TABLE (
  profile_views bigint,
  subscribe_clicks bigint,
  activations bigint,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT event_name
    FROM public.conversion_events
    WHERE creator_id = auth.uid()
      AND created_at >= now() - interval '30 days'
  )
  SELECT
    (SELECT COUNT(*) FROM ev WHERE event_name IN ('profile_view', 'view_content'))::bigint,
    (SELECT COUNT(*) FROM ev WHERE event_name IN ('subscribe_click', 'initiate_checkout'))::bigint,
    (SELECT COUNT(*) FROM ev WHERE event_name IN ('subscription_activated', 'purchase'))::bigint,
    CASE
      WHEN (SELECT COUNT(*) FROM ev WHERE event_name IN ('profile_view', 'view_content')) = 0 THEN 0
      ELSE round(
        (SELECT COUNT(*) FROM ev WHERE event_name IN ('subscription_activated', 'purchase'))::numeric
        / NULLIF((SELECT COUNT(*) FROM ev WHERE event_name IN ('profile_view', 'view_content'))::numeric, 0)
        * 100,
        1
      )
    END;
$$;

REVOKE ALL ON FUNCTION public.get_creator_conversion_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_conversion_stats() TO authenticated;

-- Allow creators to read their own conversion events (for transparency)
DROP POLICY IF EXISTS "Creators view own conversion events" ON public.conversion_events;
CREATE POLICY "Creators view own conversion events"
  ON public.conversion_events FOR SELECT TO authenticated
  USING (
    creator_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
  );
