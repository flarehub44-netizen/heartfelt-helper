DROP POLICY "Authenticated users can view free posts" ON public.posts;

CREATE POLICY "Anyone can view free posts"
ON public.posts
FOR SELECT
TO anon, authenticated
USING (min_plan = 'free');