const dashboardView = document.querySelector("#dashboard-view");
const profileView = document.querySelector("#profile-view");
const rows = document.querySelector("#minister-rows");
const search = document.querySelector("#minister-search");
const count = document.querySelector("#dashboard-count");
const slugify = window.SourceUtils?.slugify ?? ((name) => String(name).toLowerCase().replace(/\s+/g, "-"));
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const t = (key, vars) => window.LedgerI18n?.t(key, vars) ?? "";
const caseField = (caseFile, field) => window.LedgerI18n?.caseField(caseFile, field) ?? caseFile?.[field] ?? "";
const category = (name) => window.LedgerI18n?.category(name) ?? name;
window.LedgerI18n?.setCaseStringsBase("../");

function ministerLink(name) {
  const slug = slugify(name);
  return slug ? `<a class="minister-profile" href="?minister=${encodeURIComponent(name)}">${escapeHTML(name)}</a>` : escapeHTML(name);
}

/**
 * Institution names whose own commas would otherwise be read as separators.
 * Better fixed in assets/data/cases.json by writing the name unambiguously;
 * until then this keeps the ministry from being split into two office-holders.
 */
const NON_SPLIT_NAMES = new Set(["ministry of environment, forest and climate change"]);

/**
 * "A / B" and "A, B" name separate office-holders and must become separate
 * rows — case 8 lists three ministers that way. A comma inside brackets is part
 * of one name, though: "BJP state governments (UP, MP, Rajasthan and others)"
 * is a single entry.
 */
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

const SU = window.SourceUtils;

/** Indian units lead everywhere; the international reading is on hover and tap. */
function formatCost(value) {
  const primary = SU?.formatCrore(value);
  return primary ? SU.figure(primary, SU.croreToUsd(value)) : "—";
}

function formatDeaths(value) {
  const primary = SU?.formatPeople(value);
  return primary ? SU.figure(primary, SU.peopleToInternational(value)) : "—";
}

/** The plain string, for places that cannot take markup. */
function plainCost(value) {
  return SU?.formatCrore(value) ?? "—";
}

function plainDeaths(value) {
  return SU?.formatPeople(value) ?? "—";
}

async function loadCases() {
  const staticCases = await fetch("../assets/data/cases.json").then((response) => {
    if (!response.ok) throw new Error("Unable to load the ledger.");
    return response.json();
  });
  const [published] = await Promise.all([
    fetch("../api/cases")
      .then((response) => response.ok ? response.json() : { cases: [] })
      .catch(() => ({ cases: [] })),
    window.LedgerI18n?.ensureCaseStrings(),
  ]);
  return [...staticCases, ...(published.cases ?? [])];
}

function dashboard(cases) {
  const groups = new Map();
  cases.forEach((caseFile) => {
    const estimates = caseFile.estimates ?? {};
    const cost = Number(estimates.costInrCrore) || 0;
    const deaths = Number(estimates.deaths) || 0;
    // One case must count once per office-holder even if it names them twice,
    // otherwise their cost and death totals are inflated.
    const namesInCase = new Map();
    (caseFile.ministers ?? []).forEach((minister) => {
      splitOfficeHolders(minister.n).forEach((name) => {
        const key = name.toLocaleLowerCase();
        if (!namesInCase.has(key)) namesInCase.set(key, name);
      });
    });
    namesInCase.forEach((name, key) => {
      const group = groups.get(key) ?? { name, key, cases: [], cost: 0, deaths: 0, outcomes: new Set() };
      group.cases.push(caseFile);
      group.cost += cost;
      group.deaths += deaths;
      if (caseFile.stamp) group.outcomes.add(caseFile.stamp);
      groups.set(key, group);
    });
  });
  return [...groups.values()].sort((a, b) => b.cases.length - a.cases.length || a.name.localeCompare(b.name));
}

const VISIBLE_CASES = 3;

