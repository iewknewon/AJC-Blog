CREATE TABLE IF NOT EXISTS learning_chat_requests (
  id TEXT PRIMARY KEY,
  ip_hash TEXT,
  subject TEXT NOT NULL,
  lesson_slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_chat_requests_ip_hash_created_at
  ON learning_chat_requests(ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_chat_requests_lesson_created_at
  ON learning_chat_requests(lesson_slug, created_at DESC);
