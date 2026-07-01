CREATE TABLE IF NOT EXISTS users (
  line_user_id TEXT PRIMARY KEY,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_line_id TEXT NOT NULL,
  type TEXT NOT NULL,
  line_id TEXT NOT NULL,
  label TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_destinations_user ON destinations (user_line_id);

CREATE TABLE IF NOT EXISTS time_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_line_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  arrival_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_time_patterns_user ON time_patterns (user_line_id);

CREATE TABLE IF NOT EXISTS usage_monthly (
  user_line_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  send_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_line_id, year_month)
);
