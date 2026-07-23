-- Notify creator in-app when approved flips to true
CREATE OR REPLACE FUNCTION public.notify_creator_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'creator'
     AND NEW.approved = true
     AND (OLD.approved IS DISTINCT FROM true)
  THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.id,
      'creator_approved',
      'Conta aprovada!',
      'Seu perfil de criador foi aprovado. Publique seu primeiro post e comece a ganhar.',
      jsonb_build_object('href', '/dashboard')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_creator_approved ON public.profiles;
CREATE TRIGGER trg_notify_creator_approved
  AFTER UPDATE OF approved ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_creator_approved();
