/**
 * Static share pages, minister profiles and OG images.
 * Crawlers read these; humans are redirected to the live ledger.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SITE = process.env.SITE_URL ?? "https://accountabilityledger.pages.dev";

function slugify(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function caseId(caseFile) {
  return caseFile.id ?? `case-${caseFile.no}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function shareShell({ title, description, path, imagePath, redirect, cssHref, body }) {
  const url = `${SITE}${path}`;
  const image = `${SITE}${imagePath}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirect)}">
  <link rel="stylesheet" href="${escapeHtml(cssHref)}">
</head>
<body class="share-landing">
  <main class="wrap share-card">
    ${body}
    <p><a href="${escapeHtml(redirect)}">Open in the ledger &#8594;</a></p>
  </main>
</body>
</html>`;
}

function ogSvg({ title, stamp, stat, label }) {
  const safeTitle = escapeHtml(title.slice(0, 90));
  const safeStamp = escapeHtml(stamp.slice(0, 120));
  const safeStat = escapeHtml(stat ?? "On the record");
  const safeLabel = escapeHtml(label ?? "Accountability Ledger");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f4ee"/>
  <rect x="0" y="0" width="8" height="630" fill="#b42318"/>
  <text x="64" y="72" font-family="Georgia, serif" font-size="22" fill="#6b6f76" letter-spacing="4">${safeLabel}</text>
  <text x="64" y="250" font-family="Georgia, serif" font-size="52" font-weight="700" fill="#191b1f">${safeTitle}</text>
  <text x="64" y="330" font-family="Georgia, serif" font-size="28" fill="#4a4f57">${safeStamp}</text>
  <text x="64" y="520" font-family="monospace" font-size="24" fill="#b42318">${safeStat}</text>
</svg>`;
}

/**
 * Must stay in step with splitOfficeHolders in assets/js/dashboard.js, because
 * the slugs generated here are the URLs that page links to. A comma inside
 * brackets is part of one name, not a separator between two office-holders.
 */
const NON_SPLIT_NAMES = new Set(["ministry of environment, forest and climate change"]);

function splitOfficeHolders(name) {
  if (NON_SPLIT_NAMES.has(String(name).trim().toLowerCase())) return [String(name).trim()];
  const parts = [];
  let buffer = "";
  let depth = 0;
  for (const char of String(name)) {
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    if ((char === "/" || char === ",") && depth === 0) {
      parts.push(buffer);
      buffer = "";
      continue;
    }
    buffer += char;
  }
  parts.push(buffer);
  return parts.map((item) => item.trim()).filter(Boolean);
}

export async function generatePages(cases, outputDir) {
  await mkdir(join(outputDir, "assets/og"), { recursive: true });
  await mkdir(join(outputDir, "case"), { recursive: true });
  await mkdir(join(outputDir, "minister"), { recursive: true });

  for (const caseFile of cases) {
    const id = caseId(caseFile);
    const ogName = `${id}.svg`;
    const human = stripHtml(caseFile.human?.v ?? "");
    const stat = human ? human.slice(0, 80) : stripHtml(caseFile.cost?.v ?? "").slice(0, 80);
    await writeFile(
      join(outputDir, "assets/og", ogName),
      ogSvg({ title: caseFile.title, stamp: caseFile.stamp, stat, label: `Case ${String(caseFile.no).padStart(2, "0")}` }),
      "utf8",
    );

    const description = `${caseFile.date} · ${caseFile.cat}. ${stripHtml(caseFile.what).slice(0, 180)}`;
    const html = shareShell({
      title: `${caseFile.title} · Accountability Ledger`,
      description,
      path: `/case/${id}/`,
      imagePath: `/assets/og/${ogName}`,
      redirect: `../../?case=${encodeURIComponent(id)}`,
      cssHref: "../../assets/css/styles.css",
      body: `<p class="eyebrow">Case ${String(caseFile.no).padStart(2, "0")}</p><h1>${escapeHtml(caseFile.title)}</h1><p>${escapeHtml(caseFile.stamp)}</p>`,
    });
    const dir = join(outputDir, "case", id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html, "utf8");
  }

  const groups = new Map();
  for (const caseFile of cases) {
    const estimates = caseFile.estimates ?? {};
    const cost = Number(estimates.costInrCrore) || 0;
    const deaths = Number(estimates.deaths) || 0;
    const namesInCase = new Map();
    for (const minister of caseFile.ministers ?? []) {
      for (const name of splitOfficeHolders(minister.n)) {
        const key = name.toLocaleLowerCase();
        if (!namesInCase.has(key)) namesInCase.set(key, name);
      }
    }
    for (const [key, name] of namesInCase) {
      const group = groups.get(key) ?? { name, cases: [], cost: 0, deaths: 0 };
      group.cases.push(caseFile);
      group.cost += cost;
      group.deaths += deaths;
      groups.set(key, group);
    }
  }

  for (const group of groups.values()) {
    const slug = slugify(group.name);
    if (!slug) continue;
    // "Nobody answering" mirrors the ledger's own severity legend: a red case is
    // one recorded as no accountability / denied / struck down.
    const unanswered = group.cases.filter((c) => c.sev !== "amber").length;
    const n = group.cases.length;
    const ogName = `minister-${slug}.svg`;
    await writeFile(
      join(outputDir, "assets/og", ogName),
      ogSvg({
        title: group.name,
        stamp: `${n} failure${n === 1 ? "" : "s"} on file. ${unanswered} with nobody answering.`,
        stat: "Still in the running.",
        label: "Personnel file",
      }),
      "utf8",
    );
    const list = group.cases
      .sort((a, b) => b.sk - a.sk)
      .map((c) => `<li><a href="../../?case=${encodeURIComponent(caseId(c))}">${escapeHtml(c.title)}</a> <span class="fine">${escapeHtml(c.date)} &middot; ${escapeHtml(c.stamp ?? "")}</span></li>`)
      .join("");
    const html = shareShell({
      title: `${group.name} · Personnel file · Accountability Ledger`,
      description: `${n} failure${n === 1 ? "" : "s"} on file under ${group.name}. ${unanswered} of them closed with nobody answering for anything.`,
      path: `/minister/${slug}/`,
      imagePath: `/assets/og/${ogName}`,
      redirect: `../../dashboard/?minister=${encodeURIComponent(group.name)}`,
      cssHref: "../../assets/css/styles.css",
      body: `<p class="eyebrow">Personnel file</p><h1>${escapeHtml(group.name)}</h1>`
        + `<p class="standfirst">${n} failure${n === 1 ? "" : "s"} recorded on this file. ${unanswered} of them closed with nobody answering for anything.</p>`
        + `<p class="fine">Figures are totals <em>recorded in these cases</em>, never attributed to the individual. Holding an office when a failure happened is a matter of public record, not a finding of personal responsibility.</p>`
        + `<ul class="thread-list">${list}</ul>`,
    });
    const dir = join(outputDir, "minister", slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html, "utf8");
  }

  console.log(`Generated ${cases.length} case pages, ${groups.size} minister pages`);
}
