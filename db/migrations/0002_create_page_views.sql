CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  post_slug TEXT,
  ip_hash TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  continent TEXT,
  colo TEXT,
  user_agent TEXT,
  referer TEXT,
  visited_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON page_views(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_post_slug ON page_views(post_slug);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);
CREATE INDEX IF NOT EXISTS idx_page_views_ip_hash ON page_views(ip_hash);
