-- Wire pg_cron → subscription-reminders with INTERNAL_FN_SECRET from Vault.
-- Prerequisite: vault secret named `internal_fn_secret` must exist and match
-- Edge Function secret INTERNAL_FN_SECRET (Dashboard → Edge Functions → Secrets).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'internal_fn_secret'
  ) THEN
    RAISE EXCEPTION
      'vault secret internal_fn_secret missing — create it before applying (same value as Edge INTERNAL_FN_SECRET)';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-reminders-hourly') THEN
    PERFORM cron.unschedule('subscription-reminders-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'subscription-reminders-hourly',
  '20 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://yqevjcrypxepzzbrmqhb.supabase.co/functions/v1/subscription-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'internal_fn_secret'
        LIMIT 1
      ),
      'x-internal-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'internal_fn_secret'
        LIMIT 1
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
