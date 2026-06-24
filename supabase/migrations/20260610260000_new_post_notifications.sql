-- Notify all active subscribers when a creator publishes a new post

CREATE OR REPLACE FUNCTION notify_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
  r record;
BEGIN
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
      'new_post',
      COALESCE(v_creator_name, 'Criador') || ' publicou algo novo!',
      NULL,
      jsonb_build_object('creator_id', NEW.creator_id, 'post_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_post_notification
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_post();
