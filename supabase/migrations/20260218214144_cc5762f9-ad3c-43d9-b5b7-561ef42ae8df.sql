
-- Remove 2 permissive policies that expose posts without proper auth checks
DROP POLICY IF EXISTS "Anyone can view free posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can see all posts in feed" ON public.posts;

-- New policy: only authenticated users can view free posts
CREATE POLICY "Authenticated users can view free posts"
ON public.posts FOR SELECT
USING (auth.uid() IS NOT NULL AND min_plan = 'free');