function caseLink(caseFile) {
  const id = caseFile.id ?? `case-${caseFile.no}`;
  return `<a href="../?case=${encodeURIComponent(id)}">${escapeHTML(caseField(caseFile, "title"))}</a>`;
}

function renderTable(groups) {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = groups.filter((group) => group.name.toLocaleLowerCase().includes(query));
  count.textContent = t("dash_count", { n: filtered.length });
  rows.innerHTML = filtered.map((group) => {
    const links = group.cases.slice(0, VISIBLE_CASES).map(caseLink).join(", ");
    const hidden = group.cases.slice(VISIBLE_CASES);
    const rest = hidden.length
      ? `<span class="more-cases" data-count="${hidden.length}" hidden>, ${hidden.map(caseLink).join(", ")}</span>`
        + `<button type="button" class="more-toggle" aria-expanded="false">${escapeHTML(t("more_n", { n: hidden.length }))}</button>`
      : "";
    // Derived at render time, not at grouping time, so a language switch reaches them.
    const outcomes = [...new Set(group.cases.map((c) => caseField(c, "stamp")).filter(Boolean))]
      .slice(0, 2).map(escapeHTML).join(" · ");
    return `<tr>
      <th scope="row"><span>${ministerLink(group.name)}</span><small>${links}${rest}</small></th>
      <td data-label="${escapeHTML(t("th_cases"))}">${group.cases.length}</td>
      <td data-label="${escapeHTML(t("th_costs"))}">${formatCost(group.cost)}</td>
      <td data-label="${escapeHTML(t("th_deaths"))}">${formatDeaths(group.deaths)}</td>
      <td data-label="${escapeHTML(t("th_outcome"))}">${outcomes || "—"}</td>
    </tr>`;
  }).join("") || `<tr><td class="table-empty" colspan="5">${escapeHTML(t("dash_empty"))}</td></tr>`;
}

/* ==========================================================================
   Personnel file. A CV parody built only from cases already in the ledger.
   The tone is deliberately hostile; the facts are not invented. Every claim
   below is either a figure recorded in a sourced case or a label derived from
   the outcome the ledger already publishes for that case.
   ========================================================================== */

/**
 * Satirical competency labels. Each one is matched against the outcome stamps
 * the ledger already records, so a "skill" only appears when there are cases
 * on file that demonstrate it, and it always shows the count.
 */
const COMPETENCIES = [
  { key: "comp_data", test: /no data|uncounted|stopped counting|data withheld|never independently checked|no rti|no cag|quietly abandoned/i },
  { key: "comp_denial", test: /denied|denial|neither confirmed nor denied/i },
  { key: "comp_inquiry", test: /no public inquiry|probe refused|declined a probe|no inquiry|no real inquiry|no senior official|chargesheets, no convictions/i },
  { key: "comp_blame", test: /minister untouched|no minister|dg sacked|only the contractor|officials suspended|cosmetic resignation|two statisticians/i },
  { key: "comp_stay", test: /no resignation|kept post|no political resignation|responsibility taken/i },
  { key: "comp_court", test: /unconstitutional|struck down|quashed|supreme court|under challenge|murder of democracy/i },
  { key: "comp_warning", test: /warnings ignored|warnings overridden|blamed on rain|never owned|patched|safety questions/i },
  { key: "comp_dissent", test: /jailed|bail|nsa for|dissenters|accusers policed|instigators free|custodial/i },
  { key: "comp_reverse", test: /reversed|cancelled|deadline moved|results missing|quietly erased|reforms failed/i },
];

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 3).join("").toUpperCase();
}

/**
 * The headline line under the name. Counts only — it says nothing about whether
 * the person still holds the office, because some of them resigned and the
 * ledger does not get to imply otherwise for the sake of a better sentence.
 */
