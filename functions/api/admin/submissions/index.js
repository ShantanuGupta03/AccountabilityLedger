import { json, requireReviewer } from "../../../_utils.js";

export async function onRequestGet(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const status = new URL(context.request.url).searchParams.get("status") ?? "pending";
  if (!["pending", "approved", "rejected", "published"].includes(status)) {
    return json({ error: "Unknown submission status." }, 400);
  }

  const { results } = await context.env.DB
    .prepare(
      `SELECT id, status, title, incident_date, category, summary, accountability_concern,
        office_holders, source_urls, submitter_email, review_notes, reviewed_by,
        reviewed_at, published_case_id, created_at, updated_at
       FROM submissions WHERE status = ? ORDER BY created_at ASC`,
    )
    .bind(status)
    .all();

  return json({
    reviewer,
    submissions: results.map((submission) => ({
      ...submission,
      office_holders: JSON.parse(submission.office_holders),
      source_urls: JSON.parse(submission.source_urls),
    })),
  });
}
