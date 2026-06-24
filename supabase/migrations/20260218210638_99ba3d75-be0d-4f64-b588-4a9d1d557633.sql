
-- Function: get_platform_stats
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
  total_creators bigint,
  total_fans bigint,
  total_active_subs bigint,
  total_posts bigint,
  estimated_revenue numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    (SELECT COUNT(*) FROM profiles WHERE role = 'creator'),
    (SELECT COUNT(*) FROM profiles WHERE role = 'fan'),
    (SELECT COUNT(*) FROM subscriptions WHERE active = true),
    (SELECT COUNT(*) FROM posts),
    (SELECT COALESCE(SUM(cp.price), 0)
     FROM subscriptions s
     JOIN creator_plans cp ON cp.creator_id = s.creator_id AND cp.plan_name = s.plan
     WHERE s.active = true);
$$;

-- Function: admin_delete_post
CREATE OR REPLACE FUNCTION public.admin_delete_post(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM posts WHERE id = p_post_id;
END;
$$;

-- Function: admin_ban_user (deletes profile which cascades)
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

-- Function: get_admin_creator_stats - top creators by revenue
CREATE OR REPLACE FUNCTION public.get_admin_creator_stats()
RETURNS TABLE (
  creator_id uuid,
  creator_name text,
  creator_handle text,
  creator_category text,
  active_subs bigint,
  estimated_revenue numeric,
  post_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    p.id AS creator_id,
    p.name AS creator_name,
    p.handle AS creator_handle,
    p.category AS creator_category,
    COUNT(DISTINCT s.id) FILTER (WHERE s.active = true) AS active_subs,
    COALESCE(SUM(cp.price) FILTER (WHERE s.active = true), 0) AS estimated_revenue,
    COUNT(DISTINCT po.id) AS post_count
  FROM profiles p
  LEFT JOIN subscriptions s ON s.creator_id = p.id
  LEFT JOIN creator_plans cp ON cp.creator_id = s.creator_id AND cp.plan_name = s.plan
  LEFT JOIN posts po ON po.creator_id = p.id
  WHERE p.role = 'creator'
  GROUP BY p.id, p.name, p.handle, p.category
  ORDER BY estimated_revenue DESC;
$$;
