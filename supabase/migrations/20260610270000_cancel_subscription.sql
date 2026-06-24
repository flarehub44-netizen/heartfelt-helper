-- Allow fans to cancel their own subscription safely via RPC

CREATE OR REPLACE FUNCTION cancel_subscription(p_sub_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fan_id uuid;
BEGIN
  SELECT fan_id INTO v_fan_id FROM subscriptions WHERE id = p_sub_id;

  IF v_fan_id IS NULL THEN
    RAISE EXCEPTION 'subscription not found';
  END IF;
  IF v_fan_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE subscriptions
  SET active = false, expires_at = now()
  WHERE id = p_sub_id;
END;
$$;
