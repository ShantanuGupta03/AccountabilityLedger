import { json, requireReviewer } from "../../../_utils.js";

const STATUSES = ["pending", "approved", "rejected", "published"];

export async function onRequestGet(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const status = new URL(context.request.url).searchParams.get("status") ?? "pending";
  if (!STATUSES.includes(status)) return json({ error: "Unknown response status." }, 400);

  const { results } = await context.env.DB
    .prepare(
      `SELECT id, case_id, case_title, status, authority, applied_on, replied_on,
        outcome, refusal_section, summary, reply_text, document_url,
        redaction_confirmed, submitter_email, human_verified,
        review_notes, reviewed_by, reviewed_at, created_at, updated_at
       FROM rti_responses WHERE status = ? ORDER BY created_at ASC`,
    )
    .bind(status)
    .all();

  return json({ reviewer, responses: results ?? [] });
}
