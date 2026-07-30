const rows = document.querySelector("#minister-rows");
const search = document.querySelector("#minister-search");
const count = document.querySelector("#dashboard-count");
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

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

function render(groups) {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = groups.filter((group) => group.name.toLocaleLowerCase().includes(query));
  count.textContent = `${filtered.length} office-holders shown`;
  rows.innerHTML = filtered.map((group) => {
    const links = group.cases
      .slice(0, 3)
      .map((caseFile) => `<a href="../?case=${encodeURIComponent(caseFile.id ?? `case-${caseFile.no}`)}">${escapeHTML(caseFile.title)}</a>`)
      .join(", ");
    const remaining = group.cases.length > 3 ? ` +${group.cases.length - 3} more` : "";
    const outcomes = [...group.outcomes].slice(0, 2).map(escapeHTML).join(" · ");
    return `<tr>
      <th scope="row"><span>${escapeHTML(group.name)}</span><small>${links}${remaining}</small></th>
      <td data-label="Cases">${group.cases.length}</td>
      <td data-label="Estimated costs">${formatCost(group.cost)}</td>
      <td data-label="Estimated deaths">${formatDeaths(group.deaths)}</td>
      <td data-label="Outcome">${outcomes || "—"}</td>
    </tr>`;
  }).join("") || "<tr><td class=\"table-empty\" colspan=\"5\">No office-holder matches that search.</td></tr>";
}

loadCases()
  .then((cases) => {
    const groups = dashboard(cases);
    const initial = new URLSearchParams(location.search).get("minister");
    if (initial) search.value = initial;
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
