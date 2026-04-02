CREATE TABLE IF NOT EXISTS user_verse_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_verse_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_verse_cards_select" ON user_verse_cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_verse_cards_insert" ON user_verse_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_verse_cards_delete" ON user_verse_cards
  FOR DELETE USING (auth.uid() = user_id);
