import { isNonEmptyString, json, readJson, requireReviewer } from "../../../_utils.js";

const STATUSES = new Set(["pending", "approved", "rejected", "published"]);

/**
 * Move one response through the queue.
 *
 * "published" is the only status a reader ever sees, and it is deliberately a
 * separate step from "approved": approving says the account looks genuine,
 * publishing says a human has read the document, satisfied themselves that the
 * applicant's own name and address are not in it, and is willing to put it on a
 * case page under this site's name.
 */
export async function onRequestPatch(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  try {
    const { status, reviewNotes = "" } = await readJson(context.request);
    if (!STATUSES.has(status)) throw new TypeError("Unknown status.");
    if (reviewNotes && !isNonEmptyString(reviewNotes, 4_000)) {
      throw new TypeError("Keep review notes under 4,000 characters.");
    }

    const existing = await context.env.DB
      .prepare("SELECT id, redaction_confirmed FROM rti_responses WHERE id = ?")
      .bind(context.params.id)
      .first();
    if (!existing) return json({ error: "Response not found." }, 404);

    // Belt and braces. The reader already had to confirm this before the row was
    // written, so a row failing the check here means something went wrong
    // upstream, and publishing it anyway could expose a private address.
    if (status === "published" && Number(existing.redaction_confirmed) !== 1) {
      return json({ error: "This row has no redaction confirmation. It cannot be published." }, 409);
    }

    await context.env.DB
      .prepare(
        `UPDATE rti_responses
         SET status = ?, review_notes = ?, reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(status, reviewNotes.trim() || null, reviewer, existing.id)
      .run();

    return json({ id: existing.id, status });
  } catch (error) {
    if (error instanceof TypeError) return json({ error: error.message }, 400);
    console.error("functions/api/admin/rti-responses/[id].js:", error);
    return json({ error: "Unable to update the response." }, 500);
  }
}

/** Erase a response outright, for when the stored text must not be kept at all. */
export async function onRequestDelete(context) {
  const reviewer = await requireReviewer(context);
  if (!reviewer) return json({ error: "Reviewer access required." }, 403);

  const existing = await context.env.DB
    .prepare("SELECT id FROM rti_responses WHERE id = ?")
    .bind(context.params.id)
    .first();
  if (!existing) return json({ error: "Response not found." }, 404);

  await context.env.DB.prepare("DELETE FROM rti_responses WHERE id = ?").bind(existing.id).run();
  return json({ id: existing.id, deleted: true });
}
