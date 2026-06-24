-- Real-time chat for live streams

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id  uuid NOT NULL REFERENCES creator_lives(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text     text NOT NULL CHECK (char_length(text) <= 300),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can send messages
CREATE POLICY "auth_insert_live_chat" ON live_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anyone can read chat (access controlled in app by plan gating)
CREATE POLICY "anyone_read_live_chat" ON live_chat_messages
  FOR SELECT USING (true);

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_messages;
