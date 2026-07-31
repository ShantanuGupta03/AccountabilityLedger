/** Evidentiary tiers and archive helpers, shared by the ledger and dashboard. */
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

  window.SourceUtils = { classify, tierMeta, host, slugify, TIER_META };
})();
