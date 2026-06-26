CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, role, name, handle, category, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'fan'),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'handle',
    NEW.raw_user_meta_data->>'category',
    true
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

UPDATE public.profiles SET approved = true WHERE role = 'creator' AND approved = false;