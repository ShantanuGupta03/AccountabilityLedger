import {
  clientIpHash,
  isNonEmptyString,
  json,
  parseCaseId,
  parseHttpUrls,
  readJson,
  verifyTurnstile,
} from "../_utils.js";

const MAX_SUGGESTIONS_PER_HOUR = 6;

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
    const { caseId, caseTitle = "", url, label, note = "", submitterEmail = "", turnstileToken } = payload;

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
    if (!isNonEmptyString(turnstileToken, 4_000)) {
      throw new TypeError("Complete the human-verification check.");
    }

    const ipHash = await clientIpHash(context);
    const recent = await context.env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM source_suggestions WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')",
      )
      .bind(ipHash)
      .first();
    if (Number(recent.count) >= MAX_SUGGESTIONS_PER_HOUR) {
      return json({ error: "Too many suggestions from this connection. Try again in an hour." }, 429);
    }

    const duplicate = await context.env.DB
      .prepare("SELECT id FROM source_suggestions WHERE case_id = ? AND url = ? AND status != 'rejected'")
      .bind(id, sourceUrl)
      .first();
    if (duplicate) {
      return json({ message: "That link has already been suggested for this case. Thank you." }, 200);
    }

    const human = await verifyTurnstile(
      turnstileToken,
      context.env.TURNSTILE_SECRET_KEY,
      context.request.headers.get("CF-Connecting-IP"),
    );
    if (!human) return json({ error: "Human-verification failed. Please try again." }, 400);

    await context.env.DB
      .prepare(
        `INSERT INTO source_suggestions (id, case_id, case_title, url, label, note, submitter_email, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
      )
      .run();

    return json({ message: "Thank you. An editor will check the link before it appears on the case." }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to suggest that source." }, 400);
  }
}
