GRANT SELECT ON public.creator_lives TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_lives TO authenticated;
GRANT ALL ON public.creator_lives TO service_role;

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;