-- Sources suggested by readers. Nothing here reaches the ledger until a reviewer approves it.

CREATE TABLE IF NOT EXISTS source_suggestions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT,
  submitter_email TEXT,
  ip_hash TEXT NOT NULL,
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS source_suggestions_status_created_at
  ON source_suggestions(status, created_at ASC);

CREATE INDEX IF NOT EXISTS source_suggestions_case_status
  ON source_suggestions(case_id, status);

CREATE INDEX IF NOT EXISTS source_suggestions_ip_hash_created_at
  ON source_suggestions(ip_hash, created_at DESC);
