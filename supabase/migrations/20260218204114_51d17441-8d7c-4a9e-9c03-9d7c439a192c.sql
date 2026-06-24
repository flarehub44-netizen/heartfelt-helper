
CREATE TABLE public.follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (fan_id, creator_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are public" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Fans can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans can unfollow" ON public.follows FOR DELETE USING (auth.uid() = fan_id);
