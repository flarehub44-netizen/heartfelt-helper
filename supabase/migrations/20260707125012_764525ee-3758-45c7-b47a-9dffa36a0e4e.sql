
-- 1) Force role='fan' on signup + validate handle metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  -- Never trust client-supplied role on signup. Creators are promoted only
  -- via admin approval flow (approved=false + role='creator' set by admin).
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'fan');
  IF v_role NOT IN ('fan', 'creator') THEN
    v_role := 'fan';
  END IF;

  INSERT INTO public.profiles (id, role, name, handle, category, approved)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'handle',
    NEW.raw_user_meta_data->>'category',
    -- creators require manual approval; fans auto-approved
    CASE WHEN v_role = 'creator' THEN false ELSE true END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- 2) Prevent privilege escalation: users cannot change role/approved/age_verified_at/terms_accepted_at
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins and service_role bypass (service_role never triggers RLS-bound calls anyway)
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    RAISE EXCEPTION 'Not allowed to change approval status' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.age_verified_at IS DISTINCT FROM OLD.age_verified_at
     AND OLD.age_verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'Not allowed to modify age verification' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at
     AND OLD.terms_accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Not allowed to modify terms acceptance' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_prevent_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
