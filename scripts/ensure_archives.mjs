/**
 * Build or refresh assets/data/archives.json — a url → snapshot map.
 *
 * For each citation we first ask the Wayback Machine whether a snapshot already
 * exists. Only when none does we trigger a Save Page Now request (slow, so this
 * runs as `npm run archive`, not on every build). Re-run after adding sources.
 */
import { readFile, writeFile } from "node:fs/promises";

const CASES_PATH = "assets/data/cases.json";
const ARCHIVES_PATH = "assets/data/archives.json";
const USER_AGENT = "AccountabilityLedger/1.0 (citation archiver; +https://github.com/ShantanuGupta03/AccountabilityLedger)";
const PAUSE_MS = 1200;

const quick = process.argv.includes("--quick");
const pauseMs = quick ? 300 : PAUSE_MS;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function collectUrls(cases) {
  const urls = new Set();
  for (const caseFile of cases) {
    for (const source of caseFile.sources ?? []) {
      if (source.url && !source.todo) urls.add(source.url);
    }
  }
  return [...urls];
}

async function waybackAvailable(url) {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  const response = await fetch(api, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) return null;
  const payload = await response.json();
  const snap = payload?.archived_snapshots?.closest;
  if (!snap?.available || !snap.url) return null;
  return { archiveUrl: snap.url, archivedAt: snap.timestamp, provider: "wayback" };
}

async function waybackSave(url) {
  const save = `https://web.archive.org/save/${url}`;
  const response = await fetch(save, {
    redirect: "manual",
    headers: { "user-agent": USER_AGENT },
  });
  const location = response.headers.get("location");
  if (location?.includes("web.archive.org/web/")) {
    return { archiveUrl: location, archivedAt: new Date().toISOString().slice(0, 10).replace(/-/g, ""), provider: "wayback-save" };
  }
  return null;
}

async function ensureArchive(url, manifest) {
  if (manifest[url]?.archiveUrl) return manifest[url];

  const existing = await waybackAvailable(url);
  if (existing) return existing;
  if (quick) return null;

  await sleep(pauseMs);
  const saved = await waybackSave(url);
  if (saved) return saved;

  return null;
}

const cases = JSON.parse(await readFile(CASES_PATH, "utf8"));
let manifest = {};
try {
  manifest = JSON.parse(await readFile(ARCHIVES_PATH, "utf8"));
} catch {
  manifest = {};
}

const urls = collectUrls(cases);
let added = 0;
let missing = 0;

for (const url of urls) {
  if (manifest[url]?.archiveUrl) continue;
  process.stdout.write(`archiving ${url.slice(0, 72)}… `);
  const entry = await ensureArchive(url, manifest);
  if (entry) {
    manifest[url] = { ...entry, checkedAt: new Date().toISOString() };
    added += 1;
    console.log("ok");
  } else {
    missing += 1;
    console.log("no snapshot yet");
  }
  await sleep(pauseMs);
}

await writeFile(ARCHIVES_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`\n${urls.length} urls · ${added} new · ${missing} still without archive · manifest at ${ARCHIVES_PATH}`);
