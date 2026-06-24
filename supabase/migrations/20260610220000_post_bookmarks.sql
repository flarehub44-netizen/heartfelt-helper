-- Bookmarks (saved posts)

CREATE TABLE IF NOT EXISTS post_bookmarks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_bookmarks" ON post_bookmarks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
