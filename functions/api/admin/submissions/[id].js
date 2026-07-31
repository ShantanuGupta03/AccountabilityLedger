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
    } else {
      // Moving off "published" is the retraction route: drop the row that
      // /api/cases serves so the case leaves the public ledger immediately.
      await context.env.DB
        .prepare("DELETE FROM published_cases WHERE submission_id = ?")
        .bind(submission.id)
        .run();
      publishedCaseId = null;
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

/** Erase a submission and anything it published. For legal demands and for
 *  private personal data, where retracting the case is not enough and the
 *  stored copy has to go too. Unpublishing is the reversible PATCH above. */
export async function onRequestDelete(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const submission = await context.env.DB
    .prepare("SELECT id FROM submissions WHERE id = ?")
    .bind(context.params.id)
    .first();
  if (!submission) return json({ error: "Submission not found." }, 404);

  await context.env.DB.batch([
    context.env.DB.prepare("DELETE FROM published_cases WHERE submission_id = ?").bind(submission.id),
    context.env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(submission.id),
  ]);

  return json({ id: submission.id, deleted: true });
}
