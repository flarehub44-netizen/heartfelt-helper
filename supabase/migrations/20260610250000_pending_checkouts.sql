-- Abandoned PIX checkout tracking + recovery notification

CREATE TABLE IF NOT EXISTS pending_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fan_id, creator_id)
);

ALTER TABLE pending_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan reads own pending checkout"
  ON pending_checkouts FOR SELECT
  TO authenticated
  USING (auth.uid() = fan_id);

-- SECURITY DEFINER: client calls this when PIX countdown expires
-- Records the abandoned checkout and sends a recovery notification to the fan
CREATE OR REPLACE FUNCTION record_checkout_abandoned(
  p_fan_id    uuid,
  p_creator_id uuid,
  p_plan_name  text,
  p_amount     numeric,
  p_creator_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_fan_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO pending_checkouts (fan_id, creator_id, plan_name, amount)
  VALUES (p_fan_id, p_creator_id, p_plan_name, p_amount)
  ON CONFLICT (fan_id, creator_id) DO UPDATE
    SET plan_name  = EXCLUDED.plan_name,
        amount     = EXCLUDED.amount,
        created_at = now();

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    p_fan_id,
    'checkout_abandoned',
    'Sua assinatura ficou pendente!',
    'Você não completou o pagamento para ' || p_creator_name || '. Retome quando quiser.',
    jsonb_build_object('creator_id', p_creator_id, 'open_subscribe', true)
  );
END;
$$;
