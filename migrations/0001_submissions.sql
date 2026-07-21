CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  title TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  accountability_concern TEXT NOT NULL,
  office_holders TEXT NOT NULL DEFAULT '[]',
  source_urls TEXT NOT NULL,
  submitter_email TEXT,
  ip_hash TEXT NOT NULL,
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  published_case_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS submissions_status_created_at
  ON submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS submissions_ip_hash_created_at
  ON submissions(ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS published_cases (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE REFERENCES submissions(id),
  case_json TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
