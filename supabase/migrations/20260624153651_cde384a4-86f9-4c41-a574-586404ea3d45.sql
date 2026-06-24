CREATE OR REPLACE FUNCTION public.handle_subscription_expired()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'renewal_url', '/creator/' || NEW.creator_id::text || '?openSubscribe=1&plan=' || NEW.plan
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;