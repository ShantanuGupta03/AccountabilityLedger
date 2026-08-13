-- The RTI response library.
--
-- The generator at /rti/ hands a reader a letter and then loses interest. This
-- table is the other half: what the government actually said back.
--
-- Why it matters more than it looks. Of 194 sources on this ledger, 23 are
-- tier-1 primary records; 66 of 84 cases rest on reporting alone, which is
-- exactly the flank a government uses to wave a case away as media narrative. A
-- reply on a ministry's letterhead is a primary record, and it is one that does
-- not otherwise exist on the internet. So is a refusal: "denied under 8(1)(a)"
-- is itself the story, and the generated letter already forces the officer to
-- name the clause under Section 7(8).
--
-- Nothing here is public until a reviewer publishes it, and nothing is published
-- until the reader has confirmed they removed their own name and address from
-- the document — an RTI reply is addressed to a named private individual at
-- their home, and republishing that unredacted would be a real harm done by a
-- site whose entire argument is about how power treats people.

CREATE TABLE IF NOT EXISTS rti_responses (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'published')),

  -- Which case this answers. Matches the frozen case id, not the display number.
  case_id TEXT NOT NULL,
  case_title TEXT,

  -- Who was asked, and when.
  authority TEXT NOT NULL,
  applied_on TEXT,
  replied_on TEXT,

  -- What came back. 'no_reply' is a legitimate and common outcome: silence past
  -- the Section 7(1) deadline is a deemed refusal, and worth recording as one.
  outcome TEXT NOT NULL
    CHECK (outcome IN ('answered', 'partial', 'refused', 'no_reply')),
  -- The clause relied on, where the reply names one, e.g. "8(1)(a)".
  refusal_section TEXT,

  -- The reader's account of what the reply said, and optionally the text itself.
  summary TEXT NOT NULL,
  reply_text TEXT,
  -- A link to a copy the reader has already put somewhere reachable. A reviewer
  -- verifies it, archives it, and attaches it to the case as a source.
  document_url TEXT,

  -- Set by the reader before they can send. See the note above.
  redaction_confirmed INTEGER NOT NULL DEFAULT 0,

  submitter_email TEXT,
  ip_hash TEXT NOT NULL,
  human_verified INTEGER NOT NULL DEFAULT 1,

  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rti_responses_status_created_at
  ON rti_responses(status, created_at ASC);

CREATE INDEX IF NOT EXISTS rti_responses_case_status
  ON rti_responses(case_id, status);

CREATE INDEX IF NOT EXISTS rti_responses_ip_created_at
  ON rti_responses(ip_hash, created_at DESC);
