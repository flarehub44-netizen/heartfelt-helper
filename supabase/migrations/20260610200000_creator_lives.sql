-- Lives / transmissões ao vivo dos criadores
CREATE TABLE IF NOT EXISTS public.creator_lives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  stream_url text,
  thumbnail_url text,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled | live | ended
  min_plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lives"
  ON public.creator_lives FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Creators manage own lives"
  ON public.creator_lives FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE INDEX IF NOT EXISTS creator_lives_creator_id_idx
  ON public.creator_lives(creator_id, scheduled_at DESC);
