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

/**
 * The canonical origin. Every canonical link and og:image is absolute, so this
 * has to be the domain readers actually land on: pointing them at an old host
 * splits search authority and breaks social previews. Override with SITE_URL.
 */
const SITE = (process.env.SITE_URL ?? "https://whoisresponsible.xyz").replace(/\/$/, "");

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

/**
 * Display numbers, oldest first.
 *
 * `no` in the data file is the order cases were *added*: the 2014-onward set got
 * 1 to 54 and the pre-2014 tranche got 55 to 87, so the oldest event on the
 * ledger was numbered 63 and the newest 40. On a page that presents itself as a
 * chronological record that is simply wrong, and it invited readers to read the
 * number as a position it never held.
 *
 * The number shown is therefore derived from the date every time the site is
 * built, so it cannot drift again. Identity stays with the `id` field, which is
 * frozen in the data file: renumbering a label must never move a URL that has
 * already been shared or cited.
 */
function byDateThenId(a, b) {
  // Dates are not unique, so ties need a stable second key or the rank order and
  // the display order drift apart. Mirrors byDateThenId in assets/js/app.js.
  return (a.sk - b.sk) || caseId(a).localeCompare(caseId(b));
}

function displayNumbers(cases) {
  const ranks = new Map();
  [...cases].sort(byDateThenId).forEach((caseFile, index) => {
    ranks.set(caseId(caseFile), index + 1);
  });
  return ranks;
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
  <header class="masthead compact-masthead bare-masthead">
    <div class="wrap">
      <div class="flag"><span data-i18n="flag_title">Citizens' Accountability Ledger</span><span class="redtag" data-i18n="flag_tag">Who owned the mess? 25 years, every party, on the record</span></div>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="${up}" data-i18n="nav_ledger">Ledger</a>
        <a href="${up}dashboard/" data-i18n="nav_dashboard">Ministers</a>
        <a href="${up}rti/" data-i18n="nav_rti">File an RTI</a>
        <a href="${up}submit/" data-i18n="nav_submit">Submit a case</a>
        <a href="${up}corrections/" data-i18n="nav_corrections">Corrections &amp; sources</a>
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
      <h2 class="h2h-title" id="h2h-${escapeHtml(caseId(caseFile))}"><span data-i18n="h2h_heading">Claim against record</span> <a class="h2h-all" href="../../claims/" data-i18n="h2h_all">See every case this way &rarr;</a></h2>
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

/**
 * Related cases. "Earlier" and "later" are chronology, which is the one thing a
 * reader can already see; what actually helps is the case with the same person
 * on the file, or the same failure happening again under a different flag.
 *
 * Scored rather than filtered, so a case is never left with an empty block:
 * a shared office-holder is the strongest signal, a shared category next, and a
 * near-in-time case is the weak tiebreak that stops the list going blank.
 */
function relatedCases(caseFile, all) {
  const id = caseId(caseFile);
  const holders = new Set(
    (caseFile.ministers ?? []).flatMap((m) => splitOfficeHolders(m.n)).map((n) => n.toLowerCase()),
  );
  const scored = all
    .filter((other) => caseId(other) !== id)
    .map((other) => {
      const otherHolders = new Set(
        (other.ministers ?? []).flatMap((m) => splitOfficeHolders(m.n)).map((n) => n.toLowerCase()),
      );
      let score = 0;
      let why = [];
      const shared = [...holders].filter((n) => otherHolders.has(n));
      if (shared.length) {
        score += 5 * shared.length;
        why.push(`Same office-holder: ${shared.length}`);
      }
      if (other.cat === caseFile.cat) {
        score += 3;
        why.push("Same category");
      }
      if (other.sev === caseFile.sev) score += 1;
      // Never enough on its own; only separates cases already tied on substance.
      const gap = Math.abs(Number(other.year) - Number(caseFile.year));
      if (gap <= 2) score += 1;
      return { other, score, why };
    })
    .filter((entry) => entry.score >= 3)
    .sort((a, b) => b.score - a.score || Math.abs(b.other.sk - caseFile.sk) - Math.abs(a.other.sk - caseFile.sk));
  return scored.slice(0, 3);
}

function relatedBlock(related) {
  if (!related.length) return "";
  const items = related.map(({ other, why }) => `
        <li class="related-item">
          <a class="related-link" href="../${encodeURIComponent(caseId(other))}/">${escapeHtml(other.title)}</a>
          <span class="related-meta">${escapeHtml(other.date)} &middot; ${escapeHtml(other.cat)}</span>
          <span class="related-why">${why.map((reason) => escapeHtml(reason.replace(/Same office-holder: \d+/, "Same office-holder"))).join(" &middot; ")}</span>
        </li>`).join("");
  return `<section class="related" aria-labelledby="related-title">
      <h2 class="related-title" id="related-title" data-i18n="related_heading">The same pattern, elsewhere on the file</h2>
      <ul class="related-list">${items}</ul>
    </section>`;
}

function casePage(caseFile, { previous, next, related = [], number = 0 }) {
  const id = caseId(caseFile);
  const label = String(number).padStart(2, "0");
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
      <span>${escapeHtml(caseFile.title)}</span>
    </nav>

    <article class="casefile sev-${severity}">
      <header class="casefile-head">
        <p class="eyebrow">Case ${label} &middot; ${escapeHtml(caseFile.cat)}</p>
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
          <a class="case-share act" href="../../rti/?case=${encodeURIComponent(id)}">Ask them officially. File an RTI</a>
          <a class="case-share" href="../../corrections/?case=${encodeURIComponent(id)}&amp;title=${encodeURIComponent(caseFile.title)}#sources">Know a better source? Add one</a>
        </p>
      </section>
    </article>

    ${relatedBlock(related)}

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

/**
 * Greedy word wrap for SVG text, which does not wrap on its own. Width is
 * estimated from the font size: Georgia bold averages a little under half its
 * point size per character, and 0.52 leaves margin for wide strings without
 * wasting a line on narrow ones.
 */
function wrapSvgText(text, { maxWidth, fontSize, maxLines }) {
  const perChar = fontSize * 0.52;
  const limit = Math.max(8, Math.floor(maxWidth / perChar));
  const lines = [];
  let current = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    // Anything past the last line is dropped, so mark the truncation.
    const consumed = lines.join(" ").length;
    if (consumed < String(text).replace(/\s+/g, " ").trim().length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,.;:]$/, "")}…`;
    }
  }
  return lines;
}

/**
 * The share card. Titles are wrapped rather than run off the edge, and the
 * headline number is the day count, because "6,471 days, nobody answered" is the
 * part worth putting in front of someone scrolling past.
 */
function ogSvg({ title, stamp, stat, label, days, dayLine }) {
  const MAX_W = 1072;
  // Long titles step down a size before they step onto a fourth line.
  const titleSize = title.length > 78 ? 40 : title.length > 46 ? 46 : 54;
  const titleLines = wrapSvgText(title, { maxWidth: MAX_W, fontSize: titleSize, maxLines: 3 });
  const stampLines = wrapSvgText(stamp ?? "", { maxWidth: MAX_W, fontSize: 27, maxLines: 2 });

  let y = 168;
  const parts = [
    `<text x="64" y="76" font-family="Georgia, serif" font-size="21" fill="#6b6f76" letter-spacing="4">${escapeHtml(label ?? "Accountability Ledger")}</text>`,
  ];
  for (const line of titleLines) {
    parts.push(`<text x="64" y="${y}" font-family="Georgia, serif" font-size="${titleSize}" font-weight="700" fill="#191b1f">${escapeHtml(line)}</text>`);
    y += Math.round(titleSize * 1.2);
  }
  y += 18;
  for (const line of stampLines) {
    parts.push(`<text x="64" y="${y}" font-family="Georgia, serif" font-size="27" fill="#4a4f57">${escapeHtml(line)}</text>`);
    y += 36;
  }

  if (Number.isFinite(days) && days > 0) {
    parts.push(`<text x="64" y="500" font-family="Georgia, serif" font-size="84" font-weight="700" fill="#b42318">${escapeHtml(days.toLocaleString("en-IN"))}</text>`);
    const offset = 64 + String(days.toLocaleString("en-IN")).length * 46 + 18;
    parts.push(`<text x="${offset}" y="500" font-family="monospace" font-size="22" fill="#6b6f76">DAYS SINCE</text>`);
    for (const [index, line] of wrapSvgText(dayLine ?? "", { maxWidth: MAX_W, fontSize: 22, maxLines: 2 }).entries()) {
      parts.push(`<text x="64" y="${544 + index * 30}" font-family="monospace" font-size="21" fill="#4a4f57">${escapeHtml(line)}</text>`);
    }
  } else {
    for (const [index, line] of wrapSvgText(stat ?? "On the record", { maxWidth: MAX_W, fontSize: 24, maxLines: 2 }).entries()) {
      parts.push(`<text x="64" y="${508 + index * 32}" font-family="monospace" font-size="24" fill="#b42318">${escapeHtml(line)}</text>`);
    }
  }

  parts.push(`<text x="64" y="600" font-family="monospace" font-size="18" fill="#8a8f96">${escapeHtml(SITE.replace(/^https?:\/\//, ""))}</text>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f4ee"/>
  <rect x="0" y="0" width="8" height="630" fill="#b42318"/>
  ${parts.join("\n  ")}
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
  const byDate = [...cases].sort(byDateThenId);
  const numbers = displayNumbers(cases);

  for (const [index, caseFile] of byDate.entries()) {
    const id = caseId(caseFile);
    const ogName = `${id}.svg`;
    const human = stripHtml(caseFile.human?.v ?? "");
    const stat = human ? human.slice(0, 80) : stripHtml(caseFile.cost?.v ?? "").slice(0, 80);
    const resigned = (caseFile.resignations ?? []).filter((r) => r?.n);
    await writeFile(
      join(outputDir, "assets/og", ogName),
      ogSvg({
        title: caseFile.title,
        stamp: caseFile.stamp,
        stat,
        label: `Case ${String(numbers.get(id) ?? 0).padStart(2, "0")} \u00b7 ${caseFile.cat}`,
        days: daysSince(caseFile.sk) ?? undefined,
        dayLine: resigned.length
          ? `Someone left over this: ${resigned.map((r) => r.n).join(", ")}.`
          : caseFile.sev === "amber"
            ? stat
            : "Nobody has been held to account.",
      }),
      "utf8",
    );

    const dir = join(outputDir, "case", id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "index.html"),
      casePage(caseFile, {
        previous: byDate[index - 1],
        next: byDate[index + 1],
        related: relatedCases(caseFile, cases),
        number: numbers.get(id) ?? 0,
      }),
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

  // The homepage card. index.html references it, so it has to exist.
  const unansweredAll = cases.filter((c) => c.sev !== "amber").length;
  await writeFile(
    join(outputDir, "assets/og", "ledger.svg"),
    ogSvg({
      title: "Who owned the mess?",
      stamp: `${cases.length} sourced cases since 2000, under every government that held power.`,
      stat: `${unansweredAll} of them closed with nobody answering.`,
      label: "Citizens' Accountability Ledger",
    }),
    "utf8",
  );

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
