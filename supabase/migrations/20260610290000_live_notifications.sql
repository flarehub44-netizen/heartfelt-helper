-- Notify active subscribers when a creator goes live

CREATE OR REPLACE FUNCTION notify_live_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
  r record;
BEGIN
  -- Only fire when status transitions TO 'live'
  IF NEW.status != 'live' OR OLD.status = 'live' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_creator_name FROM profiles WHERE id = NEW.creator_id;

  FOR r IN
    SELECT fan_id
    FROM subscriptions
    WHERE creator_id = NEW.creator_id
      AND active = true
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      r.fan_id,
      'creator_live',
      COALESCE(v_creator_name, 'Criador') || ' está ao vivo agora! 🔴',
      COALESCE(NEW.title, 'Clique para assistir'),
      jsonb_build_object('creator_id', NEW.creator_id, 'live_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_live_started_notification
  AFTER UPDATE OF status ON creator_lives
  FOR EACH ROW
  EXECUTE FUNCTION notify_live_started();
