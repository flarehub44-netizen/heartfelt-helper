
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');

-- ====== PROFILES ======
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  cover_url TEXT,
  is_creator BOOLEAN NOT NULL DEFAULT false,
  referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ====== USER ROLES ======
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ====== TIERS ======
CREATE TABLE public.tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_brl_cents INTEGER NOT NULL CHECK (price_brl_cents >= 0),
  benefits TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, slug)
);
GRANT SELECT ON public.tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiers TO authenticated;
GRANT ALL ON public.tiers TO service_role;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers_public_read" ON public.tiers FOR SELECT USING (true);
CREATE POLICY "tiers_creator_manage" ON public.tiers FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ====== SUBSCRIPTIONS ======
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.tiers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','canceled','past_due')),
  started_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fan_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_party_read" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = fan_id OR auth.uid() = creator_id);
CREATE POLICY "subs_fan_insert" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "subs_fan_update" ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = fan_id) WITH CHECK (auth.uid() = fan_id);

-- Função para checar acesso a um tier mínimo
CREATE OR REPLACE FUNCTION public.user_has_min_tier(_user_id UUID, _creator_id UUID, _min_sort_order INTEGER)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.tiers t ON t.id = s.tier_id
    WHERE s.fan_id = _user_id
      AND s.creator_id = _creator_id
      AND s.status = 'active'
      AND t.sort_order >= _min_sort_order
  )
$$;

-- ====== POSTS ======
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  min_tier_sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
-- Leitura: criador, ou usuário com tier suficiente, ou post free (sort_order=0 mostra preview)
CREATE POLICY "posts_creator_read" ON public.posts FOR SELECT
  USING (creator_id = auth.uid() OR public.user_has_min_tier(auth.uid(), creator_id, min_tier_sort_order));
CREATE POLICY "posts_anon_preview" ON public.posts FOR SELECT TO anon
  USING (min_tier_sort_order = 0);
CREATE POLICY "posts_creator_manage" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "posts_creator_update" ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "posts_creator_delete" ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

-- ====== POST LIKES ======
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_read" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_self_insert" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_self_delete" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ====== POST COMMENTS ======
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_self_write" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_self_delete" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ====== CONVERSATIONS ======
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, fan_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_party_read" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = fan_id);
CREATE POLICY "conv_party_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = fan_id);
CREATE POLICY "conv_party_update" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = fan_id);

-- ====== MESSAGES ======
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs_party_read" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.creator_id = auth.uid() OR c.fan_id = auth.uid())
  ));
CREATE POLICY "msgs_party_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.creator_id = auth.uid() OR c.fan_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ====== PAYMENTS ======
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_brl_cents INTEGER NOT NULL CHECK (amount_brl_cents > 0),
  method TEXT NOT NULL DEFAULT 'pix_mock',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired')),
  pix_qr_payload TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_self_read" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "payments_self_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_self_update" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== AFFILIATE LINKS ======
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_links TO anon;
GRANT SELECT, INSERT ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_links_public_read" ON public.affiliate_links FOR SELECT USING (true);
CREATE POLICY "aff_links_self_insert" ON public.affiliate_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ====== AFFILIATE REFERRALS ======
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  commission_brl_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_ref_self_read" ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (auth.uid() = affiliate_user_id OR auth.uid() = referred_user_id);

-- ====== Trigger: cria profile + user_role + affiliate_link no signup ======
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handle TEXT;
  v_display TEXT;
  v_ref UUID;
  v_aff_code TEXT;
BEGIN
  v_handle := COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(NEW.id::text, 1, 8));
  v_display := COALESCE(NEW.raw_user_meta_data->>'display_name', v_handle);
  v_ref := NULLIF(NEW.raw_user_meta_data->>'referred_by', '')::UUID;

  -- garantir handle único
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle) LOOP
    v_handle := v_handle || floor(random()*1000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, handle, display_name, referred_by)
  VALUES (NEW.id, v_handle, v_display, v_ref);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  v_aff_code := lower(substr(replace(NEW.id::text, '-', ''), 1, 10));
  INSERT INTO public.affiliate_links (user_id, code) VALUES (NEW.id, v_aff_code)
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
