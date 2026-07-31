import { isNonEmptyString, json, readJson, requireReviewer } from "../../../_utils.js";

export async function onRequestPatch(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  try {
    const { status, reviewNotes = "", label } = await readJson(context.request);
    if (!["approved", "rejected"].includes(status)) {
      throw new TypeError("Choose approved or rejected.");
    }
    if (reviewNotes && !isNonEmptyString(reviewNotes, 5_000)) {
      throw new TypeError("Review notes must be 5,000 characters or fewer.");
    }
    if (label !== undefined && !isNonEmptyString(label, 60)) {
      throw new TypeError("The label must be 60 characters or fewer.");
    }

    const suggestion = await context.env.DB
      .prepare("SELECT id, label FROM source_suggestions WHERE id = ?")
      .bind(context.params.id)
      .first();
    if (!suggestion) return json({ error: "Suggestion not found." }, 404);

    await context.env.DB
      .prepare(
        `UPDATE source_suggestions
         SET status = ?, label = ?, review_notes = ?, reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        status,
        label === undefined ? suggestion.label : label.trim(),
        reviewNotes.trim() || null,
        reviewer,
        suggestion.id,
      )
      .run();

    return json({ id: suggestion.id, status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to update the suggestion." }, 400);
  }
}

/** Erase a suggested source outright. Rejecting one already pulls it from the
 *  public case; this is for when the stored url or note must not be kept. */
export async function onRequestDelete(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const suggestion = await context.env.DB
    .prepare("SELECT id FROM source_suggestions WHERE id = ?")
    .bind(context.params.id)
    .first();
  if (!suggestion) return json({ error: "Suggestion not found." }, 404);

  await context.env.DB.prepare("DELETE FROM source_suggestions WHERE id = ?").bind(suggestion.id).run();
  return json({ id: suggestion.id, deleted: true });
}
