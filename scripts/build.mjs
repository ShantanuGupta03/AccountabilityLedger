import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const output = "dist";
const publicPaths = [
  "index.html", "404.html", "_headers", "assets",
  "corrections", "dashboard", "review", "submit", "suggest",
];
const casesPath = "assets/data/cases.json";

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of publicPaths) {
  await cp(path, `${output}/${path}`, { recursive: true });
}

/* The ledger's only real asset is that every published claim is citable, so the
   build is the gate: drafts never ship, unlinked sources never render, and a
   case that would go out with nothing to cite fails the deploy outright. */
const allCases = JSON.parse(await readFile(casesPath, "utf8"));
const drafts = allCases.filter((caseFile) => caseFile.status === "draft");
const unsourced = [];

const published = allCases
  .filter((caseFile) => caseFile.status !== "draft")
  .map(({ status, ...caseFile }) => {
    const sources = (caseFile.sources ?? []).filter((source) => source.todo !== true);
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

// Drafts are stripped from the shipped data, so the page cannot count them
// itself. With nothing held back the disclosure is dropped rather than zeroed.
const home = await readFile(`${output}/index.html`, "utf8");
await writeFile(
  `${output}/index.html`,
  drafts.length === 0
    ? home.replace(/\s*<p class="fine">Cases held back[^]*?<\/p>/, "")
    : home.replace('<span id="stat-drafts">--</span>', `<span id="stat-drafts">${drafts.length}</span>`),
  "utf8",
);

const droppedSources = allCases.reduce((total, caseFile) => total
  + (caseFile.status === "draft" ? 0 : (caseFile.sources ?? []).filter((source) => source.todo).length), 0);

console.log(
  `Built ${published.length} cases (${drafts.length} draft(s) held back, `
  + `${droppedSources} unlinked source(s) dropped)`,
);

// Every correction, right-of-reply and legal notice arrives through this one
// address, so a build that would ship without it is a build worth stopping.
const corrections = await readFile("corrections/index.html", "utf8");
if (!/href="mailto:[^"]+@[^".]+\.[^"]+"/.test(corrections)) {
  throw new Error("corrections/index.html has no contact address for corrections and legal notices.");
}
