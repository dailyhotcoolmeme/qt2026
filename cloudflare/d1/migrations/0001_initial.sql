CREATE TABLE IF NOT EXISTS bible_audio_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  testament TEXT,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  verse_timings TEXT,
  duration INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bible_audio_metadata_book_chapter
  ON bible_audio_metadata (book_id, chapter);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription TEXT NOT NULL,
  user_agent TEXT,
  last_error TEXT,
  last_success_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS app_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_path TEXT NOT NULL DEFAULT '/',
  event_key TEXT,
  payload TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created_at
  ON app_notifications (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_notifications_user_event_key
  ON app_notifications (user_id, event_key);
