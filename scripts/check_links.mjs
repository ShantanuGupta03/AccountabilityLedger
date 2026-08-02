/**
 * Verify that every source URL in cases.json actually resolves.
 *
 * The ledger's promise is that any claim can be opened and checked, and
 * scripts/build.mjs already refuses to publish a case with no source. This
 * closes the remaining gap: it confirms the URLs are live rather than merely
 * present, which matters for cases drafted somewhere without network access.
 *
 *   node scripts/check_links.mjs              report on every case
 *   node scripts/check_links.mjs --drafts     only cases held back as drafts
 *   node scripts/check_links.mjs --promote    ...and publish the ones that pass
 *
 * --promote clears "status": "draft" on a case only when every one of its
 * sources answered. A case with even one dead link stays held back.
 */
import { readFile, writeFile } from "node:fs/promises";

const CASES = "assets/data/cases.json";
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;

const args = new Set(process.argv.slice(2));
const draftsOnly = args.has("--drafts") || args.has("--promote");
const promote = args.has("--promote");

const caseId = (c) => c.id ?? `case-${c.no}`;

/** HEAD first; some sites reject it, so fall back to a ranged GET. */
async function probe(url) {
  for (const init of [{ method: "HEAD" }, { method: "GET", headers: { Range: "bytes=0-2048" } }]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          // Several publishers 403 an unrecognised agent regardless of method.
          "User-Agent": "Mozilla/5.0 (compatible; AccountabilityLedger-linkcheck/1.0)",
          ...(init.headers ?? {}),
        },
      });
      if (response.ok || response.status === 206) return { ok: true, status: response.status };
      if (init.method === "GET") return { ok: false, status: response.status };
    } catch (error) {
      if (init.method === "GET") return { ok: false, status: error.name === "AbortError" ? "timeout" : "unreachable" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: "unreachable" };
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await worker(items[index]);
    }
  }));
  return out;
}

const cases = JSON.parse(await readFile(CASES, "utf8"));
const selected = cases.filter((c) => (draftsOnly ? c.status === "draft" : true));

if (selected.length === 0) {
  console.log(draftsOnly ? "No draft cases to check." : "No cases found.");
  process.exit(0);
}

const targets = selected.flatMap((c) =>
  (c.sources ?? [])
    .filter((s) => s.todo !== true && typeof s.url === "string")
    .map((s) => ({ no: c.no, id: caseId(c), label: s.label, url: s.url })));

console.log(`Checking ${targets.length} source URL(s) across ${selected.length} case(s)...\n`);

const results = await mapLimit(targets, CONCURRENCY, async (t) => ({ ...t, ...(await probe(t.url)) }));

const byCase = new Map();
for (const r of results) {
  if (!byCase.has(r.no)) byCase.set(r.no, []);
  byCase.get(r.no).push(r);
}

let dead = 0;
const clean = [];
for (const c of selected) {
  const rows = byCase.get(c.no) ?? [];
  const bad = rows.filter((r) => !r.ok);
  dead += bad.length;
  const mark = bad.length === 0 ? "OK  " : "DEAD";
  console.log(`${mark} case ${c.no}: ${c.title.slice(0, 58)}`);
  for (const r of bad) console.log(`       ${r.status}  ${r.url}`);
  if (rows.length > 0 && bad.length === 0) clean.push(c.no);
}

console.log(`\n${results.length - dead}/${results.length} URLs live. ${clean.length} case(s) fully verified.`);

if (promote) {
  const promotable = new Set(clean);
  let changed = 0;
  for (const c of cases) {
    if (c.status === "draft" && promotable.has(c.no)) {
      delete c.status;
      changed += 1;
    }
  }
  if (changed > 0) {
    await writeFile(CASES, `${JSON.stringify(cases, null, 1)}\n`, "utf8");
    console.log(`Promoted ${changed} case(s) to published. Run the validator and build next.`);
  } else {
    console.log("Nothing promoted; no draft passed with all sources live.");
  }
}

process.exit(dead > 0 ? 1 : 0);
