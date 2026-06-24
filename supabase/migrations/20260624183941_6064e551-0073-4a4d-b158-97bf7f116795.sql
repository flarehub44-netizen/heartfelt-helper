
CREATE OR REPLACE FUNCTION public.get_rate_limit_logs(p_limit int DEFAULT 100)
RETURNS TABLE(id uuid, user_id uuid, user_name text, user_handle text, created_at timestamptz, hourly_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT r.id, r.user_id, p.name, p.handle, r.created_at,
    (SELECT COUNT(*) FROM pix_rate_limit r2
       WHERE r2.user_id = r.user_id
         AND r2.created_at > now() - interval '1 hour') AS hourly_count
  FROM pix_rate_limit r
  LEFT JOIN profiles p ON p.id = r.user_id
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_health()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT jsonb_build_object(
    'pix_last_hour', (SELECT COUNT(*) FROM pix_rate_limit WHERE created_at > now() - interval '1 hour'),
    'pix_last_24h', (SELECT COUNT(*) FROM pix_rate_limit WHERE created_at > now() - interval '24 hours'),
    'pix_throttled_users', (
      SELECT COUNT(*) FROM (
        SELECT user_id FROM pix_rate_limit
        WHERE created_at > now() - interval '1 hour'
        GROUP BY user_id HAVING COUNT(*) >= 10
      ) t
    ),
    'pending_payments_24h', (SELECT COUNT(*) FROM pending_payments WHERE created_at > now() - interval '24 hours'),
    'pending_creators', (SELECT COUNT(*) FROM profiles WHERE role='creator' AND approved=false),
    'new_signups_24h', (SELECT COUNT(*) FROM profiles WHERE created_at > now() - interval '24 hours'),
    'new_subs_24h', (SELECT COUNT(*) FROM subscriptions WHERE created_at > now() - interval '24 hours' AND active=true),
    'expiring_subs_7d', (SELECT COUNT(*) FROM subscriptions WHERE active=true AND expires_at BETWEEN now() AND now() + interval '7 days'),
    'posts_24h', (SELECT COUNT(*) FROM posts WHERE created_at > now() - interval '24 hours')
  ) INTO v;
  RETURN v;
END;
$$;
