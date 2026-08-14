import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { generatePages } from "./generate_pages.mjs";

const output = "dist";
// wrangler.jsonc sets pages_build_output_dir to ./dist, so this directory *is*
// the deployment. Pages looks for the Functions directory at the root of what it
// deploys, which means "functions" has to be copied across or the whole API
// silently 404s: no /api/cases, no /api/public-config, no submissions, no review
// console. Everything here ships; nothing else does.
const publicPaths = [
  "index.html", "404.html", "_headers", "_redirects", "assets", "functions",
  "about", "corrections", "dashboard", "review", "rti", "submit",
];
const casesPath = "assets/data/cases.json";
const overlayPath = "assets/data/published-overlay.json";
const archivesPath = "assets/data/archives.json";

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of publicPaths) {
  await cp(path, `${output}/${path}`, { recursive: true });
}

let archives = {};
try {
  archives = JSON.parse(await readFile(archivesPath, "utf8"));
} catch {
  console.warn("No archives manifest yet. Run `npm run archive` after adding sources.");
}

const allCases = JSON.parse(await readFile(casesPath, "utf8"));
let overlayCases = [];
try {
  overlayCases = JSON.parse(await readFile(overlayPath, "utf8"));
  if (!Array.isArray(overlayCases)) overlayCases = [];
} catch {
  overlayCases = [];
}
const staticIds = new Set(allCases.map((caseFile) => caseFile.id ?? `case-${caseFile.no}`));
const mergedCases = [
  ...allCases,
  ...overlayCases.filter((caseFile) => {
    const id = caseFile?.id ?? (caseFile?.no ? `case-${caseFile.no}` : null);
    return id && !staticIds.has(id);
  }),
];
const drafts = mergedCases.filter((caseFile) => caseFile.status === "draft");
const unsourced = [];

const enrichSource = (source) => {
  const entry = archives[source.url];
  if (!entry?.archiveUrl) return source;
  return { ...source, archiveUrl: entry.archiveUrl };
};

const published = mergedCases
  .filter((caseFile) => caseFile.status !== "draft")
  .map(({ status, ...caseFile }) => {
    const sources = (caseFile.sources ?? [])
      .filter((source) => source.todo !== true)
      .map(enrichSource);
    if (sources.length === 0) unsourced.push(`  case ${caseFile.no}: ${caseFile.title}`);
    return { ...caseFile, sources };
  });

if (unsourced.length > 0) {
  throw new Error(
    `${unsourced.length} case(s) would publish with no citable source:\n${unsourced.join("\n")}\n` +
    `Add a real source url, or set "status": "draft" to hold the case back.`,
  );
}

await writeFile(`${output}/${casesPath}`, JSON.stringify(published), "utf8");
await writeFile(`${output}/${archivesPath}`, JSON.stringify(archives), "utf8");
await writeFile(`${output}/${overlayPath}`, JSON.stringify(overlayCases), "utf8");
await generatePages(published, output);

// The editor console is behind Cloudflare Access, but it has no business in a
// search index either — a login wall in results is noise, and advertising the
// door is a courtesy nobody asked us to extend.
const robots = `User-agent: *
Allow: /
Disallow: /review/

Sitemap: ${(process.env.SITE_URL ?? "https://whoisresponsible.xyz").replace(/\/$/, "")}/sitemap.xml
`;
await writeFile(`${output}/robots.txt`, robots, "utf8");

const home = await readFile(`${output}/index.html`, "utf8");
await writeFile(
  `${output}/index.html`,
  drafts.length === 0
    ? home.replace(/\s*<p class="fine">Cases held back[^]*?<\/p>/, "")
    : home.replace('<span id="stat-drafts">--</span>', `<span id="stat-drafts">${drafts.length}</span>`),
  "utf8",
);

const archived = published.flatMap((c) => c.sources ?? []).filter((s) => s.archiveUrl).length;
const totalSources = published.flatMap((c) => c.sources ?? []).length;
const droppedSources = mergedCases.reduce((total, caseFile) => total
  + (caseFile.status === "draft" ? 0 : (caseFile.sources ?? []).filter((source) => source.todo).length), 0);

console.log(
  `Built ${published.length} cases (${drafts.length} draft(s) held back, `
  + `${overlayCases.length ? `${overlayCases.length} from published overlay, ` : ""}`
  + `${droppedSources} unlinked source(s) dropped, ${archived}/${totalSources} with archive links)`,
);

const corrections = await readFile("corrections/index.html", "utf8");
if (!/href="mailto:[^"]+@[^".]+\.[^"]+"/.test(corrections)) {
  throw new Error("corrections/index.html has no contact address for corrections and legal notices.");
}

// The API shipping is not optional: without it the submission form, the review
// console and the published-case feed all fail with a 404 that looks like a
// front-end bug. Fail the build here rather than discover it in production.
const requiredFunctions = [
  "functions/api/public-config.js",
  "functions/api/cases.js",
  "functions/api/submissions/index.js",
  "functions/api/admin/submissions/index.js",
  "functions/api/rti-responses.js",
  "functions/api/admin/rti-responses/index.js",
];
for (const path of requiredFunctions) {
  try {
    await readFile(`${output}/${path}`, "utf8");
  } catch {
    throw new Error(
      `${path} is missing from ${output}/. Cloudflare Pages serves ${output}/ and reads its Functions `
      + `from ${output}/functions, so the API would 404. Add it to publicPaths in scripts/build.mjs.`,
    );
  }
}
