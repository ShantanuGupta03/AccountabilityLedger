/**
 * Static share pages, minister profiles, thread pages and OG images.
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

function splitOfficeHolders(name) {
  return String(name).split(/\s*\/\s*|\s*,\s*/).map((item) => item.trim()).filter(Boolean);
}

export async function generatePages(cases, outputDir) {
  await mkdir(join(outputDir, "assets/og"), { recursive: true });
  await mkdir(join(outputDir, "case"), { recursive: true });
  await mkdir(join(outputDir, "minister"), { recursive: true });
  await mkdir(join(outputDir, "threads"), { recursive: true });

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
    const namesInCase = new Map();
    for (const minister of caseFile.ministers ?? []) {
      for (const name of splitOfficeHolders(minister.n)) {
        const key = name.toLocaleLowerCase();
        if (!namesInCase.has(key)) namesInCase.set(key, name);
      }
    }
    for (const [key, name] of namesInCase) {
      const group = groups.get(key) ?? { name, cases: [] };
      group.cases.push(caseFile);
      groups.set(key, group);
    }
  }

  for (const group of groups.values()) {
    const slug = slugify(group.name);
    if (!slug) continue;
    const ogName = `minister-${slug}.svg`;
    await writeFile(
      join(outputDir, "assets/og", ogName),
      ogSvg({
        title: group.name,
        stamp: "Portfolio on the ledger",
        stat: `${group.cases.length} case${group.cases.length === 1 ? "" : "s"} recorded`,
        label: "Office-holder",
      }),
      "utf8",
    );
    const list = group.cases
      .sort((a, b) => b.sk - a.sk)
      .map((c) => `<li><a href="../../?case=${encodeURIComponent(caseId(c))}">${escapeHtml(c.title)}</a> <span class="fine">${escapeHtml(c.date)}</span></li>`)
      .join("");
    const html = shareShell({
      title: `${group.name} · Accountability Ledger`,
      description: `${group.cases.length} cases in this ledger name ${group.name} as the relevant office-holder.`,
      path: `/minister/${slug}/`,
      imagePath: `/assets/og/${ogName}`,
      redirect: `../../dashboard/?minister=${encodeURIComponent(group.name)}`,
      cssHref: "../../assets/css/styles.css",
      body: `<h1>${escapeHtml(group.name)}</h1><p class="standfirst">Cases grouped by portfolio. Figures on the dashboard are totals <em>recorded in these cases</em>, not attributed to the individual.</p><ul class="thread-list">${list}</ul>`,
    });
    const dir = join(outputDir, "minister", slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html, "utf8");
  }

  const threads = [
    {
      slug: "no-data-dodge",
      title: "The recurring 'we keep no data' dodge",
      description: "When counting the dead, the injured, or the affected would create a paper trail, the record goes blank.",
      intro: "A thread through cases where official data was denied, delayed, destroyed, or never collected in the first place.",
      caseNos: [4, 7, 8, 9, 13, 19, 20, 32, 33, 34, 35, 39, 44, 52, 53, 60],
    },
    {
      slug: "court-not-government",
      title: "Accountability that only ever came from a court",
      description: "Cases where relief, investigation, or admission arrived from the judiciary, not from the government owning the failure.",
      intro: "When the executive would not act, courts, commissions, or auditors often did — and were then ignored, delayed, or defied.",
      caseNos: [5, 11, 15, 17, 22, 30, 41, 43, 46, 47, 49, 50, 51, 55, 56, 58],
    },
    {
      slug: "inaugurate-then-fail",
      title: "Inaugurate, fail in months, blame the rain",
      description: "Infrastructure and vanity projects that opened to applause and collapsed into scandal, delay, or disaster.",
      intro: "A pattern of ribbon-cutting ahead of safety, scrutiny, or completion — and accountability deferred to an inquiry that goes nowhere.",
      caseNos: [10, 28, 29, 40, 42, 45, 54, 57, 59, 62],
    },
  ];

  for (const thread of threads) {
    const matched = thread.caseNos
      .map((no) => cases.find((c) => c.no === no))
      .filter(Boolean);
    const ogName = `thread-${thread.slug}.svg`;
    await writeFile(
      join(outputDir, "assets/og", ogName),
      ogSvg({ title: thread.title, stamp: thread.description, stat: `${matched.length} cases`, label: "Thread" }),
      "utf8",
    );
    const list = matched
      .map((c) => `<li><a href="../../?case=${encodeURIComponent(caseId(c))}">${escapeHtml(c.title)}</a></li>`)
      .join("");
    const html = shareShell({
      title: `${thread.title} · Accountability Ledger`,
      description: thread.description,
      path: `/threads/${thread.slug}/`,
      imagePath: `/assets/og/${ogName}`,
      redirect: "../../",
      cssHref: "../../assets/css/styles.css",
      body: `<h1>${escapeHtml(thread.title)}</h1><p class="standfirst">${escapeHtml(thread.intro)}</p><ul class="thread-list">${list}</ul>`,
    });
    const dir = join(outputDir, "threads", thread.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html, "utf8");
  }

  const threadIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Threads · Accountability Ledger</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
</head>
<body>
  <main class="wrap form-page">
    <h1 class="title">Cross-cutting <span class="thin">threads</span></h1>
    <p class="standfirst">Curated narrative paths through the ledger. Each thread links cases that share a pattern of failure or evasion.</p>
    <ul class="thread-list">
      ${threads.map((t) => `<li><a href="./${t.slug}/">${escapeHtml(t.title)}</a><span class="fine">${escapeHtml(t.description)}</span></li>`).join("")}
    </ul>
    <p><a href="../">Back to the ledger</a></p>
  </main>
</body>
</html>`;
  await writeFile(join(outputDir, "threads/index.html"), threadIndex, "utf8");

  console.log(`Generated ${cases.length} case pages, ${groups.size} minister pages, ${threads.length} threads`);
}
