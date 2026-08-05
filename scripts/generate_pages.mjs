/**
 * Static pages: one real page per case, minister share pages, the claim-versus-
 * record index, and the OG images for all of them.
 *
 * Case pages used to be crawler stubs that bounced a human straight back to the
 * ledger, which meant 87 cases shared one URL and none of them could be cited or
 * found in a search. They are now complete pages that stand on their own without
 * JavaScript.
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

/** Only the inline emphasis the case data is allowed to carry. */
function safeRich(value) {
  return escapeHtml(value).replace(/&lt;(\/?)(b|em|i|strong|br)&gt;/g, "<$1$2>");
}

/** Site chrome, so a case page is part of the ledger rather than a loose leaf. */
function pageShell({ title, description, path, imagePath, body, up = "../../", extraHead = "" }) {
  const url = `${SITE}${path}`;
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
  <meta property="og:image" content="${escapeHtml(`${SITE}${imagePath}`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(`${SITE}${imagePath}`)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800;900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Noto+Sans+Devanagari:wght@400;500;700;800&family=Noto+Serif+Devanagari:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}assets/css/styles.css">
${extraHead}</head>
<body>
  <header class="masthead compact-masthead">
    <div class="wrap">
      <div class="flag"><span data-i18n="flag_title">Citizens' Accountability Ledger</span><span class="redtag" data-i18n="flag_tag">Who owned the mess? 25 years, every party, on the record</span></div>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="${up}" data-i18n="nav_ledger">Ledger</a>
        <a href="${up}dashboard/" data-i18n="nav_dashboard">Minister dashboard</a>
        <a href="${up}claims/" data-i18n="nav_claims">Claim vs record</a>
        <a href="${up}submit/" data-i18n="nav_submit">Submit an incident</a>
        <a href="${up}corrections/" data-i18n="nav_corrections">Corrections</a>
        <span class="lang-switch" aria-label="Language">
          <button type="button" data-lang="en" aria-pressed="true">EN</button>
          <button type="button" data-lang="hi" aria-pressed="false">हि</button>
        </span>
      </nav>
      <p class="lang-notice" data-lang-notice data-i18n="notice_case_lang" hidden></p>
    </div>
  </header>
${body}
  <footer>
    <div class="wrap">
      <p class="fine">Opinion and analysis. The accountability case. Fact and allegation separated. Estimates flagged. Every published claim sourced. <a href="${up}corrections/">Corrections and right of reply</a>.</p>
    </div>
  </footer>
  <script src="${up}assets/js/source-utils.js" defer></script>
  <script src="${up}assets/js/i18n.js" defer></script>
  <script src="${up}assets/js/clock.js" defer></script>
  <script src="${up}assets/js/to-top.js" defer></script>
</body>
</html>`;
}

/** Whole days between a YYYYMMDD sort key and today, or null if unusable. */
function daysSince(sk) {
  const text = String(sk ?? "");
  if (!/^\d{8}$/.test(text)) return null;
  const when = Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
  const days = Math.floor((Date.now() - when) / 86400000);
  return days > 0 ? days : null;
}

/**
 * The clock. Rendered at build time so it works without JavaScript, and carries
 * data-since-sk so assets/js/clock.js can keep it current between deploys.
 */
function clockBlock(caseFile) {
  const days = daysSince(caseFile.sk);
  if (days === null) return "";
  const resigned = (caseFile.resignations ?? []).filter((r) => r?.n);
  const line = resigned.length
    ? `Someone did leave over this: ${resigned.map((r) => `${escapeHtml(r.n)} (${escapeHtml(r.office)}, ${escapeHtml(r.when)})`).join("; ")}.`
    : caseFile.sev === "amber"
      ? `Recorded outcome: ${escapeHtml(caseFile.stamp ?? "")}.`
      : "Nobody has been held to account.";
  return `<p class="clock" data-since-sk="${escapeHtml(String(caseFile.sk))}">
      <span class="clock-num">${days.toLocaleString("en-IN")}</span>
      <span class="clock-unit">days since</span>
      <span class="clock-line">${line}</span>
    </p>`;
}

/**
 * The head-to-head. Every case records the government's own defence in `pos`, so
 * this is the one comparison the ledger can make for all of them: what was said,
 * against what the record ended up showing.
 */
function headToHead(caseFile) {
  if (!caseFile.pos) return "";
  return `<section class="headtohead" aria-labelledby="h2h-${escapeHtml(caseId(caseFile))}">
      <h2 class="h2h-title" id="h2h-${escapeHtml(caseId(caseFile))}" data-i18n="h2h_heading">Claim against record</h2>
      <div class="h2h-grid">
        <div class="h2h-side h2h-said">
          <p class="h2h-label" data-i18n="h2h_said">What the government said</p>
          <p class="h2h-body">${safeRich(caseFile.pos)}</p>
        </div>
        <div class="h2h-side h2h-record">
          <p class="h2h-label" data-i18n="h2h_record">What the record shows</p>
          <p class="h2h-verdict">${escapeHtml(caseFile.stamp ?? "")}</p>
          <p class="h2h-body">${safeRich(caseFile.dodge ?? "")}</p>
        </div>
      </div>
    </section>`;
}

function sourceList(caseFile) {
  const TIER_TEXT = { 1: "T1", 2: "T2", 3: "T3" };
  return (caseFile.sources ?? []).map((source) => {
    const tier = source.tier ?? 2;
    if (source.todo) {
      return `<li class="src-item"><span class="src todo">${escapeHtml(source.label)} &middot; source needed</span></li>`;
    }
    const archive = source.archiveUrl
      ? ` <a class="src-archive" href="${escapeHtml(source.archiveUrl)}" rel="nofollow noopener noreferrer">Archived copy</a>`
      : "";
    return `<li class="src-item"><span class="source-wrap tier-${tier}">`
      + `<a class="src" href="${escapeHtml(source.url)}" rel="noopener noreferrer">`
      + `<span class="tier-badge">${TIER_TEXT[tier] ?? "T2"}</span> ${escapeHtml(source.label)} &#8599;</a>${archive}</span></li>`;
  }).join("");
}

