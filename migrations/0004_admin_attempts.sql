-- Brute-force throttle for the solo-admin review secret.
--
-- The shared secret at /review/ is the only credential on this site that is not
-- a signed token, so it is the only one worth guessing at. Access is the real
-- gate in production; this exists so that the fallback is not an unlimited
-- guessing gallery while Access is being set up.
--
-- Only failed attempts are written. A successful unlock is not a security event
-- and logging it would build a record of when the operator was working.

CREATE TABLE IF NOT EXISTS admin_attempts (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_attempts_ip_created_at
  ON admin_attempts(ip_hash, created_at DESC);
