-- Comment replies + notification trigger

ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES post_comments(id) ON DELETE CASCADE;

-- Notify the original commenter when someone replies to their comment
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_author uuid;
  v_replier_name  text;
BEGIN
  -- Only fire when a reply is created (parent_id is set)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the parent comment's author
  SELECT author_id INTO v_parent_author
  FROM post_comments WHERE id = NEW.parent_id;

  -- Don't notify someone who replied to themselves
  IF v_parent_author IS NULL OR v_parent_author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_replier_name FROM profiles WHERE id = NEW.author_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_parent_author,
    'comment_reply',
    'Nova resposta ao seu comentário',
    COALESCE(v_replier_name, 'Alguém') || ' respondeu seu comentário.',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comment_reply_notification
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();