function verdict(total, unanswered) {
  const parts = [total === 1 ? t("cv_v_one") : t("cv_v_many", { cases: total })];
  if (unanswered === 1) parts.push(total === 1 ? t("cv_v_un_one") : t("cv_v_un_many", { unanswered }));
  else if (unanswered > 1) parts.push(t("cv_v_un_many", { unanswered }));
  parts.push(t("cv_v_tail"));
  return parts.join(" ");
}

function roleForCase(caseFile, key) {
  for (const minister of caseFile.ministers ?? []) {
    if (splitOfficeHolders(minister.n).some((name) => name.toLocaleLowerCase() === key)) {
      return minister.r || "Office-holder";
    }
  }
  return "Office-holder";
}

/**
 * A CV parody wants a letterhead address, and these are the real, public,
 * institutional addresses of the offices concerned — the kind printed on a
 * government website. Matched against the office-holder name and role text,
 * most specific first. It never invents or publishes a personal or
 * residential address, only the seat of the public office.
 */
const OFFICE_ADDRESSES = [
  [/prime minister/, "Prime Minister's Office, South Block, New Delhi – 110011"],
  [/\bmp\b.*(chief minister|\bcm\b)|(chief minister|\bcm\b).*\bmp\b|madhya pradesh/, "Chief Minister's Office, Vallabh Bhawan, Bhopal – 462004"],
  [/\bup\b.*(chief minister|\bcm\b)|(chief minister|\bcm\b).*\bup\b|uttar pradesh/, "Chief Minister's Office, Lok Bhawan, Lucknow – 226001"],
  [/manipur/, "Chief Minister's Office, Manipur Secretariat, Imphal – 795001"],
  [/gujarat/, "Chief Minister's Office, Swarnim Sankul, Gandhinagar – 382010"],
  [/chief minister|\bcm\b/, "Office of the Chief Minister, state secretariat concerned"],
  [/lieutenant governor|\bl-?g\b/, "Raj Bhavan concerned, Government of India"],
  // \b matters on "election": "selection" would otherwise match.
  [/\belection commission\b|chief election commissioner/, "Election Commission of India, Nirvachan Sadan, New Delhi – 110001"],
  [/reserve bank|\brbi\b|banking regulator|currency management/, "Reserve Bank of India, Central Office, Shahid Bhagat Singh Marg, Mumbai – 400001"],
  [/home (minister|ministry|affairs)|\bmos home\b|ministry of home|delhi police|\bnia\b|\bcrpf\b|census|\brgi\b/, "Ministry of Home Affairs, North Block, New Delhi – 110001"],
  [/finance minister|finance ministry|\bgst\b|excise|\bcess\b/, "Ministry of Finance, North Block, New Delhi – 110001"],
  [/defence/, "Ministry of Defence, South Block, New Delhi – 110011"],
  [/railway/, "Ministry of Railways, Rail Bhawan, New Delhi – 110001"],
  [/education|\bnta\b|exam policy/, "Ministry of Education, Shastri Bhawan, New Delhi – 110001"],
  [/health/, "Ministry of Health and Family Welfare, Nirman Bhawan, New Delhi – 110011"],
  [/environment|forest|climate|clearance/, "Ministry of Environment, Forest and Climate Change, Indira Paryavaran Bhawan, New Delhi – 110003"],
  [/petroleum|natural gas|\blpg\b|ujjwala/, "Ministry of Petroleum and Natural Gas, Shastri Bhawan, New Delhi – 110001"],
  [/road transport|highway/, "Ministry of Road Transport and Highways, Transport Bhawan, New Delhi – 110001"],
  [/labour|employment/, "Ministry of Labour and Employment, Shram Shakti Bhawan, New Delhi – 110001"],
  [/housing|urban affairs/, "Ministry of Housing and Urban Affairs, Nirman Bhawan, New Delhi – 110011"],
  [/external affairs/, "Ministry of External Affairs, South Block, New Delhi – 110011"],
  [/law and justice|law minister/, "Ministry of Law and Justice, Shastri Bhawan, New Delhi – 110001"],
  [/agriculture|farmer/, "Ministry of Agriculture and Farmers' Welfare, Krishi Bhawan, New Delhi – 110001"],
  [/statistics|programme implementation|\bplfs\b/, "Ministry of Statistics and Programme Implementation, Sardar Patel Bhawan, New Delhi – 110001"],
  [/personnel|\bdopt\b/, "Department of Personnel and Training, North Block, New Delhi – 110001"],
  [/civil aviation|airport/, "Ministry of Civil Aviation, Rajiv Gandhi Bhawan, New Delhi – 110003"],
  [/air quality|\bcaqm\b/, "Commission for Air Quality Management, Vayu Bhawan, New Delhi"],
  [/staff selection|\bssc\b/, "Staff Selection Commission, Block No. 12, CGO Complex, New Delhi – 110003"],
  [/crime records|\bncrb\b/, "National Crime Records Bureau, Mahipalpur, New Delhi – 110037"],
  [/human rights|\bnhrc\b/, "National Human Rights Commission, Manav Adhikar Bhawan, New Delhi – 110023"],
  [/ganga|jal shakti|river/, "Ministry of Jal Shakti, Shram Shakti Bhawan, New Delhi – 110001"],
  [/minister|ministry/, "Ministry concerned, Government of India, New Delhi"],
  [/\bmp\b|parliament/, "Parliament House, New Delhi – 110001"],
];

