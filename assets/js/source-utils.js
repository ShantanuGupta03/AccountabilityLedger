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


  /* ---------- office-holders ---------- */

  /**
   * Institution names whose own commas would otherwise be read as separators.
   * Better fixed in assets/data/cases.json by writing the name unambiguously;
   * until then this keeps the ministry from being split into two office-holders.
   */
  const NON_SPLIT_NAMES = new Set(["ministry of environment, forest and climate change"]);

  /**
   * "A / B" and "A, B" name separate office-holders and must become separate
   * entries — case 8 lists three ministers that way. A comma inside brackets is
   * part of one name, though: "BJP state governments (UP, MP, Rajasthan and
   * others)" is a single entry.
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

  /* ---------- party and government ----------
     Two different facts, kept apart on purpose.

     The government of the day is derivable from a date and is a matter of
     record. An individual's party is not derivable from anything and is only
     shown where the data states it, because a Union minister frequently belongs
     to a coalition ally rather than to the party leading the coalition: A. Raja
     and Dayanidhi Maran were DMK ministers in a Congress-led UPA cabinet, and
     George Fernandes was Samata Party in a BJP-led NDA one. Printing the
     coalition's party against their name would be false.

     Mirrored in scripts/generate_pages.mjs, which cannot import this file. */

  const UNION_GOVERNMENTS = [
    { from: 19981019, to: 20040522, label: "NDA", full: "NDA (BJP-led)", pm: "Vajpayee" },
    { from: 20040522, to: 20140526, label: "UPA", full: "UPA (Congress-led)", pm: "Manmohan Singh" },
    { from: 20140526, to: 99999999, label: "NDA", full: "NDA (BJP-led)", pm: "Modi" },
  ];

  function unionGovernment(sk) {
    const key = Number(sk);
    if (!Number.isFinite(key)) return null;
    return UNION_GOVERNMENTS.find((era) => key >= era.from && key < era.to) ?? null;
  }

  /** A party the role text already names, e.g. "Karnataka Chief Minister (BJP)". */
  function statedParty(role) {
    const match = /\((BJP|Congress|INC|BSP|NCP|DMK|AIADMK|TMC|SP|RJD|Shiv Sena|AAP|Samata Party|JD\(U\))\b[^)]*\)/i
      .exec(String(role ?? ""));
    return match ? match[1] : null;
  }

  /* ---------- public authorities ----------
     Real, public, institutional addresses for the offices this ledger names.
     Used for the letterhead on a personnel file and for the addressee on a
     generated RTI application, so both have to agree. Never a personal address. */

  /**
   * A state RTI goes to that state's SPIO at that state's secretariat, so the
   * state has to be identified before any generic "chief minister" rule can
   * swallow it. This block therefore runs first, and order inside it matters
   * only where one state's name could appear in another's entry.
   */
  const STATE_OFFICES = [
    // "MP" and "UP" are also "Member of Parliament" and "up", so those two need
    // the office named alongside the abbreviation before they can match.
    [/\bmp\b.*(chief minister|\bcm\b)|(chief minister|\bcm\b).*\bmp\b|madhya pradesh/, "Chief Minister's Office, Vallabh Bhawan, Bhopal – 462004"],
    [/\bup\b.*(chief minister|\bcm\b)|(chief minister|\bcm\b).*\bup\b|uttar pradesh/, "Chief Minister's Office, Lok Bhawan, Lucknow – 226001"],
    [/uttarakhand/, "Uttarakhand Secretariat, Subhash Road, Dehradun – 248001"],
    [/manipur/, "Chief Minister's Office, Manipur Secretariat, Imphal – 795001"],
    [/gujarat/, "Chief Minister's Office, Swarnim Sankul, Gandhinagar – 382010"],
    [/maharashtra/, "Mantralaya, Madame Cama Road, Mumbai – 400032"],
    [/karnataka|bengaluru|bangalore/, "Karnataka Government Secretariat, Vidhana Soudha, Bengaluru – 560001"],
    [/\bgoa\b/, "Secretariat, Government of Goa, Porvorim – 403521"],
    [/jharkhand/, "Jharkhand Secretariat, Project Bhawan, Dhurwa, Ranchi – 834004"],
    [/west bengal/, "West Bengal Secretariat, Nabanna, 325 Sarat Chatterjee Road, Howrah – 711102"],
    [/\bassam\b/, "Assam Secretariat, Janata Bhawan, Dispur, Guwahati – 781006"],
    [/ladakh/, "UT Secretariat, Ladakh, Leh – 194101", { ut: true }],
    // The LG is not the secretariat, so the office is named before the state is.
    [/lieutenant governor.*(jammu|kashmir|\bj&k\b)|(jammu|kashmir|\bj&k\b).*lieutenant governor/, "Office of the Lieutenant Governor, Raj Bhavan, Srinagar – 190001", { ut: true }],
    [/jammu|kashmir|\bj&k\b/, "Civil Secretariat, Jammu and Kashmir, Srinagar – 190001", { ut: true }],
    [/rajasthan/, "Government Secretariat, Jaipur – 302005"],
    [/\bbihar\b/, "Main Secretariat, Patna – 800015"],
    [/tamil nadu/, "Secretariat, Fort St George, Chennai – 600009"],
    [/\bkerala\b/, "Government Secretariat, Thiruvananthapuram – 695001"],
    [/odisha|orissa/, "Odisha Secretariat, Lok Seva Bhawan, Bhubaneswar – 751001"],
    [/\bpunjab\b/, "Punjab Civil Secretariat, Sector 1, Chandigarh – 160001"],
    [/haryana/, "Haryana Civil Secretariat, Sector 1, Chandigarh – 160001"],
    [/chhattisgarh/, "Mahanadi Bhawan, Mantralaya, Naya Raipur – 492002"],
    [/telangana/, "Telangana Secretariat, Hyderabad – 500022"],
    [/andhra pradesh/, "Andhra Pradesh Secretariat, Velagapudi, Amaravati – 522503"],
    [/himachal/, "Himachal Pradesh Secretariat, Shimla – 171002"],
    // Delhi Police answers to the Union Home Ministry, not to the Delhi
    // government, so a bare "Delhi" must not route here. The state office is
    // claimed only where the Delhi government itself is named.
    [/delhi (chief minister|government|cabinet)|government of nct|(chief minister|deputy chief minister)[^.]*delhi/, "Delhi Secretariat, IP Estate, New Delhi – 110002", { ut: true }],
  ];

  const OFFICE_ADDRESSES = [
    [/prime minister/, "Prime Minister's Office, South Block, New Delhi – 110011"],
    // The trustees are the PM and three Union ministers, and the fund has told
    // applicants for four years that it is not a public authority at all.
    [/pm cares|ex-officio (chairman|trustee)/, "PM CARES Fund, Prime Minister's Office, South Block, New Delhi – 110011"],
    ...STATE_OFFICES,
    [/chief minister|\bcm\b/, "Office of the Chief Minister, state secretariat concerned"],
    [/lieutenant governor|\bl-?g\b/, "Raj Bhavan concerned, Government of India"],
    // \b matters on "election": "selection" would otherwise match.
    [/\belection commission\b|chief election commissioner|returning officer/, "Election Commission of India, Nirvachan Sadan, New Delhi – 110001"],
    [/reserve bank|\brbi\b|banking regulator|currency management/, "Reserve Bank of India, Central Office, Shahid Bhagat Singh Marg, Mumbai – 400001"],
    [/\bsebi\b|securities and exchange board/, "Securities and Exchange Board of India, SEBI Bhavan, Plot C4-A, G Block, Bandra Kurla Complex, Mumbai – 400051"],
    [/home (minister|ministry|affairs)|union home|\bmos home\b|ministry of home|delhi police|\bnia\b|\bcrpf\b|census|\brgi\b/, "Ministry of Home Affairs, North Block, New Delhi – 110001"],
    [/finance minister|finance ministry|\bgst\b|excise|\bcess\b/, "Ministry of Finance, North Block, New Delhi – 110001"],
    [/corporate affairs/, "Ministry of Corporate Affairs, Shastri Bhawan, New Delhi – 110001"],
    [/defence/, "Ministry of Defence, South Block, New Delhi – 110011"],
    [/railway/, "Ministry of Railways, Rail Bhawan, New Delhi – 110001"],
    [/education|\bnta\b|exam policy/, "Ministry of Education, Shastri Bhawan, New Delhi – 110001"],
    [/health/, "Ministry of Health and Family Welfare, Nirman Bhawan, New Delhi – 110011"],
    [/environment|forest|climate|clearance/, "Ministry of Environment, Forest and Climate Change, Indira Paryavaran Bhawan, New Delhi – 110003"],
    [/petroleum|natural gas|\blpg\b|ujjwala/, "Ministry of Petroleum and Natural Gas, Shastri Bhawan, New Delhi – 110001"],
    // NHAI has its own CPIO and is the body that actually holds the file, so it
    // has to be matched before the ministry that owns it.
    [/\bnhai\b|national highways authority/, "National Highways Authority of India, G-5 and G-6, Sector 10, Dwarka, New Delhi – 110075"],
    [/road transport|highway/, "Ministry of Road Transport and Highways, Transport Bhawan, New Delhi – 110001"],
    [/department of space|\bisro\b|antrix/, "Department of Space, Antariksh Bhavan, New BEL Road, Bengaluru – 560231"],
    [/\bpower\b|electricity/, "Ministry of Power, Shram Shakti Bhawan, New Delhi – 110001"],
    [/labour|employment/, "Ministry of Labour and Employment, Shram Shakti Bhawan, New Delhi – 110001"],
    [/housing|urban affairs/, "Ministry of Housing and Urban Affairs, Nirman Bhawan, New Delhi – 110011"],
    [/external affairs/, "Ministry of External Affairs, South Block, New Delhi – 110011"],
    [/law and justice|law minister/, "Ministry of Law and Justice, Shastri Bhawan, New Delhi – 110001"],
    [/agriculture|farmer/, "Ministry of Agriculture and Farmers' Welfare, Krishi Bhawan, New Delhi – 110001"],
    [/statistics|programme implementation|\bplfs\b/, "Ministry of Statistics and Programme Implementation, Sardar Patel Bhawan, New Delhi – 110001"],
    [/personnel|\bdopt\b/, "Department of Personnel and Training, North Block, New Delhi – 110001"],
    [/civil aviation|airport/, "Ministry of Civil Aviation, Rajiv Gandhi Bhawan, New Delhi – 110003"],
    [/telecom|spectrum|\bdot\b/, "Department of Telecommunications, Sanchar Bhawan, New Delhi – 110001"],
    [/\bcoal\b/, "Ministry of Coal, Shastri Bhawan, New Delhi – 110001"],
    [/mining|mines|iron ore/, "Ministry of Mines, Shastri Bhawan, New Delhi – 110001"],
    [/sports|youth affairs|games/, "Ministry of Youth Affairs and Sports, Shastri Bhawan, New Delhi – 110001"],
    [/\biaf\b|air chief|air force/, "Air Headquarters (Vayu Bhawan), Rafi Marg, New Delhi – 110106"],
    [/air quality|\bcaqm\b/, "Commission for Air Quality Management, Vayu Bhawan, New Delhi"],
    [/staff selection|\bssc\b/, "Staff Selection Commission, Block No. 12, CGO Complex, New Delhi – 110003"],
    [/crime records|\bncrb\b/, "National Crime Records Bureau, Mahipalpur, New Delhi – 110037"],
    [/human rights|\bnhrc\b/, "National Human Rights Commission, Manav Adhikar Bhawan, New Delhi – 110023"],
    [/ganga|jal shakti|river/, "Ministry of Jal Shakti, Shram Shakti Bhawan, New Delhi – 110001"],
    /* A party post is not a public office and must not be handed a government
       address. These sit below every state and ministry rule on purpose: half
       the office-holders in this ledger carry a party in brackets after their
       real job, and "(BJP)" must never outrank "Karnataka Chief Minister". */
    [/\bparty president\b|\bbjp president\b|party chief/, "Party headquarters, New Delhi. Not a public office."],
    [/bharatiya janata party|indian national congress|\blocal bjp\b/, "Party headquarters. Not a public office."],
    [/teerth kshetra|janmabhoomi trust/, "Shri Ram Janmabhoomi Teerth Kshetra Trust, Ayodhya. A private trust, not a public office."],
    [/minister|ministry/, "Ministry concerned, Government of India, New Delhi"],
    [/\bmp\b|parliament/, "Parliament House, New Delhi – 110001"],
    [/state government|state administration|\bpolice\b/, "State secretariat concerned"],
  ];

  function officeAddress(name, role) {
    const haystack = `${name ?? ""} ${role ?? ""}`.toLowerCase();
    const match = OFFICE_ADDRESSES.find(([pattern]) => pattern.test(haystack));
    return match ? match[1] : "Government of India, New Delhi";
  }

  /**
   * Whether the RTI goes to a State Public Information Officer or a Central
   * one, which also settles the fee rules, the portal and the appellate
   * commission. Read off the resolved address rather than off the role text, so
   * the addressee and the instructions under it can never disagree.
   *
   * Union territories are central, not state, however much they look like one:
   * Section 2 makes the Central Government the appropriate government for a UT,
   * so Delhi, J&K and Ladakh take a CPIO and appeal to the CIC. They are
   * flagged in the table rather than guessed at from the address.
   */
  const STATE_ADDRESSES = new Set(
    STATE_OFFICES.filter(([, , meta]) => !meta?.ut).map(([, address]) => address),
  );

  function isStateAuthority(name, role) {
    const address = officeAddress(name, role);
    // "state secretariat concerned" is the unresolved placeholder; it is still a
    // state, the ledger just does not record which one.
    return STATE_ADDRESSES.has(address) || /state secretariat/i.test(address);
  }

  window.SourceUtils = {
    classify, tierMeta, host, slugify, TIER_META, escapeHTML,
    formatCrore, croreToUsd, formatPeople, peopleToInternational, figure, INR_PER_USD,
    officeAddress, isStateAuthority, splitOfficeHolders, unionGovernment, statedParty,
  };
})();
