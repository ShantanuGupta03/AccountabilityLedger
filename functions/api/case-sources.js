import {
  clientIpHash,
  humanCheck,
  humanCheckError,
  isNonEmptyString,
  json,
  parseCaseId,
  parseHttpUrls,
  readJson,
} from "../_utils.js";

/** A suggestion we could not verify still gets in, but only a couple an hour. */
const MAX_SUGGESTIONS_PER_HOUR = 6;
const MAX_UNVERIFIED_PER_HOUR = 2;

/** Reader-supplied sources an editor has approved, grouped by case for the ledger page. */
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB
      .prepare(
        `SELECT case_id, label, url FROM source_suggestions
         WHERE status = 'approved' ORDER BY reviewed_at ASC`,
      )
      .all();

    const sources = {};
    for (const row of results ?? []) {
      (sources[row.case_id] ??= []).push({ label: row.label, url: row.url });
    }
    return json({ sources });
  } catch {
    // The ledger has to render without the database, so an outage returns nothing.
    return json({ sources: {} });
  }
}

export async function onRequestPost(context) {
  if (!context.env.TURNSTILE_SECRET_KEY || !context.env.SUBMISSION_HASH_SALT) {
    return json({ error: "Source suggestions are not configured yet." }, 503);
  }

  try {
    const payload = await readJson(context.request);
    const {
      caseId, caseTitle = "", url, label, note = "", submitterEmail = "",
      turnstileToken, honeypot = "", dwellMs,
    } = payload;

    const id = parseCaseId(caseId);
    const [sourceUrl] = parseHttpUrls([url], 1);
    if (!isNonEmptyString(label, 60)) {
      throw new TypeError("Give the source a short label of 60 characters or fewer.");
    }
    if (note && !isNonEmptyString(note, 1_000)) {
      throw new TypeError("Keep the note under 1,000 characters.");
    }
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      throw new TypeError("Provide a valid email address or leave it blank.");
    }
    const human = await humanCheck(context, { token: turnstileToken, honeypot, dwellMs });
    if (!human.ok) {
      return json({ error: humanCheckError(human.reason) }, human.reason === "too-fast" ? 429 : 400);
    }

    const ipHash = await clientIpHash(context);
    const recent = await context.env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM source_suggestions WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')",
      )
      .bind(ipHash)
      .first();
    if (Number(recent.count) >= (human.verified ? MAX_SUGGESTIONS_PER_HOUR : MAX_UNVERIFIED_PER_HOUR)) {
      return json({ error: "Too many suggestions from this connection. Try again in an hour." }, 429);
    }

    const duplicate = await context.env.DB
      .prepare("SELECT id FROM source_suggestions WHERE case_id = ? AND url = ? AND status != 'rejected'")
      .bind(id, sourceUrl)
      .first();
    if (duplicate) {
      return json({ message: "That link has already been suggested for this case. Thank you." }, 200);
    }

    await context.env.DB
      .prepare(
        `INSERT INTO source_suggestions (id, case_id, case_title, url, label, note, submitter_email, ip_hash, human_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        isNonEmptyString(caseTitle, 240) ? caseTitle.trim() : null,
        sourceUrl,
        label.trim(),
        note.trim() || null,
        submitterEmail.trim() || null,
        ipHash,
        human.verified ? 1 : 0,
      )
      .run();

    return json({ message: "Thank you. An editor will check the link before it appears on the case." }, 201);
  } catch (error) {
    // TypeError is how this file signals "your input is wrong", and those
    // messages are written to be read. Anything else is ours to fix, and
    // echoing it back would leak internals for no one's benefit.
    if (error instanceof TypeError) return json({ error: error.message }, 400);
    console.error("functions/api/case-sources.js:", error);
    return json({ error: "Unable to suggest that source." }, 500);
  }
}