function officeAddress(name, role) {
  const haystack = `${name ?? ""} ${role ?? ""}`.toLowerCase();
  const match = OFFICE_ADDRESSES.find(([pattern]) => pattern.test(haystack));
  return match ? match[1] : "Government of India, New Delhi";
}

function jobEntry(caseFile, key) {
  const role = roleForCase(caseFile, key);
  const tone = caseFile.sev === "amber" ? "amber" : "red";
  const handled = caseFile.dodge
    ? `<p class="resume-job-dodge"><span class="resume-job-dodge-k">${escapeHTML(t("cv_handled"))}</span> ${escapeHTML(caseFile.dodge)}</p>`
    : "";
  return `<li class="resume-job">
    <div class="resume-job-head">
      <span class="resume-job-role">${escapeHTML(role)}</span>
      <span class="resume-job-date">${escapeHTML(caseFile.date ?? "")}</span>
    </div>
    <p class="resume-job-project">${caseLink(caseFile)}<span class="resume-job-cat"> · ${escapeHTML(category(caseFile.cat ?? ""))}</span></p>
    <p class="resume-job-desc">${escapeHTML(caseFile.what ?? "")}</p>
    ${handled}
    <p class="resume-job-outcome ${tone}">${escapeHTML(caseField(caseFile, "stamp"))}</p>
  </li>`;
}

