
-- ============ WALLETS ============
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ COIN PACKAGES ============
CREATE TABLE public.coin_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coins integer NOT NULL CHECK (coins > 0),
  price_brl numeric(10,2) NOT NULL CHECK (price_brl > 0),
  bonus integer NOT NULL DEFAULT 0,
  label text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_packages TO anon, authenticated;
GRANT ALL ON public.coin_packages TO service_role;
ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active packages" ON public.coin_packages FOR SELECT USING (active = true);
CREATE POLICY "admin manages packages" ON public.coin_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COIN TRANSACTIONS ============
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase','gift_sent','gift_received','tip_sent','tip_received','ppv_spent','ppv_received','refund','admin_adjust')),
  ref_type text,
  ref_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own coin tx" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ GIFTS CATALOG ============
CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL,
  cost integer NOT NULL CHECK (cost > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.gifts TO anon, authenticated;
GRANT ALL ON public.gifts TO service_role;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active gifts" ON public.gifts FOR SELECT USING (active = true);
CREATE POLICY "admin manages gifts" ON public.gifts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ LIVE GIFTS ============
CREATE TABLE public.live_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.creator_lives(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES public.gifts(id),
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_live_gifts_live ON public.live_gifts(live_id, created_at DESC);
GRANT SELECT ON public.live_gifts TO authenticated;
GRANT ALL ON public.live_gifts TO service_role;
ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed reads live gifts" ON public.live_gifts FOR SELECT TO authenticated USING (true);

-- ============ POST UNLOCKS (PPV) ============
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS ppv_price integer DEFAULT 0 CHECK (ppv_price >= 0);

CREATE TABLE public.post_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins_paid integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
GRANT SELECT ON public.post_unlocks TO authenticated;
GRANT ALL ON public.post_unlocks TO service_role;
ALTER TABLE public.post_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user sees own unlocks" ON public.post_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT creator_id FROM public.posts WHERE id = post_id));

-- ============ AUTO-CREATE WALLET ============
CREATE OR REPLACE FUNCTION public.ensure_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_wallet() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_ensure_wallet ON public.profiles;
CREATE TRIGGER trg_ensure_wallet AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_wallet();

-- Backfill existing
INSERT INTO public.wallets(user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;

-- ============ CREDIT COINS (called by webhook with service role) ============
CREATE OR REPLACE FUNCTION public.credit_coins(p_user_id uuid, p_amount integer, p_ref_type text, p_ref_id uuid, p_description text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  INSERT INTO wallets(user_id, balance) VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + p_amount, updated_at = now();
  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id, description)
    VALUES (p_user_id, p_amount, 'purchase', p_ref_type, p_ref_id, p_description);
END $$;
REVOKE EXECUTE ON FUNCTION public.credit_coins(uuid, integer, text, uuid, text) FROM anon, authenticated, public;

-- ============ SEND LIVE GIFT ============
CREATE OR REPLACE FUNCTION public.send_live_gift(p_live_id uuid, p_gift_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cost integer; v_creator uuid; v_sender uuid := auth.uid(); v_gift_name text; v_sender_name text;
BEGIN
  IF v_sender IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT cost, name INTO v_cost, v_gift_name FROM gifts WHERE id = p_gift_id AND active = true;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'gift not found'; END IF;
  SELECT creator_id INTO v_creator FROM creator_lives WHERE id = p_live_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'live not found'; END IF;
  IF v_creator = v_sender THEN RAISE EXCEPTION 'cannot gift yourself'; END IF;

  UPDATE wallets SET balance = balance - v_cost, updated_at = now()
    WHERE user_id = v_sender AND balance >= v_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  INSERT INTO wallets(user_id, balance) VALUES (v_creator, v_cost)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_cost, updated_at = now();

  INSERT INTO live_gifts(live_id, sender_id, creator_id, gift_id, cost)
    VALUES (p_live_id, v_sender, v_creator, p_gift_id, v_cost);

  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id, description)
    VALUES (v_sender, -v_cost, 'gift_sent', 'live', p_live_id, v_gift_name);
  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id, description)
    VALUES (v_creator, v_cost, 'gift_received', 'live', p_live_id, v_gift_name);

  SELECT name INTO v_sender_name FROM profiles WHERE id = v_sender;
  INSERT INTO notifications(user_id, type, title, body, data)
    VALUES (v_creator, 'gift_received', 'Você recebeu um presente! 🎁',
      COALESCE(v_sender_name,'Alguém') || ' enviou ' || v_gift_name,
      jsonb_build_object('live_id', p_live_id, 'coins', v_cost));
END $$;
GRANT EXECUTE ON FUNCTION public.send_live_gift(uuid, uuid) TO authenticated;

-- ============ TIP WITH COINS ============
CREATE OR REPLACE FUNCTION public.tip_with_coins(p_creator_id uuid, p_amount integer, p_message text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender uuid := auth.uid(); v_sender_name text;
BEGIN
  IF v_sender IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF v_sender = p_creator_id THEN RAISE EXCEPTION 'cannot tip yourself'; END IF;

  UPDATE wallets SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = v_sender AND balance >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  INSERT INTO wallets(user_id, balance) VALUES (p_creator_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + p_amount, updated_at = now();

  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id, description)
    VALUES (v_sender, -p_amount, 'tip_sent', 'creator', p_creator_id, p_message);
  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id, description)
    VALUES (p_creator_id, p_amount, 'tip_received', 'creator', v_sender, p_message);

  SELECT name INTO v_sender_name FROM profiles WHERE id = v_sender;
  INSERT INTO notifications(user_id, type, title, body, data)
    VALUES (p_creator_id, 'tip_received', 'Você recebeu uma gorjeta! 💰',
      COALESCE(v_sender_name,'Alguém') || ' enviou ' || p_amount || ' moedas',
      jsonb_build_object('fan_id', v_sender, 'amount', p_amount));
END $$;
GRANT EXECUTE ON FUNCTION public.tip_with_coins(uuid, integer, text) TO authenticated;

-- ============ UNLOCK POST WITH COINS ============
CREATE OR REPLACE FUNCTION public.unlock_post_with_coins(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_price integer; v_creator uuid; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT ppv_price, creator_id INTO v_price, v_creator FROM posts WHERE id = p_post_id;
  IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'post not for sale'; END IF;
  IF v_creator = v_user THEN RAISE EXCEPTION 'cannot buy own post'; END IF;
  IF EXISTS (SELECT 1 FROM post_unlocks WHERE post_id = p_post_id AND user_id = v_user) THEN
    RETURN;
  END IF;

  UPDATE wallets SET balance = balance - v_price, updated_at = now()
    WHERE user_id = v_user AND balance >= v_price;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  INSERT INTO wallets(user_id, balance) VALUES (v_creator, v_price)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_price, updated_at = now();

  INSERT INTO post_unlocks(post_id, user_id, coins_paid) VALUES (p_post_id, v_user, v_price);

  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id)
    VALUES (v_user, -v_price, 'ppv_spent', 'post', p_post_id);
  INSERT INTO coin_transactions(user_id, amount, type, ref_type, ref_id)
    VALUES (v_creator, v_price, 'ppv_received', 'post', p_post_id);
END $$;
GRANT EXECUTE ON FUNCTION public.unlock_post_with_coins(uuid) TO authenticated;

-- ============ UPDATE CAN_VIEW to consider PPV unlock ============
CREATE OR REPLACE FUNCTION public.can_view_post_media(p_creator_id uuid, p_min_plan text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(p_min_plan, 'free') = 'free' THEN true
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() = p_creator_id THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.fan_id = auth.uid() AND s.creator_id = p_creator_id
        AND s.active = true AND (s.expires_at IS NULL OR s.expires_at > now())
        AND public.plan_rank(s.plan) >= public.plan_rank(p_min_plan)
    )
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_post_media(uuid, text) FROM anon, authenticated, public;

-- ============ SEED DEFAULT GIFTS & PACKAGES ============
INSERT INTO public.gifts (name, emoji, cost, sort_order) VALUES
  ('Coração', '❤️', 1, 1),
  ('Rosa', '🌹', 5, 2),
  ('Estrela', '⭐', 10, 3),
  ('Diamante', '💎', 50, 4),
  ('Coroa', '👑', 100, 5),
  ('Foguete', '🚀', 500, 6)
ON CONFLICT DO NOTHING;

INSERT INTO public.coin_packages (coins, price_brl, bonus, label, sort_order) VALUES
  (10, 10.00, 0, 'Starter', 1),
  (50, 50.00, 5, 'Popular', 2),
  (100, 100.00, 15, 'Plus', 3),
  (500, 500.00, 100, 'Premium', 4)
ON CONFLICT DO NOTHING;
