-- Trigger: when a subscription is deactivated, notify the fan to renew
CREATE OR REPLACE FUNCTION public.handle_subscription_expired()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active = false AND OLD.active = true THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.fan_id,
      'subscription_expired',
      'Sua assinatura expirou',
      'Renove agora para continuar com acesso exclusivo ao conteúdo.',
      jsonb_build_object(
        'creator_id', NEW.creator_id,
        'plan', NEW.plan,
        'renewal_url', '/creator/' || NEW.creator_id::text || '?openSubscribe=1'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_expired ON public.subscriptions;
CREATE TRIGGER on_subscription_expired
  AFTER UPDATE OF active ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_expired();

-- Hourly cron job to deactivate expired subscriptions (requires pg_cron extension)
-- Enable via: Dashboard → Database → Extensions → pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'deactivate-expired-subscriptions',
      '0 * * * *',
      $$
        UPDATE public.subscriptions
        SET active = false
        WHERE active = true
          AND expires_at IS NOT NULL
          AND expires_at < now();
      $$
    );
  END IF;
END;
$$;