function outcomeTally(cases) {
  const tally = new Map();
  cases.forEach((c) => {
    if (!c.stamp) return;
    const label = caseField(c, "stamp");
    tally.set(label, (tally.get(label) ?? 0) + 1);
  });
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function competenciesFor(cases) {
  const stamps = cases.map((c) => `${c.stamp ?? ""}`);
  return COMPETENCIES
    .map((competency) => ({
      key: competency.key,
      n: stamps.filter((stamp) => competency.test.test(stamp)).length,
    }))
    .filter((competency) => competency.n > 0)
    .sort((a, b) => b.n - a.n);
}

/**
 * The "Questions" line. If this office-holder has a case on file about refusing
 * to face the press, that case is cited by name and linked, rather than the
 * generic line — the specific, sourced version is the one that lands.
 */
function pressLine(cases) {
  const onRecord = cases.find((c) => /press conference|took the questions/i.test(`${c.title} ${c.stamp}`));
  if (!onRecord) return escapeHTML(t("cv_press"));
  return `${escapeHTML(t("cv_press_never"))} ${caseLink(onRecord)}`;
}

/** A collapsible block. Native <details> so it works without JS and stays accessible. */
function foldable(title, hint, body, { open = false } = {}) {
  return `<details class="resume-fold"${open ? " open" : ""}>
    <summary class="resume-fold-summary">
      <span class="resume-fold-title">${escapeHTML(title)}</span>
      ${hint ? `<span class="resume-fold-hint">${escapeHTML(hint)}</span>` : ""}
      <span class="resume-fold-plus" aria-hidden="true">+</span>
    </summary>
    <div class="resume-fold-body">${body}</div>
  </details>`;
}

function renderProfile(group) {
  const key = group.key;
  const cases = [...group.cases].sort((a, b) => b.sk - a.sk);
  const currentRole = roleForCase(cases[0], key);
  const roles = [...new Set(cases.map((c) => roleForCase(c, key)))];
  const unanswered = cases.filter((c) => c.sev !== "amber").length;
  const since = Math.min(...cases.map((c) => Number(c.year) || 9999));
  const slug = slugify(group.name);
  const shareUrl = new URL(`../minister/${encodeURIComponent(slug)}/`, location.href).href;

  // num is already-safe HTML: plain counts are escaped here, figures by figure().
  const metrics = [
    { num: escapeHTML(String(cases.length)), lbl: t("cv_postings") },
    { num: formatCost(group.cost), lbl: t("cv_costs") },
    { num: formatDeaths(group.deaths), lbl: t("cv_deaths") },
    { num: escapeHTML(String(unanswered)), lbl: t("cv_unanswered") },
  ].map((metric) => `<div class="resume-metric">
      <span class="resume-metric-num">${metric.num}</span>
      <span class="resume-metric-lbl">${escapeHTML(metric.lbl)}</span>
    </div>`).join("");

  const competencies = competenciesFor(cases).map((competency) => `<li class="resume-comp">
      <span class="resume-comp-label">${escapeHTML(t(competency.key))}</span>
      <span class="resume-comp-count">${escapeHTML(competency.n === 1 ? t("cv_comp_count_one") : t("cv_comp_count", { n: competency.n }))}</span>
    </li>`).join("");

  const tally = outcomeTally(cases).map(([stamp, n]) => `<li>${n}&times; ${escapeHTML(stamp)}</li>`).join("");

  profileView.innerHTML = `
    <div class="resume-toolbar">
      <a class="resume-back" href="./">${escapeHTML(t("cv_back"))}</a>
      <div class="resume-share">
        <button type="button" class="resume-share-btn" data-share-url="${escapeHTML(shareUrl)}">${escapeHTML(t("cv_share"))}</button>
        <button type="button" class="resume-share-btn" data-copy-url="${escapeHTML(shareUrl)}">${escapeHTML(t("cv_copy"))}</button>
        <a class="resume-share-btn" href="../assets/og/minister-${encodeURIComponent(slug)}.svg" target="_blank" rel="noopener">${escapeHTML(t("cv_card"))}</a>
      </div>
    </div>

    <article class="resume">
      <header class="resume-head">
        <div class="resume-photo" aria-hidden="true">
          <span class="resume-photo-initials">${escapeHTML(initials(group.name))}</span>
          <span class="resume-photo-caption">${t("cv_photo_missing")}</span>
        </div>
        <div class="resume-heading">
          <p class="eyebrow">${escapeHTML(t("cv_eyebrow"))}</p>
          <h1 class="title">${escapeHTML(group.name)}<br><span class="thin">${escapeHTML(currentRole)}</span></h1>
          <p class="resume-verdict">${escapeHTML(verdict(cases.length, unanswered))}</p>
          <p class="resume-since">${escapeHTML(t("cv_since", { year: since }))}</p>
        </div>
      </header>

      <section class="resume-section">
        <h2 class="resume-h2">${escapeHTML(t("cv_perf"))}</h2>
        <div class="resume-metrics">${metrics}</div>
        <p class="resume-caveat">${escapeHTML(t("cv_caveat"))}</p>
      </section>

      <section class="resume-section">
        <h2 class="resume-h2">${escapeHTML(t("cv_contact"))}</h2>
        <dl class="resume-contact">
          <div><dt>${escapeHTML(t("cv_addr_label"))}</dt><dd>${escapeHTML(officeAddress(group.name, currentRole))}</dd></div>
          <div><dt>${escapeHTML(t("cv_grievance_label"))}</dt><dd>${escapeHTML(t("cv_grievance"))}</dd></div>
          <div><dt>${escapeHTML(t("cv_press_label"))}</dt><dd>${pressLine(cases)}</dd></div>
        </dl>
      </section>

      <div class="resume-folds">
        ${competencies ? foldable(t("cv_competencies"), t("cv_comp_hint"), `<ul class="resume-comps">${competencies}</ul>`) : ""}
        ${foldable(t("cv_experience"), t("cv_experience_hint", { n: cases.length }), `<ul class="resume-jobs">${cases.map((c) => jobEntry(c, key)).join("")}</ul>`)}
        ${tally ? foldable(t("cv_outcomes"), t("cv_outcomes_hint"), `<ul class="resume-outcomes">${tally}</ul>`) : ""}
        ${foldable(t("cv_references"), "", `<p class="resume-body">${escapeHTML(t("cv_references_body"))}</p>
          <p class="resume-body"><a href="../corrections/">${escapeHTML(t("cv_corrections_cta"))}</a></p>
          ${roles.length > 1 ? `<p class="resume-fine">${escapeHTML(t("cv_titles_held", { roles: roles.join(", ") }))}</p>` : ""}`)}
      </div>
    </article>`;

  profileView.hidden = false;
  dashboardView.hidden = true;
}

async function shareProfile(url, { copyOnly = false } = {}) {
  const title = document.querySelector(".resume-heading .title")?.textContent?.trim() ?? "Accountability Ledger";
  if (!copyOnly && navigator.share) {
    try {
      await navigator.share({ title, url });
      return null;
    } catch {
      // Cancelled or unsupported. Fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return t("cv_copied");
  } catch {
    window.prompt("Copy this link:", url);
    return null;
  }
}

profileView.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-share-url],[data-copy-url]");
  if (!button) return;
  const copyOnly = button.hasAttribute("data-copy-url");
  const url = button.dataset.shareUrl ?? button.dataset.copyUrl;
  const done = await shareProfile(url, { copyOnly });
  if (done) button.textContent = done;
});

