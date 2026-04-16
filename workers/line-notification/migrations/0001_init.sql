-- Notification history (replaces GAS Spreadsheet "NotificationLog")
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  to_id TEXT NOT NULL,
  pattern_id TEXT,
  pattern_label TEXT,
  arrival TEXT,
  dinner_key TEXT,
  dinner_label TEXT,
  has_schedule INTEGER NOT NULL,
  schedule_time TEXT,
  schedule_detail TEXT,
  sent_text TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_id ON notification_log (id);
