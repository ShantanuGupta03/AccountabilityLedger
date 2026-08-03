import {
  hash,
  isNonEmptyString,
  json,
  parseHttpUrls,
  parseOfficeHolders,
  readJson,
  verifyHuman,
} from "../../_utils.js";

const MAX_SUBMISSIONS_PER_HOUR = 3;

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
    } = payload;

    if (!isNonEmptyString(title, 240)) throw new TypeError("Title is required and must be 240 characters or fewer.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate ?? "")) throw new TypeError("Use a valid incident date.");
    if (!isNonEmptyString(category, 100)) throw new TypeError("Choose a category.");
    if (!isNonEmptyString(summary, 8_000)) throw new TypeError("Provide a concise incident summary.");
    if (!isNonEmptyString(accountabilityConcern, 5_000)) throw new TypeError("Explain the accountability concern.");
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      throw new TypeError("Provide a valid email address or leave it blank.");
    }
    if (!isNonEmptyString(turnstileToken, 4_000)) throw new TypeError("Complete the human-verification check.");

    const sources = parseHttpUrls(sourceUrls);
    const officeHoldersList = parseOfficeHolders(officeHolders);
    const clientIp = context.request.headers.get("CF-Connecting-IP") ?? "unknown";
    const ipHash = await hash(clientIp, context.env.SUBMISSION_HASH_SALT);
    const recent = await context.env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM submissions WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')",
      )
      .bind(ipHash)
      .first();

    if (Number(recent.count) >= MAX_SUBMISSIONS_PER_HOUR) {
      return json({ error: "Too many submissions from this connection. Try again in an hour." }, 429);
    }

    const human = await verifyHuman(context, turnstileToken);
    if (!human) return json({ error: "Human-verification failed. Please try again." }, 400);

    const id = crypto.randomUUID();
    await context.env.DB
      .prepare(
        `INSERT INTO submissions (
          id, title, incident_date, category, summary, accountability_concern,
          office_holders, source_urls, submitter_email, ip_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      )
      .run();

    return json({ id, message: "Your incident has been submitted for review." }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to submit the incident." }, 400);
  }
}
