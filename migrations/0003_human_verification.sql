-- Human verification is best-effort, not a gate.
--
-- Turnstile fails to load for a non-trivial share of real readers: a blocked
-- challenges.cloudflare.com, a captive portal, a privacy browser, a flaky
-- mobile connection. Treating that as "you may not contribute" quietly hands
-- the ledger's editorial input to whoever happens to have a clean network,
-- which is the opposite of what a community-run record needs.
--
-- So a submission with no Turnstile token is still accepted, under a tighter
-- rate limit and with this column set to 0. Nothing publishes without a
-- reviewer either way; this only tells the reviewer how much weight to give
-- the row before they read it.

ALTER TABLE submissions ADD COLUMN human_verified INTEGER NOT NULL DEFAULT 1;
ALTER TABLE source_suggestions ADD COLUMN human_verified INTEGER NOT NULL DEFAULT 1;
