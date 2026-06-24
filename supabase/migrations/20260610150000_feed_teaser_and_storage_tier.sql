-- Feed teaser: all posts visible; media_url masked without qualifying subscription
CREATE OR REPLACE FUNCTION public.can_view_post_media(p_creator_id uuid, p_min_plan text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(p_min_plan, 'free') = 'free' THEN true
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() = p_creator_id THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.fan_id = auth.uid()
        AND s.creator_id = p_creator_id
        AND s.active = true
        AND (s.expires_at IS NULL OR s.expires_at > now())
        AND public.plan_rank(s.plan) >= public.plan_rank(p_min_plan)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_feed_posts(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  text text,
  media_url text,
  media_type text,
  likes_count integer,
  min_plan text,
  created_at timestamptz,
  creator_id uuid,
  creator jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.text,
    CASE
      WHEN public.can_view_post_media(p.creator_id, p.min_plan) THEN p.media_url
      ELSE NULL
    END AS media_url,
    p.media_type,
    p.likes_count,
    p.min_plan,
    p.created_at,
    p.creator_id,
    jsonb_build_object(
      'id', pr.id,
      'name', pr.name,
      'handle', pr.handle,
      'avatar_url', pr.avatar_url,
      'category', pr.category
    ) AS creator
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.creator_id
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer) TO anon;

-- Storage: tier-aware access via post media_url match
DROP POLICY IF EXISTS "Subscribers can view creator content" ON storage.objects;

CREATE POLICY "Subscribers can view creator content by tier"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1
        FROM public.posts po
        JOIN public.subscriptions s
          ON s.creator_id = po.creator_id
          AND s.fan_id = auth.uid()
        WHERE po.media_url LIKE '%' || name
          AND s.active = true
          AND (s.expires_at IS NULL OR s.expires_at > now())
          AND public.plan_rank(s.plan) >= public.plan_rank(po.min_plan)
      )
    )
  );