// Delegated so the handler survives every re-render of the table body.
rows.addEventListener("click", (event) => {
  const toggle = event.target.closest(".more-toggle");
  if (!toggle) return;
  const extra = toggle.parentElement.querySelector(".more-cases");
  if (!extra) return;
  const expanded = extra.hidden;
  extra.hidden = !expanded;
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.textContent = expanded ? t("show_fewer") : t("more_n", { n: extra.dataset.count });
});

let GROUPS = [];
let PROFILE = null;

function draw() {
  if (PROFILE) renderProfile(PROFILE);
  else renderTable(GROUPS);
}

// The table and the CV are both built in JS, so a language switch redraws them.
document.addEventListener("ledger:langchange", () => { if (GROUPS.length) draw(); });

loadCases()
  .then((cases) => {
    GROUPS = dashboard(cases);
    const wanted = new URLSearchParams(location.search).get("minister");
    const exactKey = wanted ? wanted.trim().toLocaleLowerCase() : "";
    PROFILE = exactKey ? GROUPS.find((group) => group.key === exactKey) ?? null : null;

    if (!PROFILE && wanted) search.value = wanted;
    draw();

    if (PROFILE) return;
    search.addEventListener("input", () => {
      const url = new URL(location.href);
      search.value.trim() ? url.searchParams.set("minister", search.value.trim()) : url.searchParams.delete("minister");
      history.replaceState({}, "", url);
      renderTable(GROUPS);
    });
  })
  .catch(() => {
    count.textContent = t("dash_error");
  });
