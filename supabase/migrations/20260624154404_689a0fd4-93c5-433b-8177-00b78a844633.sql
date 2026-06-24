-- Revoke EXECUTE on internal functions that should never be called directly
-- from the client (triggers and RLS helpers). They remain callable inside
-- the database (triggers / SECURITY DEFINER calls bypass these grants).

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'increment_post_likes()',
    'notify_comment_reply()',
    'handle_new_subscription()',
    'handle_new_user()',
    'handle_subscription_expired()',
    'notify_new_post()',
    'notify_live_started()',
    'update_updated_at_column()',
    'plan_rank(text)',
    'can_message_creator(uuid)',
    'can_view_post_media(uuid, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, authenticated, public', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function %', fn;
    END;
  END LOOP;
END $$;