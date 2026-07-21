import { isNonEmptyString, json, publicCase, readJson, requireReviewer } from "../../../_utils.js";

export async function onRequestPatch(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  try {
    const { status, reviewNotes = "", caseData } = await readJson(context.request);
    if (!["approved", "rejected", "published"].includes(status)) {
      throw new TypeError("Choose approved, rejected, or published.");
    }
    if (reviewNotes && !isNonEmptyString(reviewNotes, 5_000)) {
      throw new TypeError("Review notes must be 5,000 characters or fewer.");
    }

    const submission = await context.env.DB
      .prepare("SELECT id, published_case_id FROM submissions WHERE id = ?")
      .bind(context.params.id)
      .first();
    if (!submission) return json({ error: "Submission not found." }, 404);

    let publishedCaseId = submission.published_case_id;
    if (status === "published") {
      publishedCaseId ??= `submission-${submission.id}`;
      const published = publicCase(caseData, publishedCaseId);
      await context.env.DB
        .prepare(
          `INSERT INTO published_cases (id, submission_id, case_json, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(submission_id) DO UPDATE SET case_json = excluded.case_json, updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(publishedCaseId, submission.id, JSON.stringify(published))
        .run();
    }

    await context.env.DB
      .prepare(
        `UPDATE submissions
         SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
             published_case_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(status, reviewNotes.trim() || null, reviewer, publishedCaseId, submission.id)
      .run();

    return json({ id: submission.id, status, publishedCaseId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to update the submission." }, 400);
  }
}
