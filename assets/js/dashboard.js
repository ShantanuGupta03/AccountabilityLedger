const dashboardView = document.querySelector("#dashboard-view");
const profileView = document.querySelector("#profile-view");
const rows = document.querySelector("#minister-rows");
const search = document.querySelector("#minister-search");
const count = document.querySelector("#dashboard-count");
const slugify = window.SourceUtils?.slugify ?? ((name) => String(name).toLowerCase().replace(/\s+/g, "-"));
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function ministerLink(name) {
  const slug = slugify(name);
  return slug ? `<a class="minister-profile" href="?minister=${encodeURIComponent(name)}">${escapeHTML(name)}</a>` : escapeHTML(name);
}

function splitOfficeHolders(name) {
  return String(name).split(/\s*\/\s*|\s*,\s*/).map((item) => item.trim()).filter(Boolean);
}

function formatCost(value) {
  if (!value) return "—";
  return value >= 100000 ? `₹${(value / 100000).toFixed(2)}L cr` : `₹${Math.round(value).toLocaleString("en-IN")} cr`;
}

function formatDeaths(value) {
  if (!value) return "—";
  return value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` : Math.round(value).toLocaleString("en-IN");
}

async function loadCases() {
  const staticCases = await fetch("../assets/data/cases.json").then((response) => {
    if (!response.ok) throw new Error("Unable to load the ledger.");
    return response.json();
  });
  const published = await fetch("../api/cases")
    .then((response) => response.ok ? response.json() : { cases: [] })
    .catch(() => ({ cases: [] }));
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
      const group = groups.get(key) ?? { name, cases: [], cost: 0, deaths: 0, outcomes: new Set() };
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
  return `<a href="../?case=${encodeURIComponent(id)}">${escapeHTML(caseFile.title)}</a>`;
}

function render(groups) {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = groups.filter((group) => group.name.toLocaleLowerCase().includes(query));
  count.textContent = `${filtered.length} office-holders shown`;
  rows.innerHTML = filtered.map((group) => {
    const links = group.cases.slice(0, VISIBLE_CASES).map(caseLink).join(", ");
    const hidden = group.cases.slice(VISIBLE_CASES);
    const rest = hidden.length
      ? `<span class="more-cases" data-count="${hidden.length}" hidden>, ${hidden.map(caseLink).join(", ")}</span>`
        + `<button type="button" class="more-toggle" aria-expanded="false">+${hidden.length} more</button>`
      : "";
    const outcomes = [...group.outcomes].slice(0, 2).map(escapeHTML).join(" · ");
    return `<tr>
      <th scope="row"><span>${ministerLink(group.name)}</span><small>${links}${rest}</small></th>
      <td data-label="Cases">${group.cases.length}</td>
      <td data-label="Costs in these cases">${formatCost(group.cost)}</td>
      <td data-label="Deaths in portfolio">${formatDeaths(group.deaths)}</td>
      <td data-label="Outcome">${outcomes || "—"}</td>
    </tr>`;
  }).join("") || "<tr><td class=\"table-empty\" colspan=\"5\">No office-holder matches that search.</td></tr>";
}

// --- Personnel-file / CV profile view -------------------------------------

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 3).join("").toUpperCase();
}

function roleForCase(caseFile, key) {
  for (const minister of caseFile.ministers ?? []) {
    if (splitOfficeHolders(minister.n).some((name) => name.toLocaleLowerCase() === key)) {
      return minister.r || "Office-holder";
    }
  }
  return "Office-holder";
}

// A satirical CV needs a "registered address" line, but this ledger publishes nothing
// it cannot stand behind, so this only ever names the real, public institutional
// address for the kind of office described in "role" text, never a personal one.
function officeAddress(role) {
  const r = String(role ?? "").toLowerCase();
  if (r.includes("prime minister")) return "Prime Minister's Office, South Block, New Delhi – 110011";
  if (r.includes("chief minister") || /\bcm\b/.test(r)) {
    if (r.includes(" mp ") || r.includes("(mp)") || r.startsWith("mp ")) return "Chief Minister's Office, Vallabh Bhawan, Bhopal";
    if (r.includes(" up ") || r.includes("(up)") || r.startsWith("up ")) return "Chief Minister's Office, Lok Bhawan, Lucknow";
    if (r.includes("manipur")) return "Chief Minister's Office, Manipur Secretariat, Imphal";
    return "Office of the Chief Minister, state secretariat concerned";
  }
  if (r.includes("lieutenant governor")) return "Raj Bhavan concerned, Government of India";
  if (r.includes("minister")) return "Ministry concerned, Government of India, New Delhi";
  if (r.includes("mp ") || r.includes(" mp") || r.includes("election commission")) return "Parliament House, New Delhi – 110001";
  return "Government of India, New Delhi";
}

function jobEntry(caseFile, key) {
  const role = roleForCase(caseFile, key);
  const outcomeClass = caseFile.sev === "amber" ? "amber" : "red";
  return `<li class="resume-job">
    <div class="resume-job-head">
      <span class="resume-job-role">${escapeHTML(role)}</span>
      <span class="resume-job-date">${escapeHTML(caseFile.date ?? "")}</span>
    </div>
    <p class="resume-job-project">${caseLink(caseFile)}<span class="resume-job-cat"> · ${escapeHTML(caseFile.cat ?? "")}</span></p>
    <p class="resume-job-desc">${escapeHTML(caseFile.what ?? "")}</p>
    <p class="resume-job-outcome stamp-inline ${outcomeClass}">${escapeHTML(caseFile.stamp ?? "Outcome not recorded")}</p>
  </li>`;
}

function outcomeTally(cases) {
  const tally = new Map();
  cases.forEach((c) => {
    if (!c.stamp) return;
    tally.set(c.stamp, (tally.get(c.stamp) ?? 0) + 1);
  });
  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
}

function renderProfile(group, key) {
  const cases = [...group.cases].sort((a, b) => b.sk - a.sk);
  const currentRole = roleForCase(cases[0], key);
  const roles = [...new Set(cases.map((c) => roleForCase(c, key)))];
  const tally = outcomeTally(cases);

  const html = `
    <a class="resume-back" href="./">&#8592; Back to the full dashboard</a>
    <article class="resume">
      <header class="resume-head">
        <div class="resume-photo" aria-hidden="true">
          <span class="resume-photo-initials">${escapeHTML(initials(group.name))}</span>
          <span class="resume-photo-caption">Photo not on file<br>see sourced cases below</span>
        </div>
        <div class="resume-heading">
          <p class="eyebrow">Personnel file</p>
          <h1 class="title">${escapeHTML(group.name)}<br><span class="thin">${escapeHTML(currentRole)}</span></h1>
          <p class="standfirst">Compiled entirely from cases already sourced in this ledger. Every claim below links to the record it comes from; nothing here is asserted as personal guilt for any death or any rupee.</p>
        </div>
      </header>

      <section class="resume-section">
        <h2 class="resume-h2">Objective</h2>
        <p class="resume-body">Seeking continued public office. Prior postings and the record made in each are listed below, in the applicant's own file.</p>
      </section>

      <section class="resume-section">
        <h2 class="resume-h2">Contact</h2>
        <dl class="resume-contact">
          <div><dt>Registered address</dt><dd>${escapeHTML(officeAddress(currentRole))}</dd></div>
          <div><dt>Grievance channel</dt><dd>CPGRAMS, pgportal.gov.in (Government of India)</dd></div>
          <div><dt>Press / statements</dt><dd>Routed through the office's own spokesperson; see each posting below for any response on record.</dd></div>
        </dl>
      </section>

      <section class="resume-section">
        <h2 class="resume-h2">Work experience</h2>
        <ul class="resume-jobs">${cases.map((c) => jobEntry(c, key)).join("")}</ul>
      </section>

      <section class="resume-section">
        <h2 class="resume-h2">Performance record</h2>
        <div class="resume-metrics">
          <div class="resume-metric"><span class="resume-metric-num">${cases.length}</span><span class="resume-metric-lbl">Postings on file</span></div>
          <div class="resume-metric"><span class="resume-metric-num">${formatCost(group.cost)}</span><span class="resume-metric-lbl">Costs recorded in these postings</span></div>
          <div class="resume-metric"><span class="resume-metric-num">${formatDeaths(group.deaths)}</span><span class="resume-metric-lbl">Deaths recorded in these postings</span></div>
        </div>
        <ul class="resume-outcomes">${tally.map(([stamp, n]) => `<li>${n}&times; ${escapeHTML(stamp)}</li>`).join("")}</ul>
        <p class="resume-caveat">Read every figure above as "recorded in postings held by this office", never as "caused by this person". Holding an office at the time a failure happened is a matter of public record, not a finding of personal responsibility.</p>
      </section>

      <section class="resume-section">
        <h2 class="resume-h2">References</h2>
        <p class="resume-body">Available publicly. Every posting above cites the court record, audit, official release or reporting it is drawn from &mdash; open any of them to verify. Something wrong here? Use the <a href="../corrections/">corrections and right-of-reply desk</a>.</p>
      </section>

      ${roles.length > 1 ? `<p class="resume-fine">Titles held across these postings: ${roles.map(escapeHTML).join(", ")}.</p>` : ""}
    </article>`;

  profileView.innerHTML = html;
  profileView.hidden = false;
  dashboardView.hidden = true;
}

function showTable() {
  profileView.hidden = true;
  profileView.innerHTML = "";
  dashboardView.hidden = false;
}

// Delegated so the handler survives every re-render of the table body.
rows.addEventListener("click", (event) => {
  const toggle = event.target.closest(".more-toggle");
  if (!toggle) return;
  const extra = toggle.parentElement.querySelector(".more-cases");
  if (!extra) return;
  const expanded = extra.hidden;
  extra.hidden = !expanded;
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.textContent = expanded ? "show fewer" : `+${extra.dataset.count} more`;
});

loadCases()
  .then((cases) => {
    const groups = dashboard(cases);
    const wanted = new URLSearchParams(location.search).get("minister");
    const exactKey = wanted ? wanted.trim().toLocaleLowerCase() : "";
    const match = exactKey ? groups.find((group) => group.name.toLocaleLowerCase() === exactKey) : null;

    if (match) {
      renderProfile(match, exactKey);
      return;
    }

    if (wanted) search.value = wanted;
    render(groups);
    search.addEventListener("input", () => {
      const url = new URL(location.href);
      search.value.trim() ? url.searchParams.set("minister", search.value.trim()) : url.searchParams.delete("minister");
      history.replaceState({}, "", url);
      render(groups);
    });
  })
  .catch(() => {
    count.textContent = "The dashboard could not be loaded.";
  });
