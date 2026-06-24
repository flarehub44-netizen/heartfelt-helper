-- 1. Add RLS policy so authenticated users can see all posts in the feed
-- The frontend handles visual locking (blur + lock icon) based on subscriptions
CREATE POLICY "Authenticated users can see all posts in feed"
ON public.posts FOR SELECT
TO authenticated
USING (true);

-- 2. Create post_comments table
CREATE TABLE public.post_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments"
ON public.post_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert comments"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author can delete own comments"
ON public.post_comments FOR DELETE TO authenticated
USING (auth.uid() = author_id);