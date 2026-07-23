-- Extend get_creator_list with optional sort (popular | preco | novo)
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
