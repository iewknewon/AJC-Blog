CREATE TABLE IF NOT EXISTS novel_projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  premise TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT '',
  writing_goals TEXT NOT NULL DEFAULT '',
  reference_title TEXT,
  reference_summary TEXT,
  reference_notes TEXT,
  world_bible TEXT NOT NULL DEFAULT '',
  character_bible TEXT NOT NULL DEFAULT '',
  outline TEXT NOT NULL DEFAULT '',
  style_guide TEXT NOT NULL DEFAULT '',
  continuity_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'serializing', 'paused', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS novel_reference_sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES novel_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS novel_chapters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  volume_number INTEGER NOT NULL DEFAULT 1,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  continuity_delta TEXT NOT NULL DEFAULT '',
  post_id TEXT,
  post_slug TEXT,
  status TEXT NOT NULL CHECK(status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES novel_projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, volume_number, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_novel_projects_updated_at ON novel_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_novel_reference_sources_project_id ON novel_reference_sources(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_project_id ON novel_chapters(project_id, volume_number DESC, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_post_id ON novel_chapters(post_id);
