/** Evidentiary tiers, archive helpers and figure formatting, shared by the ledger and dashboard. */
(() => {
  const TIER_1 = new Set([
    "indiankanoon.org", "sci.gov.in", "main.sci.gov.in", "digiscr.sci.gov.in",
    "cag.gov.in", "egazette.gov.in", "indiacode.nic.in", "rbi.org.in", "sansad.in",
    "pmc.ncbi.nlm.nih.gov", "healthdata.org", "who.int",
  ]);
  const TIER_2 = new Set([
    "thehindu.com", "frontline.thehindu.com", "indianexpress.com", "deccanherald.com",
    "business-standard.com", "livemint.com", "economictimes.indiatimes.com", "businesstoday.in",
    "moneycontrol.com", "moneylife.in", "tribuneindia.com", "assamtribune.com", "theweek.in",
    "outlookindia.com", "theprint.in", "thefederal.com", "thenewsminute.com", "scroll.in",
    "thewire.in", "m.thewire.in", "caravanmagazine.in", "downtoearth.org.in", "livelaw.in",
    "barandbench.com", "scobserver.in", "bbc.com", "bbc.co.uk", "news.bbc.co.uk",
    "feeds.bbci.co.uk", "reuters.com", "theguardian.com", "aljazeera.com", "cnn.com",
    "nbcnews.com", "ft.com", "nytimes.com", "thediplomat.com", "amnesty.org", "amnestyusa.org",
    "hrw.org", "rsf.org", "accessnow.org", "energyandcleanair.org", "sflc.in", "pmindia.gov.in",
    "gstcouncil.gov.in", "archive.pib.gov.in", "sebi.gov.in", "centralvista.gov.in",
  ]);
  const TIER_3 = new Set([
    "opindia.com", "theswipeup.com", "oneworldnews.com", "india.com", "indiatvnews.com",
    "indianewsnetwork.com", "naga.com", "yahoo.com", "news.careers360.com",
    "thekashmirimages.com", "en.wikipedia.org", "wikipedia.org", "nationalheraldindia.com",
    "cjp.org.in",
  ]);

  const TIER_META = {
    1: { short: "T1", name: "Primary record", hint: "Court, audit, gazette or official publication" },
    2: { short: "T2", name: "Reporting", hint: "Independent news or documented research" },
    3: { short: "T3", name: "Partisan", hint: "Advocacy or unverified; not proof on its own" },
  };

  function host(url) {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function classify(url) {
    const h = host(url);
    if (!h) return null;
    if (TIER_3.has(h)) return 3;
    if (TIER_1.has(h)) return 1;
    if (TIER_2.has(h)) return 2;
    if (h === "prsindia.org") return url.includes("/files/bills_acts/") ? 1 : 2;
    if (h.endsWith(".gov.in") || h === "gov.in") return 1;
    if (h.endsWith(".nic.in") || h === "nic.in") return 1;
    return 2;
  }

  function tierMeta(tier) {
    return TIER_META[tier] ?? TIER_META[2];
  }

  function slugify(name) {
    return String(name ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  const escapeHTML = (value) => String(value ?? "")
    .replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  /* ---------- figures ----------
     Every figure on the site reads in Indian units. The international reading
     is the secondary one, available on hover and on tap. */

  /**
   * Approximate rupee-per-dollar marker used only for the secondary reading.
   * The rate is printed alongside the converted figure so a reader can see what
   * it was converted at instead of trusting an unstated number. Bump it when
   * the ledger's figures are next refreshed.
   */
  const INR_PER_USD = 88;

  const group = (value) => Math.round(value).toLocaleString("en-IN");
  // Unit words are translated; i18n.js loads after this file but is always
  // present by the time a figure is rendered.
  const unit = (key, fallback) => window.LedgerI18n?.t(key) || fallback;

  /** Costs are stored in crore. Renders lakh crore / crore / lakh. */
  function formatCrore(crore) {
    const value = Number(crore);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} ${unit("unit_lakh_crore", "lakh crore")}`;
    if (value >= 1) return `₹${group(value)} ${unit("unit_crore", "crore")}`;
    return `₹${(value * 100).toFixed(0)} ${unit("unit_lakh", "lakh")}`;
  }

  /** The same amount in dollars, with the rate stated. */
  function croreToUsd(crore) {
    const value = Number(crore);
    if (!Number.isFinite(value) || value <= 0) return null;
    const usd = (value * 1e7) / INR_PER_USD;
    const rate = ` ${unit("unit_at_rate", "at")} ₹${INR_PER_USD}/US$`;
    if (usd >= 1e12) return `≈US$${(usd / 1e12).toFixed(2)} ${unit("unit_trillion", "trillion")}${rate}`;
    if (usd >= 1e9) return `≈US$${(usd / 1e9).toFixed(1)} ${unit("unit_billion", "billion")}${rate}`;
    if (usd >= 1e6) return `≈US$${(usd / 1e6).toFixed(1)} ${unit("unit_million", "million")}${rate}`;
    return `≈US$${group(usd)}${rate}`;
  }

  /** People counts in Indian units: crore / lakh / plain. */
  function formatPeople(count) {
    const value = Number(count);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 1e7) return `${(value / 1e7).toFixed(2)} ${unit("unit_crore", "crore")}`;
    if (value >= 1e5) return `${(value / 1e5).toFixed(2)} ${unit("unit_lakh", "lakh")}`;
    return group(value);
  }

  /** The same count in the international scale. */
  function peopleToInternational(count) {
    const value = Number(count);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 1e9) return `≈${(value / 1e9).toFixed(2)} ${unit("unit_billion", "billion")}`;
    if (value >= 1e6) return `≈${(value / 1e6).toFixed(2)} ${unit("unit_million", "million")}`;
    if (value >= 1e3) return `≈${(value / 1e3).toFixed(1)} ${unit("unit_thousand", "thousand")}`;
    return group(value);
  }

  /**
   * A figure that carries its own second reading. Hover shows it; tap or Enter
   * swaps it in, because most readers here are on a phone and never hover.
   */
  function figure(primary, alternate) {
    if (!primary) return "—";
    if (!alternate) return escapeHTML(primary);
    return `<span class="fig" role="button" tabindex="0" aria-label="${escapeHTML(`${primary}. Also: ${alternate}`)}"`
      + ` title="${escapeHTML(alternate)}" data-fig-a="${escapeHTML(primary)}" data-fig-b="${escapeHTML(alternate)}"`
      + `>${escapeHTML(primary)}</span>`;
  }

  /** Swaps the two readings; the title always offers whichever is hidden. */
  function swapFigure(node) {
    const a = node.dataset.figA;
    const b = node.dataset.figB;
    if (!a || !b) return;
    const showingA = node.textContent.trim() === a;
    node.textContent = showingA ? b : a;
    node.setAttribute("title", showingA ? a : b);
  }

  document.addEventListener("click", (event) => {
    const node = event.target.closest?.(".fig");
    if (node) swapFigure(node);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const node = event.target.closest?.(".fig");
    if (!node) return;
    event.preventDefault();
    swapFigure(node);
  });

  window.SourceUtils = {
    classify, tierMeta, host, slugify, TIER_META, escapeHTML,
    formatCrore, croreToUsd, formatPeople, peopleToInternational, figure, INR_PER_USD,
  };
})();
