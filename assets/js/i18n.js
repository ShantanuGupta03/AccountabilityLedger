/**
 * UI strings for English and Hindi.
 *
 * Two kinds of string live here:
 *
 *   1. Static page furniture, marked up in the HTML with data-i18n*. English is
 *      whatever the HTML already says — apply() caches it on first run and
 *      restores it when switching back — so only the Hindi needs authoring here
 *      and the two copies cannot drift.
 *   2. Strings the renderers build at runtime (case fields, dashboard table, the
 *      CV). Those need both languages, because there is no DOM node to read the
 *      English off. They live in STRINGS.en.
 *
 * Scope note: the 62 case records in assets/data/cases.json are English only.
 * That text carries court findings and carefully attributed allegations, so it
 * needs a human translator rather than a machine one. Until it has one the
 * ledger says so out loud (notice_case_lang) instead of pretending otherwise.
 */
(() => {
  /** Runtime-built strings. English is required here; the DOM has no copy. */
  const EN = {
    // Figure units. Indian units lead everywhere; the rest is the second reading.
    unit_lakh_crore: "lakh crore",
    unit_crore: "crore",
    unit_lakh: "lakh",
    unit_trillion: "trillion",
    unit_billion: "billion",
    unit_million: "million",
    unit_thousand: "thousand",
    unit_at_rate: "at",

    est: "Est",
    card_human: "Human cost",
    card_cost: "Financial cost",
    card_ministers: "Ministers responsible",
    card_open: "Open the file  +",
    card_close: "Close the file  -",
    card_copy: "Copy link",
    card_copied: "Link copied",
    card_share: "Share card",
    field_what: "What happened",
    field_dodge: "The accountability failure",
    field_ministers: "Ministers and office-holders responsible",
    field_alleged: "Contested / alleged",
    field_position: "The government's position",
    field_alt: "What accountability should have looked like",
    field_sources: "Sources",
    src_needed: "source needed",
    src_archive: "Archive",
    src_reader: "added by a reader",
    sources_reader_note: "added by readers",
    tier_legend_1: "primary record",
    tier_legend_2: "reporting",
    tier_legend_3: "partisan",
    suggest_source_cta: "Know a source for this case? Add one →",
    count_all: "Showing all {n} logged cases",
    count_some: "Showing {n} of {total} cases",
    cases_logged_one: "1 case logged",
    cases_logged_many: "{n} cases logged",
    empty_msg: "Nothing matches that filter. Widen it. There is no shortage.",

    dash_count: "{n} office-holders shown",
    dash_empty: "No office-holder by that name is on file. Yet.",
    more_n: "+{n} more",
    show_fewer: "show fewer",
    dash_error: "The dashboard could not be loaded.",

    cv_back: "← Back to the full dashboard",
    cv_eyebrow: "Personnel file",
    cv_photo_missing: "Photo withheld.<br>Like most things.",
    // Deliberately says nothing about whether the person still holds office.
    // Some office-holders on this ledger did resign, and it must not imply
    // otherwise just to land a better line.
    cv_v_one: "One failure on this file.",
    cv_v_many: "{cases} failures on this file.",
    cv_v_un_one: "Nobody answered for it.",
    cv_v_un_many: "{unanswered} of them closed with nobody answering for anything.",
    cv_v_tail: "The file stays open.",
    cv_since: "Earliest entry on this file: {year}.",
    cv_perf: "Performance record",
    cv_contact: "Contact",
    cv_competencies: "Core competencies",
    cv_experience: "Work experience",
    cv_outcomes: "Accountability outcomes",
    cv_references: "References",
    cv_postings: "Failures on this file",
    cv_costs: "Public money recorded in them",
    cv_deaths: "Deaths recorded in them",
    cv_unanswered: "Closed with nobody answering",
    cv_addr_label: "Registered address",
    cv_grievance_label: "Grievance channel",
    cv_press_label: "Questions",
    cv_grievance: "CPGRAMS, pgportal.gov.in. File one. Then wait. Then file another.",
    cv_press: "Submitted through the usual channels, and ignored there.",
    cv_press_never: "Not taken. Not once, on the record:",
    cv_share: "Share",
    cv_copy: "Copy link",
    cv_copied: "Link copied",
    cv_card: "Share card",
    cv_comp_hint: "Derived from the outcomes this ledger already records.",
    cv_comp_count_one: "1 posting demonstrates this",
    cv_comp_count: "{n} postings demonstrate this",
    cv_experience_hint: "{n} postings. Every one of them sourced.",
    cv_outcomes_hint: "What the record says happened next.",
    cv_handled: "How it was handled:",
    cv_caveat: "Read every figure above as \"recorded in postings held by this office\", never as \"caused by this person\". Holding an office when a failure happened is a matter of public record, not a finding of personal responsibility for any death or any rupee. This page is opinion and satire assembled from sourced cases. Open them and check.",
    cv_references_body: "None on file. Across every posting listed here, nobody was ever required to furnish one. Each entry cites the court record, audit, official release or reporting it is drawn from — open any of them and check.",
    cv_corrections_cta: "Something wrong here? Use the corrections and right-of-reply desk.",
    cv_titles_held: "Titles held across these postings: {roles}.",

    comp_data: "Not keeping records that could later be used in evidence",
    comp_denial: "Denial, delivered with a straight face",
    comp_inquiry: "Ensuring no inquiry ever quite begins",
    comp_blame: "Locating a junior official to carry it",
    comp_stay: "Remaining in post, whatever the outcome",
    comp_court: "Legislating first, reading the Constitution afterwards",
    comp_warning: "Overriding written warnings at scale",
    comp_dissent: "Firm handling of the people who asked",
    comp_reverse: "Quietly reversing the flagship achievement",
  };

  /** Hindi. Static-page keys need no English twin; the HTML holds it. */
  const HI = {
    nav_ledger: "लेजर",
    nav_dashboard: "मंत्री डैशबोर्ड",
    nav_submit: "घटना दर्ज करें",
    nav_suggest: "स्रोत सुझाएँ",
    nav_corrections: "सुधार",
    lang_label: "भाषा",

    flag_title: "नागरिकों का जवाबदेही लेजर",
    flag_tag: "गड़बड़ किसकी थी? 25 साल, हर पार्टी, रिकॉर्ड पर",
    home_eyebrow: "25 साल की बेख़ौफ़ी के ख़िलाफ़ आरोप-पत्र, सत्ता में कोई भी रहा हो",
    home_title_main: "जवाबदेही लेजर",
    home_title_thin: "जनता का। जनता द्वारा। जनता के लिए।",
    home_standfirst: "सन 2000 से अब तक अनगिनत घोटाले, आपदाएँ और नाकामियाँ — और इस दौरान सत्ता में रही हर सरकार के कार्यकाल में। सरकारें बदलती रहीं। एक बात नहीं बदली: सत्ता में बैठे लगभग किसी व्यक्ति से कभी जवाब नहीं माँगा गया। यह लेजर दर्ज करता है कि क्या हुआ, विभाग किसके पास था, जान और पैसे में इसकी क़ीमत क्या रही, और हर बार जवाबदेही को कैसे दफ़ना दिया गया। यह किसी एक पार्टी के पापों की सूची नहीं है; यह इस बात की सूची है कि जब ज़िम्मेदार लोग चाहते हैं कि मामला दब जाए, तो नाकामी के साथ क्या होता है। इसे पढ़िए। इस पर ठहरिए। फिर खुली आँखों से तय कीजिए कि आप किसे वोट दे रहे हैं।",

    stat_cases: "फ़ाइल में दर्ज नाकामियाँ",
    stat_costs: "जनता का पैसा जो लगा, अनुमानित",
    stat_resigned: "2014 के बाद वे केंद्रीय मंत्री जिन्होंने नाकामी<br>की ज़िम्मेदारी लेकर इस्तीफ़ा दिया",
    stat_toll: "जो जानें गईं, अनुमानित",

    standing_presser: "मई 2014 के बाद प्रधानमंत्री ने भारत में इतनी खुली प्रेस कॉन्फ़्रेंस की हैं। इंटरव्यू थोक में दिए जाते हैं — 2024 के पाँच महीनों में 64। जो कभी नहीं दिया जाता, वह है बिना-लिखा अगला सवाल — वही एक सवाल जिसे पहले से मंज़ूरी नहीं दिलाई जा सकी।",
    standing_presser_cta: "फ़ाइल खोलें →",

    method_summary: "इस लेजर को कैसे पढ़ें। पद्धति, आँकड़े और सीमाएँ",
    legend_red: "कोई जवाबदेही नहीं / इनकार / रद्द",
    legend_amber: "वापस लिया / आंशिक / आरोपित / अनिर्णीत",

    search_placeholder: "लेजर में खोजें",
    sort_newest: "नई घटना पहले",
    sort_oldest: "पुरानी घटना पहले",

    footer_what: "यह क्या है",
    footer_read: "कैसे पढ़ें",
    footer_funding: "इसे कौन चलाता है",

    notice_case_lang: "साइट का नेविगेशन, शीर्षक और लेबल हिंदी में हैं। मामलों का विवरण और विस्तृत पद्धति-टिप्पणी अभी केवल अंग्रेज़ी में है — उनमें अदालती निष्कर्ष और सप्रमाण आरोप दर्ज हैं, इसलिए उनका अनुवाद मशीन नहीं, कोई व्यक्ति करेगा।",

    unit_lakh_crore: "लाख करोड़",
    unit_crore: "करोड़",
    unit_lakh: "लाख",
    unit_trillion: "ट्रिलियन",
    unit_billion: "अरब",
    unit_million: "मिलियन",
    unit_thousand: "हज़ार",
    unit_at_rate: "की दर से",

    est: "अनु॰",
    card_human: "मानवीय क़ीमत",
    card_cost: "आर्थिक क़ीमत",
    card_ministers: "ज़िम्मेदार मंत्री",
    card_open: "फ़ाइल खोलें  +",
    card_close: "फ़ाइल बंद करें  -",
    card_copy: "लिंक कॉपी करें",
    card_copied: "लिंक कॉपी हो गया",
    card_share: "शेयर कार्ड",
    field_what: "क्या हुआ",
    field_dodge: "जवाबदेही की नाकामी",
    field_ministers: "ज़िम्मेदार मंत्री और पदाधिकारी",
    field_alleged: "विवादित / आरोपित",
    field_position: "सरकार का पक्ष",
    field_alt: "जवाबदेही कैसी होनी चाहिए थी",
    field_sources: "स्रोत",
    src_needed: "स्रोत चाहिए",
    src_archive: "अभिलेख",
    src_reader: "एक पाठक द्वारा जोड़ा गया",
    sources_reader_note: "पाठकों द्वारा जोड़े गए",
    tier_legend_1: "प्राथमिक अभिलेख",
    tier_legend_2: "रिपोर्टिंग",
    tier_legend_3: "पक्षपाती",
    suggest_source_cta: "इस मामले का कोई स्रोत जानते हैं? जोड़ें →",
    count_all: "सभी {n} दर्ज मामले दिखाए जा रहे हैं",
    count_some: "{total} में से {n} मामले दिखाए जा रहे हैं",
    cases_logged_one: "1 मामला दर्ज",
    cases_logged_many: "{n} मामले दर्ज",
    empty_msg: "इस फ़िल्टर से कुछ नहीं मिला। दायरा बढ़ाइए। कमी नहीं है।",

    dash_flag_tag: "विभाग डैशबोर्ड",
    dash_eyebrow: "ज़िम्मेदारी के तरीक़े",
    dash_title_main: "फ़ाइल किसके",
    dash_title_thin: "पास थी?",
    dash_standfirst: "इस लेजर के मामलों का विभागवार दृश्य। मामले इस आधार पर समूहित हैं कि उस समय संबंधित पद पर कौन था। आँकड़े उन मामलों में दर्ज कुल योग हैं, और उन्हें पदाधिकारी पर व्यक्तिगत रूप से आरोपित नहीं किया गया है।",
    dash_search_label: "पदाधिकारी खोजें",
    dash_search_placeholder: "किसी मंत्री या पदाधिकारी को खोजें",
    dash_caveat_text: "नीचे के हर आँकड़े को \"इस विभाग के मामलों में दर्ज\" पढ़िए, कभी \"इस व्यक्ति के कारण\" नहीं। नाकामी के समय किसी पद पर होना सार्वजनिक रिकॉर्ड की बात है। यह किसी मौत या किसी रुपये के लिए व्यक्तिगत ज़िम्मेदारी का निष्कर्ष नहीं है, और इस पृष्ठ की कोई बात उस रूप में उद्धृत नहीं की जानी चाहिए।",
    th_holder: "पदाधिकारी / विभाग",
    th_cases: "मामले",
    th_costs: "उन मामलों में दर्ज लागत",
    th_deaths: "इस विभाग के मामलों में मौतें",
    th_outcome: "दर्ज जवाबदेही परिणाम",
    dash_count: "{n} पदाधिकारी दिखाए जा रहे हैं",
    dash_empty: "इस नाम का कोई पदाधिकारी फ़ाइल में नहीं है। अभी तक।",
    more_n: "+{n} और",
    show_fewer: "कम दिखाएँ",
    dash_error: "डैशबोर्ड लोड नहीं हो सका।",

    cv_back: "← पूरे डैशबोर्ड पर वापस",
    cv_eyebrow: "कार्मिक फ़ाइल",
    cv_photo_missing: "फ़ोटो नहीं दी गई।<br>बाक़ी चीज़ों की तरह।",
    cv_v_one: "इस फ़ाइल में एक नाकामी।",
    cv_v_many: "इस फ़ाइल में {cases} नाकामियाँ।",
    cv_v_un_one: "इसका जवाब किसी ने नहीं दिया।",
    cv_v_un_many: "इनमें से {unanswered} ऐसी जिनमें किसी ने किसी बात का जवाब नहीं दिया।",
    cv_v_tail: "फ़ाइल खुली है।",
    cv_since: "इस फ़ाइल की सबसे पुरानी प्रविष्टि: {year}।",
    cv_perf: "प्रदर्शन रिकॉर्ड",
    cv_contact: "संपर्क",
    cv_competencies: "मुख्य दक्षताएँ",
    cv_experience: "कार्य अनुभव",
    cv_outcomes: "जवाबदेही के परिणाम",
    cv_references: "संदर्भ",
    cv_postings: "इस फ़ाइल में दर्ज नाकामियाँ",
    cv_costs: "उनमें दर्ज सार्वजनिक धन",
    cv_deaths: "उनमें दर्ज मौतें",
    cv_unanswered: "जिनमें किसी ने जवाब नहीं दिया",
    cv_addr_label: "पंजीकृत पता",
    cv_grievance_label: "शिकायत माध्यम",
    cv_press_label: "सवाल",
    cv_grievance: "CPGRAMS, pgportal.gov.in। दर्ज कीजिए। इंतज़ार कीजिए। फिर एक और दर्ज कीजिए।",
    cv_press: "सामान्य माध्यमों से भेजे जाते हैं, और वहीं अनसुने रह जाते हैं।",
    cv_press_never: "नहीं लिए जाते। रिकॉर्ड पर, एक बार भी नहीं:",
    cv_share: "शेयर करें",
    cv_copy: "लिंक कॉपी करें",
    cv_copied: "लिंक कॉपी हो गया",
    cv_card: "शेयर कार्ड",
    cv_comp_hint: "इस लेजर में पहले से दर्ज परिणामों से निकाली गई।",
    cv_comp_count_one: "1 कार्यकाल इसका प्रमाण है",
    cv_comp_count: "{n} कार्यकाल इसका प्रमाण हैं",
    cv_experience_hint: "{n} कार्यकाल। हर एक सप्रमाण।",
    cv_outcomes_hint: "रिकॉर्ड के मुताबिक़ आगे क्या हुआ।",
    cv_handled: "इसे कैसे निपटाया गया:",
    cv_caveat: "ऊपर के हर आँकड़े को \"इस पद के कार्यकाल में दर्ज\" पढ़िए, कभी \"इस व्यक्ति के कारण\" नहीं। नाकामी के समय किसी पद पर होना सार्वजनिक रिकॉर्ड की बात है, किसी मौत या किसी रुपये के लिए व्यक्तिगत ज़िम्मेदारी का निष्कर्ष नहीं। यह पृष्ठ सप्रमाण मामलों से बनी राय और व्यंग्य है। उन्हें खोलकर जाँच लीजिए।",
    cv_references_body: "फ़ाइल में कोई नहीं। यहाँ दर्ज हर कार्यकाल में, किसी से कभी संदर्भ नहीं माँगा गया। हर प्रविष्टि उस अदालती अभिलेख, ऑडिट, सरकारी विज्ञप्ति या रिपोर्टिंग का हवाला देती है जिससे वह ली गई है — कोई भी खोलकर जाँच लीजिए।",
    cv_corrections_cta: "कुछ ग़लत लगे? सुधार और प्रत्युत्तर डेस्क का उपयोग करें।",
    cv_titles_held: "इन कार्यकालों में धारित पद: {roles}।",

    comp_data: "ऐसा रिकॉर्ड न रखना जो बाद में सबूत बन सके",
    comp_denial: "बिना पलक झपकाए इनकार",
    comp_inquiry: "यह पक्का करना कि जाँच कभी शुरू ही न हो",
    comp_blame: "इसे ढोने के लिए कोई जूनियर अधिकारी खोज लेना",
    comp_stay: "नतीजा कुछ भी हो, पद पर बने रहना",
    comp_court: "पहले क़ानून बनाना, संविधान बाद में पढ़ना",
    comp_warning: "लिखित चेतावनियों को थोक में नज़रअंदाज़ करना",
    comp_dissent: "सवाल पूछने वालों से सख़्ती से निपटना",
    comp_reverse: "अपनी ही प्रमुख उपलब्धि को चुपचाप पलट देना",
  };

  const STRINGS = { en: EN, hi: HI };
  const SUPPORTED = ["en", "hi"];
  const ORIGINAL = new WeakMap();
  let current = "en";

  /* ---------- case titles, stamps and categories ----------
     Held in assets/data/hi/cases.json rather than here: it is per-case content,
     it is large, and English readers should never download it. Case *body*
     prose is still English only — see notice_case_lang. */
  let caseStrings = null;
  let caseStringsUrl = null;
  let caseStringsPending = null;

  function setCaseStringsBase(base) {
    caseStringsUrl = `${base}assets/data/hi/cases.json`;
  }

  /** Resolves once the active language's case strings are in hand. */
  function ensureCaseStrings() {
    if (current !== "hi" || !caseStringsUrl) return Promise.resolve(null);
    if (caseStrings) return Promise.resolve(caseStrings);
    caseStringsPending ??= fetch(caseStringsUrl)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((loaded) => {
        caseStrings = loaded;
        return loaded;
      });
    return caseStringsPending;
  }

  const caseId = (caseFile) => caseFile?.id ?? `case-${caseFile?.no}`;

  /** Translated case title/stamp, falling back to the English in the data. */
  function caseField(caseFile, field) {
    if (current === "hi") {
      const translated = caseStrings?.cases?.[caseId(caseFile)]?.[field];
      if (translated) return translated;
    }
    return caseFile?.[field] ?? "";
  }

  function category(name) {
    if (current === "hi") return caseStrings?.categories?.[name] ?? name;
    return name;
  }

  function detectLang() {
    const saved = localStorage.getItem("ledger-lang");
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language ?? "en").slice(0, 2);
    return SUPPORTED.includes(browser) ? browser : "en";
  }

  function fill(value, vars) {
    if (!vars) return value;
    let out = value;
    for (const [name, replacement] of Object.entries(vars)) {
      out = out.replaceAll(`{${name}}`, String(replacement));
    }
    return out;
  }

  /** Look up a runtime string in the active language, falling back to English. */
  function t(key, vars) {
    const value = STRINGS[current]?.[key] ?? EN[key] ?? "";
    return fill(value, vars);
  }

  /**
   * Resolve a static node's string. English deliberately has no entry for
   * page furniture, so it falls back to the markup captured on first run.
   */
  function staticValue(node, key, prop) {
    if (!ORIGINAL.has(node)) {
      ORIGINAL.set(node, { textContent: node.textContent, innerHTML: node.innerHTML });
    }
    return STRINGS[current]?.[key] ?? ORIGINAL.get(node)[prop];
  }

  function apply(lang) {
    if (SUPPORTED.includes(lang)) current = lang;
    document.documentElement.lang = current;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = staticValue(node, node.dataset.i18n, "textContent");
    });
    // Separate from data-i18n because these strings carry inline markup.
    document.querySelectorAll("[data-i18n-html]").forEach((node) => {
      node.innerHTML = staticValue(node, node.dataset.i18nHtml, "innerHTML");
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const value = STRINGS[current]?.[node.dataset.i18nPlaceholder];
      if (!ORIGINAL.has(node)) ORIGINAL.set(node, { placeholder: node.placeholder });
      node.placeholder = value ?? ORIGINAL.get(node).placeholder ?? "";
    });
    document.querySelectorAll(".lang-switch [data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === current));
    });
    // Shown only while a translation is partial.
    document.querySelectorAll("[data-lang-notice]").forEach((node) => {
      node.hidden = current === "en";
    });

    // Renderers that build their own markup redraw on this. Case strings are
    // fetched first so the redraw does not flash English titles.
    ensureCaseStrings().then(() => {
      document.dispatchEvent(new CustomEvent("ledger:langchange", { detail: { lang: current } }));
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    localStorage.setItem("ledger-lang", lang);
    apply(lang);
  }

  const getLang = () => current;

  // Resolved before the renderers run, so their first paint is already correct.
  current = detectLang();
  window.LedgerI18n = {
    setLang, apply, detectLang, getLang, t, SUPPORTED,
    setCaseStringsBase, ensureCaseStrings, caseField, category,
  };

  document.addEventListener("DOMContentLoaded", () => {
    apply(current);
    document.querySelectorAll(".lang-switch [data-lang]").forEach((button) => {
      button.addEventListener("click", () => setLang(button.dataset.lang));
    });
  });
})();
