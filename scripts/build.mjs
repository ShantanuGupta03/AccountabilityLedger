import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { generatePages } from "./generate_pages.mjs";

const output = "dist";
const publicPaths = [
  "index.html", "404.html", "_headers", "assets",
  "corrections", "dashboard", "review", "submit", "suggest",
];
const casesPath = "assets/data/cases.json";
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
const drafts = allCases.filter((caseFile) => caseFile.status === "draft");
const unsourced = [];

const enrichSource = (source) => {
  const entry = archives[source.url];
  if (!entry?.archiveUrl) return source;
  return { ...source, archiveUrl: entry.archiveUrl };
};

const published = allCases
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
await generatePages(published, output);

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
const droppedSources = allCases.reduce((total, caseFile) => total
  + (caseFile.status === "draft" ? 0 : (caseFile.sources ?? []).filter((source) => source.todo).length), 0);

console.log(
  `Built ${published.length} cases (${drafts.length} draft(s) held back, `
  + `${droppedSources} unlinked source(s) dropped, ${archived}/${totalSources} with archive links)`,
);

const corrections = await readFile("corrections/index.html", "utf8");
if (!/href="mailto:[^"]+@[^".]+\.[^"]+"/.test(corrections)) {
  throw new Error("corrections/index.html has no contact address for corrections and legal notices.");
}
