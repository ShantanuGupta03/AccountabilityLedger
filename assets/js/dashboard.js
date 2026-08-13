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

// Shared with the RTI generator, which has to name the same office-holders.
const splitOfficeHolders = (name) => window.SourceUtils?.splitOfficeHolders(name)
  ?? [String(name ?? "").trim()].filter(Boolean);

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
  // The reader-submitted feed is the only part of this that can come back
  // malformed, and spreading a non-array throws before a single row is drawn —
  // which is what an empty dashboard looks like from the outside. The static
  // file is the floor: whatever the API does, the ledger still renders.
  const extra = Array.isArray(published?.cases) ? published.cases : [];
  if (!Array.isArray(staticCases)) throw new Error("cases.json did not parse as a list.");
  return [...staticCases, ...extra];
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

/**
 * The party and government to show beside an office-holder.
 *
 * Two separate facts, and the distinction is the whole point. The government of
 * the day comes from the case date and only applies where the office is a Union
 * one — it says which coalition was in power, not which party the person
 * belonged to. The party itself is shown only where a case already names it,
 * because inferring one would eventually put a false affiliation against a real
 * person's name, and on this site that is unforgivable rather than untidy.
 */
function affiliations(group) {
  const parties = new Set();
  const governments = new Set();
  group.cases.forEach((caseFile) => {
    (caseFile.ministers ?? []).forEach((minister) => {
      if (!splitOfficeHolders(minister.n).some((name) => name.toLocaleLowerCase() === group.key)) return;
      const stated = SU?.statedParty(minister.r);
      if (stated) parties.add(stated);
      // Union offices only. A state minister's party is not settled by the date.
      if (!SU?.isStateAuthority(minister.n, minister.r)) {
        const era = SU?.unionGovernment(caseFile.sk);
        if (era) governments.add(era.label);
      }
    });
  });
  return { parties: [...parties], governments: [...governments].sort() };
}

function affiliationLine(group) {
  const { parties, governments } = affiliations(group);
  const chips = [];
  parties.forEach((party) => chips.push(`<span class="party-chip">${escapeHTML(party)}</span>`));
  governments.forEach((gov) => chips.push(
    `<span class="party-chip gov" title="${escapeHTML(t("dash_gov_hint"))}">${escapeHTML(gov)}</span>`,
  ));
  if (!chips.length) {
    return `<span class="party-chip none">${escapeHTML(t("dash_party_unknown"))}</span>`;
  }
  return chips.join("");
}

function caseLink(caseFile) {
  const id = caseFile.id ?? `case-${caseFile.no}`;
  return `<a href="../?case=${encodeURIComponent(id)}">${escapeHTML(caseField(caseFile, "title"))}</a>`;
}

function renderTable(groups) {
  dashboardView.hidden = false;
  profileView.hidden = true;
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
      <th scope="row"><span>${ministerLink(group.name)}</span>
        <span class="party-line">${affiliationLine(group)}</span>
        <small>${links}${rest}</small></th>
      <td data-label="${escapeHTML(t("th_cases"))}">${group.cases.length}</td>
      <td data-label="${escapeHTML(t("th_costs"))}">${formatCost(group.cost)}</td>
      <td data-label="${escapeHTML(t("th_deaths"))}">${formatDeaths(group.deaths)}</td>
      <td data-label="${escapeHTML(t("th_outcome"))}">${outcomes || "—"}</td>
    </tr>`;
  }).join("") || `<tr><td class="table-empty" colspan="5">${escapeHTML(t("dash_empty"))}</td></tr>`;
  document.dispatchEvent(new CustomEvent("dashboard:rendered"));
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
 * A CV parody wants a letterhead address, and the table it comes from lives in
 * source-utils.js: the real, public, institutional address of the office
 * concerned, never a personal or residential one. It is shared so that the RTI
 * generator addresses its application to exactly the authority this page
 * prints on the CV, rather than to a second, quietly different guess.
 */
const officeAddress = (name, role) => window.SourceUtils?.officeAddress(name, role)
  ?? "Government of India, New Delhi";

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
  if (!firstDraw) window.LedgerMotion?.pulse(document.querySelector(".dashboard-page"));
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
  if (!copyOnly && navigator.share) {
    try {
      // URL only. See assets/js/app.js: a share sheet's Copy action flattens
      // every field it was given into one string, which ruins the link as a
      // citation. The page's OG tags supply the headline to targets that want one.
      await navigator.share({ url });
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
  const willOpen = extra.hidden;
  if (willOpen) {
    extra.hidden = false;
    requestAnimationFrame(() => extra.classList.add("is-open"));
  } else {
    extra.classList.remove("is-open");
    const onEnd = (e) => {
      if (e.propertyName !== "opacity") return;
      extra.hidden = true;
      extra.removeEventListener("transitionend", onEnd);
    };
    extra.addEventListener("transitionend", onEnd);
  }
  toggle.setAttribute("aria-expanded", String(willOpen));
  toggle.textContent = willOpen ? t("show_fewer") : t("more_n", { n: extra.dataset.count });
});

let GROUPS = [];
let PROFILE = null;
let firstDraw = true;

function draw() {
  try {
    if (PROFILE) renderProfile(PROFILE);
    else renderTable(GROUPS);
  } catch (error) {
    count.textContent = t("dash_error");
    count.classList.add("error");
    console.error("Dashboard failed to render:", error);
  } finally {
    firstDraw = false;
  }
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
      window.LedgerMotion?.pulse(document.querySelector(".table-wrap"));
      renderTable(GROUPS);
    });
  })
  .catch((error) => {
    // Say what broke. A silent blank table is indistinguishable from "nobody in
    // this country was ever responsible for anything", which is funny once and
    // then just looks like the site is down.
    count.textContent = t("dash_error");
    count.classList.add("error");
    console.error("Dashboard failed to load:", error);
    const rows = document.querySelector("#minister-rows");
    if (rows && !rows.children.length) {
      const cell = document.createElement("td");
      cell.className = "table-empty";
      cell.colSpan = 5;
      cell.textContent = t("dash_error");
      const row = document.createElement("tr");
      row.append(cell);
      rows.append(row);
    }
  });
