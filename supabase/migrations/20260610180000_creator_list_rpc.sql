-- Unified creator list RPC — replaces 4 separate queries in useCreators.ts
CREATE OR REPLACE FUNCTION public.get_creator_list(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
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
    COUNT(DISTINCT po.id) AS post_count
  FROM public.profiles p
  LEFT JOIN public.creator_plans cp ON cp.creator_id = p.id
  LEFT JOIN public.subscriptions s ON s.creator_id = p.id
  LEFT JOIN public.posts po ON po.creator_id = p.id
  WHERE p.role = 'creator'
    AND (p_category IS NULL OR p.category = p_category)
    AND (
      p_search IS NULL
      OR p.name ILIKE '%' || p_search || '%'
      OR p.handle ILIKE '%' || p_search || '%'
    )
  GROUP BY p.id
  HAVING COUNT(DISTINCT po.id) > 0
  ORDER BY subscriber_count DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_list(integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_list(integer, integer, text, text) TO anon;
