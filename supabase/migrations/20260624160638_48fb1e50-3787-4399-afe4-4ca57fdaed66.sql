
-- Drop old overloads and recreate with ppv fields
DROP FUNCTION IF EXISTS public.get_feed_posts(integer);
DROP FUNCTION IF EXISTS public.get_feed_posts(integer, integer);

CREATE OR REPLACE FUNCTION public.get_feed_posts(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, text text, media_url text, media_type text,
  likes_count integer, min_plan text, ppv_price integer, unlocked boolean,
  created_at timestamptz, creator_id uuid, creator jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.text,
    CASE
      WHEN auth.uid() = p.creator_id THEN p.media_url
      WHEN COALESCE(p.ppv_price, 0) > 0 AND NOT EXISTS (
        SELECT 1 FROM post_unlocks pu WHERE pu.post_id = p.id AND pu.user_id = auth.uid()
      ) THEN NULL
      WHEN can_view_post_media(p.creator_id, p.min_plan) THEN p.media_url
      ELSE NULL
    END AS media_url,
    p.media_type, p.likes_count, p.min_plan,
    COALESCE(p.ppv_price, 0) AS ppv_price,
    (auth.uid() = p.creator_id) OR EXISTS (
      SELECT 1 FROM post_unlocks pu WHERE pu.post_id = p.id AND pu.user_id = auth.uid()
    ) AS unlocked,
    p.created_at, p.creator_id,
    jsonb_build_object(
      'id', pr.id, 'name', pr.name, 'handle', pr.handle,
      'avatar_url', pr.avatar_url, 'category', pr.category
    ) AS creator
  FROM posts p
  JOIN profiles pr ON pr.id = p.creator_id
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer, integer) TO anon, authenticated;
