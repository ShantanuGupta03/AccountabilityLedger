import { json, requireReviewer } from "../../../_utils.js";

export async function onRequestGet(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const status = new URL(context.request.url).searchParams.get("status") ?? "pending";
  if (!["pending", "approved", "rejected"].includes(status)) {
    return json({ error: "Unknown suggestion status." }, 400);
  }

  const { results } = await context.env.DB
    .prepare(
      `SELECT id, case_id, case_title, status, url, label, note, submitter_email,
        review_notes, reviewed_by, reviewed_at, created_at, updated_at
       FROM source_suggestions WHERE status = ? ORDER BY created_at ASC`,
    )
    .bind(status)
    .all();

  return json({ reviewer, suggestions: results ?? [] });
}
