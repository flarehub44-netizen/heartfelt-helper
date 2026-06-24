-- Notifications table with RLS and auto-trigger on new subscriptions
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications(user_id, created_at DESC);

-- Trigger: notify creator when they get a new subscriber, notify fan when sub activates
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active = true THEN
    -- Notify creator
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.creator_id,
      'new_subscriber',
      'Novo assinante!',
      'Alguém assinou o plano ' || NEW.plan || '.',
      jsonb_build_object('fan_id', NEW.fan_id, 'plan', NEW.plan)
    );

    -- Notify fan
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.fan_id,
      'subscription_activated',
      'Assinatura ativada!',
      'Seu plano ' || NEW.plan || ' está ativo.',
      jsonb_build_object('creator_id', NEW.creator_id, 'plan', NEW.plan)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_subscription ON public.subscriptions;
CREATE TRIGGER on_new_subscription
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscription();
