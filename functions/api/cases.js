import { json } from "../_utils.js";

export async function onRequestGet(context) {
  const { results } = await context.env.DB
    .prepare("SELECT id, case_json FROM published_cases ORDER BY published_at ASC")
    .all();

  const cases = results.flatMap((row) => {
    try {
      return [{ ...JSON.parse(row.case_json), id: row.id }];
    } catch {
      return [];
    }
  });

  return new Response(JSON.stringify({ cases }), {
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      "x-content-type-options": "nosniff",
    },
  });
}
