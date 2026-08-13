import {
  hash,
  humanCheck,
  humanCheckError,
  isNonEmptyString,
  isValidCategory,
  json,
  parseHttpUrls,
  parseOfficeHolders,
  readJson,
} from "../../_utils.js";

/**
 * Two rate limits, because a submission we could not verify is worth less
 * trust and no more than a trickle. A verified reader gets the normal budget.
 */
const MAX_SUBMISSIONS_PER_HOUR = 3;
const MAX_UNVERIFIED_PER_HOUR = 1;

export async function onRequestPost(context) {
  if (!context.env.TURNSTILE_SECRET_KEY || !context.env.SUBMISSION_HASH_SALT) {
    return json({ error: "Submissions are not configured yet." }, 503);
  }

  try {
    const payload = await readJson(context.request);
    const {
      title,
      incidentDate,
      category,
      summary,
      accountabilityConcern,
      officeHolders = [],
      sourceUrls,
      submitterEmail = "",
      turnstileToken,
      honeypot = "",
      dwellMs,
    } = payload;

    if (!isNonEmptyString(title, 240)) throw new TypeError("Title is required and must be 240 characters or fewer.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate ?? "")) throw new TypeError("Use a valid incident date.");
    if (!isNonEmptyString(category, 100)) throw new TypeError("Choose a category.");
  if (!isValidCategory(category)) throw new TypeError("Choose a category from the list provided.");
    if (!isNonEmptyString(summary, 8_000)) throw new TypeError("Provide a concise incident summary.");
    if (!isNonEmptyString(accountabilityConcern, 5_000)) throw new TypeError("Explain the accountability concern.");
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      throw new TypeError("Provide a valid email address or leave it blank.");
    }
    const sources = parseHttpUrls(sourceUrls);
    const officeHoldersList = parseOfficeHolders(officeHolders);
    const clientIp = context.request.headers.get("CF-Connecting-IP") ?? "unknown";
    const ipHash = await hash(clientIp, context.env.SUBMISSION_HASH_SALT);
    const human = await humanCheck(context, { token: turnstileToken, honeypot, dwellMs });
    if (!human.ok) {
      return json({ error: humanCheckError(human.reason) }, human.reason === "too-fast" ? 429 : 400);
    }

    const recent = await context.env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM submissions WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')",
      )
      .bind(ipHash)
      .first();

    const budget = human.verified ? MAX_SUBMISSIONS_PER_HOUR : MAX_UNVERIFIED_PER_HOUR;
    if (Number(recent.count) >= budget) {
      return json({ error: "Too many submissions from this connection. Try again in an hour." }, 429);
    }

    const id = crypto.randomUUID();
    await context.env.DB
      .prepare(
        `INSERT INTO submissions (
          id, title, incident_date, category, summary, accountability_concern,
          office_holders, source_urls, submitter_email, ip_hash, human_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        title.trim(),
        incidentDate,
        category.trim(),
        summary.trim(),
        accountabilityConcern.trim(),
        JSON.stringify(officeHoldersList),
        JSON.stringify(sources),
        submitterEmail.trim() || null,
        ipHash,
        human.verified ? 1 : 0,
      )
      .run();

    return json({
      id,
      message: human.verified
        ? "Your incident has been submitted for review."
        : "Sent. Human verification could not run in your browser, so this is queued as unverified and a reviewer will look at it by hand.",
    }, 201);
  } catch (error) {
    // TypeError is how this file signals "your input is wrong", and those
    // messages are written to be read. Anything else is ours to fix, and
    // echoing it back would leak internals for no one's benefit.
    if (error instanceof TypeError) return json({ error: error.message }, 400);
    const message = error instanceof Error ? error.message : String(error);
    console.error("functions/api/submissions/index.js:", error);
    if (/no such column:\s*human_verified/i.test(message)) {
      return json({
        error: "The submission database is missing a required migration. "
          + "Run npm run db:migrate:remote on production, or npm run db:migrate:local locally.",
      }, 503);
    }
    return json({ error: "Unable to submit the incident." }, 500);
  }
}
