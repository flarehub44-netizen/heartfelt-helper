
-- ── 1. Profile legal columns ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- ── 2. Seed default plans on creator approval ──────────────────────
CREATE OR REPLACE FUNCTION public.seed_default_creator_plans()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'creator' AND NEW.approved = true
     AND (OLD IS NULL OR OLD.approved = false OR OLD.role <> 'creator')
  THEN
    INSERT INTO public.creator_plans (creator_id, plan_name, price)
    VALUES
      (NEW.id, 'fan',      19.90),
      (NEW.id, 'superfan', 39.90),
      (NEW.id, 'vip',      79.90)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_creator_plans ON public.profiles;
CREATE TRIGGER trg_seed_default_creator_plans
AFTER INSERT OR UPDATE OF approved, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_default_creator_plans();

-- Backfill: ensure all already-approved creators have at least default plans
INSERT INTO public.creator_plans (creator_id, plan_name, price)
SELECT p.id, v.plan_name, v.price
FROM public.profiles p
CROSS JOIN (VALUES ('fan',19.90),('superfan',39.90),('vip',79.90)) AS v(plan_name, price)
WHERE p.role = 'creator' AND p.approved = true
  AND NOT EXISTS (
    SELECT 1 FROM public.creator_plans cp
    WHERE cp.creator_id = p.id AND cp.plan_name = v.plan_name
  );

-- ── 3. Block paid posts without plans ──────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_post_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.min_plan, 'free') <> 'free' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.creator_plans
      WHERE creator_id = NEW.creator_id AND plan_name = NEW.min_plan
    ) THEN
      RAISE EXCEPTION 'Você precisa criar o plano "%" antes de publicar posts desse nível.', NEW.min_plan
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_post_publish ON public.posts;
CREATE TRIGGER trg_validate_post_publish
BEFORE INSERT OR UPDATE OF min_plan, creator_id ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.validate_post_publish();

-- ── 4. PIX rate-limit table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pix_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pix_rate_limit_user_time
  ON public.pix_rate_limit (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.pix_rate_limit TO authenticated;
GRANT ALL ON public.pix_rate_limit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pix_rate_limit_id_seq TO authenticated, service_role;

ALTER TABLE public.pix_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pix rate limit"
  ON public.pix_rate_limit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts pix rate limit"
  ON public.pix_rate_limit FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── 5. Helper RPC: register legal acceptance ───────────────────────
CREATE OR REPLACE FUNCTION public.accept_age_and_terms()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  UPDATE public.profiles
     SET age_verified_at = COALESCE(age_verified_at, now()),
         terms_accepted_at = COALESCE(terms_accepted_at, now())
   WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_age_and_terms() TO authenticated;
