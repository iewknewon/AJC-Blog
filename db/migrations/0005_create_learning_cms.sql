CREATE TABLE IF NOT EXISTS learning_tracks (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  description TEXT NOT NULL,
  stage_slug TEXT NOT NULL,
  eyebrow TEXT NOT NULL DEFAULT 'Learning Track',
  color_token TEXT NOT NULL DEFAULT 'learning',
  icon TEXT NOT NULL DEFAULT 'LR',
  page_variant TEXT NOT NULL DEFAULT 'default' CHECK(page_variant IN ('default', 'timeline')),
  learning_path_json TEXT NOT NULL DEFAULT '[]',
  concept_overview_json TEXT,
  source_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_lessons (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  lesson_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 10,
  objectives_json TEXT NOT NULL DEFAULT '[]',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  chat_context_summary TEXT NOT NULL DEFAULT '',
  related_lesson_slugs_json TEXT NOT NULL DEFAULT '[]',
  animation_kind TEXT NOT NULL,
  hero_summary TEXT NOT NULL DEFAULT '',
  sections_json TEXT NOT NULL DEFAULT '[]',
  misconceptions_json TEXT NOT NULL DEFAULT '[]',
  quiz_json TEXT NOT NULL DEFAULT '[]',
  quick_prompts_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (track_id) REFERENCES learning_tracks(id) ON DELETE CASCADE,
  UNIQUE(track_id, lesson_slug),
  UNIQUE(track_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_learning_tracks_stage ON learning_tracks(stage_slug, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_lessons_track ON learning_lessons(track_id, order_index ASC, updated_at DESC);
