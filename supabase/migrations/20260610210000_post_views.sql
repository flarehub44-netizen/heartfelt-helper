-- Post views tracking + performance RPC

CREATE TABLE IF NOT EXISTS post_views (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id   uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can record a view
CREATE POLICY "insert_post_views" ON post_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Creators can read views for their own posts
CREATE POLICY "creator_read_post_views" ON post_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p WHERE p.id = post_id AND p.creator_id = auth.uid()
    )
  );

-- Cached counter on posts for fast display
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- Increment atomically and insert view row
CREATE OR REPLACE FUNCTION track_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO post_views (post_id, viewer_id)
  VALUES (p_post_id, auth.uid());

  UPDATE posts SET views_count = views_count + 1 WHERE id = p_post_id;
END;
$$;

-- RPC: top posts for a creator's dashboard
CREATE OR REPLACE FUNCTION get_creator_post_stats(p_creator_id uuid)
RETURNS TABLE (
  post_id      uuid,
  text         text,
  media_type   text,
  views_count  bigint,
  likes_count  bigint,
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.text,
    p.media_type,
    COALESCE(p.views_count, 0)::bigint,
    COALESCE(p.likes_count, 0)::bigint,
    p.created_at
  FROM posts p
  WHERE p.creator_id = p_creator_id
  ORDER BY p.views_count DESC, p.created_at DESC
  LIMIT 10;
$$;
