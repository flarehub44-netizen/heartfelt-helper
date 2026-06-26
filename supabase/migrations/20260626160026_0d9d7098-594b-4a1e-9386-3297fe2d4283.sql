DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.t);
  END LOOP;
END $$;

-- Public-readable tables (have permissive RLS)
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.creator_plans TO anon;
GRANT SELECT ON public.coin_packages TO anon;
GRANT SELECT ON public.gifts TO anon;
GRANT SELECT ON public.creator_lives TO anon;
GRANT SELECT ON public.platform_settings TO anon;