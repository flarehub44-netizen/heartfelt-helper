
CREATE OR REPLACE FUNCTION public.get_creator_monthly_revenue(p_creator_id uuid)
RETURNS TABLE (month text, value numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    TO_CHAR(generate_series, 'Mon') AS month,
    COALESCE((
      SELECT SUM(cp.price)
      FROM subscriptions s
      JOIN creator_plans cp ON cp.creator_id = s.creator_id
        AND cp.plan_name = s.plan
      WHERE s.creator_id = p_creator_id
        AND s.active = true
        AND DATE_TRUNC('month', s.created_at) <= generate_series
    ), 0) AS value
  FROM generate_series(
    DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
    DATE_TRUNC('month', NOW()),
    INTERVAL '1 month'
  )
  ORDER BY generate_series;
$$;
