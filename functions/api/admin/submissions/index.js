import { json, requireReviewer } from "../../../_utils.js";

export async function onRequestGet(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const status = new URL(context.request.url).searchParams.get("status") ?? "pending";
  if (!["pending", "approved", "rejected", "published"].includes(status)) {
    return json({ error: "Unknown submission status." }, 400);
  }

  // The live case json comes along so a reviewer can see and edit exactly what
  // the public is reading, rather than a fresh template built from the raw text.
  const { results } = await context.env.DB
    .prepare(
      `SELECT s.id, s.status, s.title, s.incident_date, s.category, s.summary,
        s.accountability_concern, s.office_holders, s.source_urls, s.submitter_email,
        s.review_notes, s.reviewed_by, s.reviewed_at, s.published_case_id,
        s.created_at, s.updated_at, p.case_json
       FROM submissions s
       LEFT JOIN published_cases p ON p.submission_id = s.id
       WHERE s.status = ? ORDER BY s.created_at ASC`,
    )
    .bind(status)
    .all();

  return json({
    reviewer,
    submissions: results.map(({ case_json: caseJson, ...submission }) => ({
      ...submission,
      office_holders: JSON.parse(submission.office_holders),
      source_urls: JSON.parse(submission.source_urls),
      published_case: caseJson ? JSON.parse(caseJson) : null,
    })),
  });
}