function casePage(caseFile, { previous, next }) {
  const id = caseId(caseFile);
  const number = String(caseFile.no).padStart(2, "0");
  const severity = caseFile.sev === "amber" ? "amber" : "red";
  const holders = (caseFile.ministers ?? []).map((minister) => {
    const names = splitOfficeHolders(minister.n).map((name) => {
      const slug = slugify(name);
      return slug
        ? `<a href="../../minister/${encodeURIComponent(slug)}/">${escapeHtml(name)}</a>`
        : escapeHtml(name);
    }).join(" &middot; ");
    return `<li class="holder"><span class="holder-role">${escapeHtml(minister.r)}</span><span class="holder-name">${names}</span></li>`;
  }).join("");

  const field = (key, label, value, className = "") => (value
    ? `<section class="case-field ${className}"><h2 class="case-field-k" data-i18n="${key}">${label}</h2><div class="case-field-v">${safeRich(value)}</div></section>`
    : "");

  const body = `  <main class="wrap casefile-page">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="../../">Ledger</a> <span aria-hidden="true">/</span>
      <a href="../../?year=${escapeHtml(String(caseFile.year))}">${escapeHtml(String(caseFile.year))}</a> <span aria-hidden="true">/</span>
      <span>Case ${number}</span>
    </nav>

    <article class="casefile sev-${severity}">
      <header class="casefile-head">
        <p class="eyebrow">Case ${number} &middot; ${escapeHtml(caseFile.cat)}</p>
        <h1 class="title">${escapeHtml(caseFile.title)}</h1>
        <p class="casefile-date">${escapeHtml(caseFile.date)}</p>
        <p class="stamp ${severity === "amber" ? "amber" : ""}">${escapeHtml(caseFile.stamp ?? "")}</p>
        ${clockBlock(caseFile)}
      </header>

      <div class="case-metrics">
        <div class="metric"><div class="mk" data-i18n="card_human">Human cost${caseFile.human?.est ? ' <span class="est">Est</span>' : ""}</div><div class="mv">${safeRich(caseFile.human?.v ?? "")}</div></div>
        <div class="metric"><div class="mk" data-i18n="card_cost">Financial cost${caseFile.cost?.est ? ' <span class="est">Est</span>' : ""}</div><div class="mv">${safeRich(caseFile.cost?.v ?? "")}</div></div>
      </div>

      ${field("field_what", "What happened", caseFile.what)}
      ${headToHead(caseFile)}
      ${field("field_alleged", "Contested / alleged", caseFile.alleg, "alleg")}
      ${field("field_alt", "What accountability should have looked like", caseFile.alt, "alt")}

      <section class="case-field">
        <h2 class="case-field-k" data-i18n="field_ministers">Ministers and office-holders responsible</h2>
        <ul class="holders">${holders}</ul>
        <p class="case-caveat" data-i18n="case_holder_caveat">Naming who held the portfolio is a matter of public record. It is not by itself a finding of personal responsibility for any death or any rupee.</p>
      </section>

      <section class="case-field">
        <h2 class="case-field-k" data-i18n="field_sources">Sources</h2>
        <p class="source-legend"><span class="tier-badge tier-1">T1</span> primary record &middot; <span class="tier-badge tier-2">T2</span> reporting &middot; <span class="tier-badge tier-3">T3</span> partisan</p>
        <ul class="src-items">${sourceList(caseFile)}</ul>
        <p class="case-actions-row">
          <a class="case-share" href="../../suggest/?case=${encodeURIComponent(id)}&amp;title=${encodeURIComponent(caseFile.title)}">Know a better source? Add one</a>
          <a class="case-share" href="../../assets/og/${encodeURIComponent(id)}.svg" target="_blank" rel="noopener">Share card</a>
          <a class="case-share" href="../../?case=${encodeURIComponent(id)}">Open in the ledger</a>
        </p>
      </section>
    </article>

    <nav class="case-prevnext" aria-label="Nearby cases">
      ${previous ? `<a class="prevnext prev" href="../${encodeURIComponent(caseId(previous))}/"><span>Earlier</span>${escapeHtml(previous.title)}</a>` : "<span></span>"}
      ${next ? `<a class="prevnext next" href="../${encodeURIComponent(caseId(next))}/"><span>Later</span>${escapeHtml(next.title)}</a>` : "<span></span>"}
    </nav>
  </main>`;

  return pageShell({
    title: `${caseFile.title} · Accountability Ledger`,
    description: `${caseFile.date} · ${caseFile.cat}. ${stripHtml(caseFile.what).slice(0, 170)}`,
    path: `/case/${id}/`,
    imagePath: `/assets/og/${id}.svg`,
    body,
    extraHead: `  <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: caseFile.title,
      datePublished: `${String(caseFile.sk).slice(0, 4)}-${String(caseFile.sk).slice(4, 6)}-${String(caseFile.sk).slice(6, 8)}`,
      articleSection: caseFile.cat,
      isAccessibleForFree: true,
      citation: (caseFile.sources ?? []).filter((s) => s.url).map((s) => s.url),
    })}</script>\n`,
  });
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

  // Oldest first, so "earlier" and "later" on a case page mean what they say.
  const byDate = [...cases].sort((a, b) => a.sk - b.sk);

  for (const [index, caseFile] of byDate.entries()) {
    const id = caseId(caseFile);
    const ogName = `${id}.svg`;
    const human = stripHtml(caseFile.human?.v ?? "");
    const stat = human ? human.slice(0, 80) : stripHtml(caseFile.cost?.v ?? "").slice(0, 80);
    await writeFile(
      join(outputDir, "assets/og", ogName),
      ogSvg({ title: caseFile.title, stamp: caseFile.stamp, stat, label: `Case ${String(caseFile.no).padStart(2, "0")}` }),
      "utf8",
    );

    const dir = join(outputDir, "case", id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "index.html"),
      casePage(caseFile, { previous: byDate[index - 1], next: byDate[index + 1] }),
      "utf8",
    );
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

  // Claim against record: every case that has a recorded government defence.
  const contested = byDate.filter((c) => c.pos).reverse();
  const claimsOg = "claims-index.svg";
  await writeFile(
    join(outputDir, "assets/og", claimsOg),
    ogSvg({
      title: "Claim against record",
      stamp: `${contested.length} cases where the government answered, set against what followed.`,
      stat: "Read both columns.",
      label: "Accountability Ledger",
    }),
    "utf8",
  );

  const claimRows = contested.map((c) => `<li class="claim-row">
        <p class="claim-case"><a href="../case/${encodeURIComponent(caseId(c))}/">${escapeHtml(c.title)}</a>
          <span class="claim-meta">${escapeHtml(c.date)} &middot; ${escapeHtml(c.cat)}</span></p>
        <div class="h2h-grid">
          <div class="h2h-side h2h-said">
            <p class="h2h-label">They said</p>
            <p class="h2h-body">${safeRich(c.pos)}</p>
          </div>
          <div class="h2h-side h2h-record">
            <p class="h2h-label">The record says</p>
            <p class="h2h-verdict">${escapeHtml(c.stamp ?? "")}</p>
            <p class="h2h-body">${safeRich(c.dodge ?? "")}</p>
          </div>
        </div>
      </li>`).join("");

  await mkdir(join(outputDir, "claims"), { recursive: true });
  await writeFile(
    join(outputDir, "claims/index.html"),
    pageShell({
      title: "Claim against record · Accountability Ledger",
      description: `For ${contested.length} cases on this ledger, what the government said set directly against what the record shows happened next.`,
      path: "/claims/",
      imagePath: `/assets/og/${claimsOg}`,
      up: "../",
      body: `  <main class="wrap claims-page">
    <div class="hero">
      <p class="eyebrow">Two columns</p>
      <h1 class="title">Claim against<br><span class="thin">record.</span></h1>
      <p class="standfirst">Every case on this ledger records the government's own answer, in its own terms. This page sets that answer beside what the record shows happened next, and lets you read both. Where the government turned out to be right, that is on this page too.</p>
    </div>
    <p class="queue-warning">The left column is the government's stated position, not a straw man. Several of these defences were vindicated: charges collapsed, presumptive figures went untested, ministers were cleared. Those outcomes are in the right column in the same words as everything else.</p>
    <ul class="claim-list">${claimRows}</ul>
  </main>`,
    }),
    "utf8",
  );

  console.log(
    `Generated ${cases.length} case pages, ${groups.size} minister pages, `
    + `1 claim-vs-record index (${contested.length} pairs)`,
  );
}
