-- Add p_offset param to get_feed_posts for cursor/offset pagination
CREATE OR REPLACE FUNCTION public.get_feed_posts(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
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
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer, integer) TO anon;
