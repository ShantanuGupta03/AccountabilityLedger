import {
  clientIpHash,
  humanCheck,
  humanCheckError,
  isNonEmptyString,
  json,
  parseCaseId,
  readJson,
} from "../_utils.js";

/**
 * The public half of the RTI response library.
 *
 * GET returns everything a reviewer has published, grouped by case, so the
 * responses page and the case pages can both render from one request.
 *
 * POST takes a reader's account of what a public authority sent back. It is the
 * same shape of contribution as a suggested source and goes through the same
 * queue: nothing here reaches a reader until an editor publishes it.
 */

const MAX_PER_HOUR = 4;
const MAX_UNVERIFIED_PER_HOUR = 2;
const OUTCOMES = new Set(["answered", "partial", "refused", "no_reply"]);

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB
      .prepare(
        `SELECT id, case_id, case_title, authority, applied_on, replied_on,
          outcome, refusal_section, summary, reply_text, document_url, reviewed_at
         FROM rti_responses WHERE status = 'published'
         ORDER BY COALESCE(replied_on, applied_on, created_at) DESC`,
      )
      .all();

    const byCase = {};
    for (const row of results ?? []) {
      (byCase[row.case_id] ??= []).push(row);
    }
    return json({ responses: results ?? [], byCase, count: (results ?? []).length });
  } catch {
    // The library is an enhancement. A database outage must not take the RTI
    // page down with it, so an empty library is the failure mode.
    return json({ responses: [], byCase: {}, count: 0 });
  }
}

export async function onRequestPost(context) {
  if (!context.env.SUBMISSION_HASH_SALT) {
    return json({ error: "The response library is not configured yet." }, 503);
  }

  try {
    const payload = await readJson(context.request);
    const {
      caseId,
      caseTitle = "",
      authority,
      appliedOn = "",
      repliedOn = "",
      outcome,
      refusalSection = "",
      summary,
      replyText = "",
      documentUrl = "",
      redactionConfirmed,
      submitterEmail = "",
      turnstileToken,
      honeypot = "",
      dwellMs,
    } = payload;

    const id = parseCaseId(caseId);
    if (!isNonEmptyString(authority, 300)) {
      throw new TypeError("Name the public authority you asked.");
    }
    if (!OUTCOMES.has(outcome)) {
      throw new TypeError("Say whether the reply answered, partly answered, refused, or never came.");
    }
    if (!isNonEmptyString(summary, 4_000)) {
      throw new TypeError("Summarise what the reply said, in your own words.");
    }
    if (outcome === "refused" && !isNonEmptyString(refusalSection, 60)) {
      throw new TypeError("A refusal names a clause. Give the section it relied on, or pick a different outcome.");
    }
    if (replyText && !isNonEmptyString(replyText, 20_000)) {
      throw new TypeError("Keep the transcription under 20,000 characters.");
    }
    for (const [value, label] of [[appliedOn, "date you applied"], [repliedOn, "date of the reply"]]) {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new TypeError(`Use YYYY-MM-DD for the ${label}, or leave it blank.`);
      }
    }
    if (documentUrl) {
      const url = new URL(documentUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new TypeError("A link to the document must be http or https.");
      }
    }
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      throw new TypeError("Provide a valid email address or leave it blank.");
    }
    // Not a checkbox we can afford to treat as advisory: an RTI reply is
    // addressed to a named private person at their home address.
    if (redactionConfirmed !== true) {
      throw new TypeError("Confirm that your own name and address are removed from anything you are sending.");
    }

    const human = await humanCheck(context, { token: turnstileToken, honeypot, dwellMs });
    if (!human.ok) {
      return json({ error: humanCheckError(human.reason) }, human.reason === "too-fast" ? 429 : 400);
    }

    const ipHash = await clientIpHash(context);
    const recent = await context.env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM rti_responses WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')",
      )
      .bind(ipHash)
      .first();
    if (Number(recent?.count ?? 0) >= (human.verified ? MAX_PER_HOUR : MAX_UNVERIFIED_PER_HOUR)) {
      return json({ error: "Too many responses from this connection. Try again in an hour." }, 429);
    }

    await context.env.DB
      .prepare(
        `INSERT INTO rti_responses (
          id, case_id, case_title, authority, applied_on, replied_on, outcome,
          refusal_section, summary, reply_text, document_url, redaction_confirmed,
          submitter_email, ip_hash, human_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        isNonEmptyString(caseTitle, 240) ? caseTitle.trim() : null,
        authority.trim(),
        appliedOn || null,
        repliedOn || null,
        outcome,
        refusalSection.trim() || null,
        summary.trim(),
        replyText.trim() || null,
        documentUrl.trim() || null,
        1,
        submitterEmail.trim() || null,
        ipHash,
        human.verified ? 1 : 0,
      )
      .run();

    return json({
      message: human.verified
        ? "Thank you. An editor will check it before it appears against the case."
        : "Sent. Human verification could not run in your browser, so this is queued as unverified and an editor will check it by hand.",
    }, 201);
  } catch (error) {
    if (error instanceof TypeError) return json({ error: error.message }, 400);
    console.error("functions/api/rti-responses.js:", error);
    return json({ error: "Unable to record that response." }, 500);
  }
}
