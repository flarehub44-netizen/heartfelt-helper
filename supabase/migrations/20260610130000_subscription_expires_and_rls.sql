-- Subscription expiration
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.subscriptions
SET expires_at = created_at + interval '30 days'
WHERE active = true AND expires_at IS NULL;

-- Plan rank helper for tier-based access
CREATE OR REPLACE FUNCTION public.plan_rank(plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE plan
    WHEN 'free' THEN 0
    WHEN 'fan' THEN 1
    WHEN 'superfan' THEN 2
    WHEN 'vip' THEN 3
    ELSE 0
  END;
$$;

-- Replace subscriber post policy with tier + expiration check
DROP POLICY IF EXISTS "Subscribers can view paid posts" ON public.posts;

CREATE POLICY "Subscribers can view paid posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.fan_id = auth.uid()
        AND s.creator_id = posts.creator_id
        AND s.active = true
        AND (s.expires_at IS NULL OR s.expires_at > now())
        AND public.plan_rank(s.plan) >= public.plan_rank(posts.min_plan)
    )
  );

-- Remove permissive feed policy that exposed paid post rows to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can see all posts in feed" ON public.posts;

-- Block direct subscription insert by fans (only webhook/service_role)
DROP POLICY IF EXISTS "Fans can create subscriptions" ON public.subscriptions;

-- Restrict content storage to creators and qualifying subscribers
DROP POLICY IF EXISTS "Content is accessible to authenticated users" ON storage.objects;

CREATE POLICY "Subscribers can view creator content"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.fan_id = auth.uid()
          AND s.creator_id::text = (storage.foldername(name))[1]
          AND s.active = true
          AND (s.expires_at IS NULL OR s.expires_at > now())
      )
    )
  );
