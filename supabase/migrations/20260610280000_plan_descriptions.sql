-- Allow creators to write custom descriptions for each subscription plan

ALTER TABLE creator_plans
  ADD COLUMN IF NOT EXISTS description text;

-- Function: send renewal reminder notification (idempotent per subscription, max once per 7 days)
CREATE OR REPLACE FUNCTION send_renewal_reminder(p_sub_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fan_id    uuid;
  v_creator_name text;
  v_creator_id uuid;
  v_plan      text;
  v_already   boolean;
BEGIN
  SELECT fan_id, creator_id, plan
  INTO v_fan_id, v_creator_id, v_plan
  FROM subscriptions
  WHERE id = p_sub_id AND active = true;

  IF v_fan_id IS NULL THEN RETURN; END IF;
  IF v_fan_id != auth.uid() THEN RETURN; END IF;

  SELECT name INTO v_creator_name FROM profiles WHERE id = v_creator_id;

  -- Deduplicate: skip if we already sent this reminder in the last 7 days
  SELECT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_fan_id
      AND type = 'renewal_reminder'
      AND (data->>'sub_id')::text = p_sub_id::text
      AND created_at > now() - interval '7 days'
  ) INTO v_already;

  IF v_already THEN RETURN; END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_fan_id,
    'renewal_reminder',
    'Sua assinatura expira em breve!',
    'Renove seu plano ' || v_plan || ' com ' || COALESCE(v_creator_name, 'o criador') || ' para continuar acessando o conteúdo exclusivo.',
    jsonb_build_object('creator_id', v_creator_id, 'sub_id', p_sub_id, 'plan', v_plan)
  );
END;
$$;
