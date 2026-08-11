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
    card_open: "Open the file",
    card_close: "Close the file",
    card_copy: "Copy link",
    card_copied: "Link copied",
    // One share button, not three. It hands the case to the OS share sheet and
    // falls back to the clipboard; the OG card is a crawler asset, not a page.
    card_share: "Share",
    card_rti: "File an RTI",
    card_permalink: "Permanent page for citing this case →",
    h2h_heading: "Claim against record",
    h2h_said: "What the government said",
    h2h_record: "What the record shows",
    h2h_all: "See every case this way →",
    nav_claims: "Claim vs record",
    case_holder_caveat: "Naming who held the portfolio is a matter of public record. It is not by itself a finding of personal responsibility for any death or any rupee.",
    clock_days: "days since",
    card_open_page: "Read the full case",
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
    // A ranking has to admit what it could not rank.
    count_ranked_cost: "{n} of them carry a costed estimate; the other {total} have no figure on file and sort last.",
    count_ranked_deaths: "{n} of them carry a recorded death toll; the other {total} have no figure on file and sort last.",

    // Numbers come from the resignations recorded on the cases themselves.
    standing_resigned_one: "of those {total} left office after May 2014. The other {before} went in the years before it. The failures did not stop. The resigning did.",
    standing_resigned: "of those {total} left office after May 2014. The other {before} went in the years before it. The failures did not stop. The resigning did.",
    standing_resigned_cta: "See all {total} \u2192",

    dash_count: "{n} office-holders shown",
    // "Government" is the coalition in power on the case date. "Party" is only
    // shown where a case names it, and the two are never merged.
    dash_gov_hint: "The Union government in office when these cases happened, not this person's own party.",
    dash_party_unknown: "Party not recorded",
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

    /* RTI generator. These are read from JavaScript, so English lives here too. */
    rti_case_all: "{n} cases on file. Type to narrow it down.",
    rti_case_matches: "{n} matching. Pick one.",
    rti_case_none: "Nothing matches that. Try a minister's name, a year, or one word from the title.",
    rti_authority_incomplete: "fill in the state",
    rti_note_state: "This is a state authority, so the application goes to the State Public Information Officer. State fee rules and state portals differ from the central ones; the notes under the letter have changed to match.",
    rti_note_incomplete: "The ledger records the office but not which state it sits in. Put the exact authority and address in the box above before you file, or it will be returned unanswered.",
    rti_note_party: "A party office is not a government department. The Central Information Commission ruled in 2013 that the national parties are public authorities under the Act; they simply refused to comply, and nothing was done about it. You may still write. Do not expect a reply, and do expect that silence to be the answer.",
    rti_missing: "Add your {fields} before you send this. An RTI without them is returned unread.",
    rti_missing_join: " and ",
    rti_missing_name: "name",
    rti_missing_address: "postal address",
    rti_copied: "Copied. Paste it into rtionline.gov.in or into a letter.",
    rti_copy_failed: "Your browser blocked the clipboard. The text is selected; copy it by hand.",
    rti_load_failed: "The ledger did not load, so the case list is empty. Reload the page.",
    rti_help_file_union: "Central ministries and their departments take online applications at rtionline.gov.in, which is the fastest route and gives you a registration number the same day. Post also works: address the envelope to the CPIO at the address in the letter, by registered or speed post, and keep the receipt.",
    rti_help_file_state: "State authorities are not on the central portal. Most states run their own, and a few still run none at all; check the state's own RTI page. Registered or speed post to the SPIO at the address in the letter always works, and the receipt is your proof of the date they got it, which is the date the clock starts.",
    rti_help_fee_union: "₹10, by Indian Postal Order, demand draft, banker's cheque or court fee stamp, made out to the Accounts Officer of that authority. Online filing takes a card or UPI payment. If you hold a BPL card there is no fee at all under Section 7(5), and the authority may not invent one.",
    rti_help_fee_state: "State fees are set by state rules and are not always ₹10; some states charge more and some insist on a particular instrument, usually a court fee stamp or an IPO. Check the state's rules before you pay. The Section 7(5) exemption for BPL applicants applies everywhere and is not the state's to withdraw.",
  };

  /** Hindi. Static-page keys need no English twin; the HTML holds it. */
  const HI = {
    nav_ledger: "लेजर",
    nav_dashboard: "मंत्री",
    nav_submit: "मामला भेजें",
    nav_suggest: "स्रोत सुझाएँ",
    nav_corrections: "सुधार और स्रोत",
    lang_label: "भाषा",

    flag_title: "नागरिकों का जवाबदेही लेजर",
    flag_tag: "गड़बड़ किसकी थी? 25 साल, हर पार्टी, रिकॉर्ड पर",
    home_eyebrow: "25 साल की बेख़ौफ़ी के ख़िलाफ़ आरोप-पत्र, सत्ता में कोई भी रहा हो",
    home_title_main: "जवाबदेही लेजर",
    home_title_thin: "जनता का। जनता द्वारा। जनता के लिए।",
    home_standfirst: "सन 2000 से अब तक अनगिनत घोटाले, आपदाएँ और नाकामियाँ — और इस दौरान सत्ता में रही हर सरकार के कार्यकाल में। सरकारें बदलती रहीं। एक बात नहीं बदली: सत्ता में बैठे लगभग किसी व्यक्ति से कभी जवाब नहीं माँगा गया। यह लेजर दर्ज करता है कि क्या हुआ, विभाग किसके पास था, जान और पैसे में इसकी क़ीमत क्या रही, और हर बार जवाबदेही को कैसे दफ़ना दिया गया। यह किसी एक पार्टी के पापों की सूची नहीं है; यह इस बात की सूची है कि जब ज़िम्मेदार लोग चाहते हैं कि मामला दब जाए, तो नाकामी के साथ क्या होता है। इसे पढ़िए। इस पर ठहरिए। फिर खुली आँखों से तय कीजिए कि आप किसे वोट दे रहे हैं।",

    stat_cases: "फ़ाइल में दर्ज नाकामियाँ",
    stat_costs: "जनता का पैसा जो लगा, अनुमानित",
    stat_resigned: "वे केंद्रीय मंत्री जिन्होंने इस फ़ाइल के<br>किसी मामले पर पद छोड़ा",
    stat_toll: "जो जानें गईं, अनुमानित",

    standing_presser: "मई 2014 के बाद प्रधानमंत्री ने भारत में इतनी खुली प्रेस कॉन्फ़्रेंस की हैं। इंटरव्यू थोक में दिए जाते हैं — 2024 के पाँच महीनों में 64। जो कभी नहीं दिया जाता, वह है बिना-लिखा अगला सवाल — वही एक सवाल जिसे पहले से मंज़ूरी नहीं दिलाई जा सकी।",
    standing_presser_cta: "फ़ाइल खोलें →",
    standing_resigned_one: "उन {total} में से एक ने मई 2014 के बाद पद छोड़ा। बाक़ी {before} उससे पहले के वर्षों में गए। नाकामियाँ नहीं रुकीं। इस्तीफ़े रुक गए।",
    standing_resigned: "उन {total} में से इतने मई 2014 के बाद पद छोड़कर गए। बाक़ी {before} उससे पहले के वर्षों में गए। नाकामियाँ नहीं रुकीं। इस्तीफ़े रुक गए।",
    standing_resigned_cta: "सभी {total} देखें →",

    method_summary: "इस लेजर को कैसे पढ़ें। पद्धति, आँकड़े और सीमाएँ",
    legend_red: "कोई जवाबदेही नहीं / इनकार / रद्द",
    legend_amber: "वापस लिया / आंशिक / आरोपित / अनिर्णीत",

    search_placeholder: "लेजर में खोजें",

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
    card_open: "फ़ाइल खोलें",
    card_close: "फ़ाइल बंद करें",
    card_copy: "लिंक कॉपी करें",
    card_copied: "लिंक कॉपी हो गया",
    card_share: "साझा करें",
    card_rti: "आरटीआई लगाएँ",
    card_permalink: "इस मामले को उद्धृत करने के लिए स्थायी पृष्ठ →",
    related_heading: "वही पैटर्न, फ़ाइल में और जगह",
    sort_newest: "नए पहले",
    sort_oldest: "पुराने पहले",
    sort_cost_desc: "पैसे में सबसे महँगे",
    sort_cost_asc: "पैसे में सबसे सस्ते",
    sort_deaths_desc: "सबसे ज़्यादा जानलेवा",
    sort_deaths_asc: "सबसे कम मौतें",
    h2h_heading: "दावा बनाम रिकॉर्ड",
    h2h_said: "सरकार ने क्या कहा",
    h2h_record: "रिकॉर्ड क्या कहता है",
    h2h_all: "हर मामला इसी तरह देखें →",
    nav_claims: "दावा बनाम रिकॉर्ड",
    case_holder_caveat: "किसके पास विभाग था, यह बताना सार्वजनिक रिकॉर्ड की बात है। यह अपने आप में किसी मौत या किसी रुपये के लिए व्यक्तिगत ज़िम्मेदारी का निष्कर्ष नहीं है।",
    clock_days: "दिन बीत चुके",
    card_open_page: "पूरा मामला पढ़ें",
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
    count_ranked_cost: "इनमें से {n} पर लागत का अनुमान दर्ज है; बाक़ी {total} पर कोई आँकड़ा नहीं, इसलिए वे अंत में हैं।",
    count_ranked_deaths: "इनमें से {n} पर मृतकों की संख्या दर्ज है; बाक़ी {total} पर कोई आँकड़ा नहीं, इसलिए वे अंत में हैं।",

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
    dash_gov_hint: "इन मामलों के समय केंद्र में जो सरकार थी, न कि इस व्यक्ति की अपनी पार्टी।",
    dash_party_unknown: "पार्टी दर्ज नहीं",
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

    /* RTI generator */
    nav_rti: "आरटीआई लगाएँ",
    rti_flag_tag: "सूचना का अधिकार डेस्क",
    rti_eyebrow: "दस रुपये। तीस दिन। एक नामज़द अधिकारी।",
    rti_title_main: "जवाब लिखवाइए,",
    rti_title_thin: "काग़ज़ पर।",
    rti_standfirst: "प्रेस कॉन्फ़्रेंस टाली जा सकती है। सदन का सवाल ऐसे पैराग्राफ़ में बदला जा सकता है जो कुछ कहता ही नहीं। आरटीआई को उस तरह अनदेखा नहीं किया जा सकता: वह एक नामज़द अधिकारी के पास जाती है, तीस दिन की घड़ी शुरू कर देती है, और इनकार करने के लिए भी लिखकर बताना पड़ता है कि अधिनियम की किस धारा की आड़ ली जा रही है। वह लिखित इनकार अपने आप में एक रिकॉर्ड है। नीचे से कोई मामला चुनिए, उस पर अपना नाम डालिए, और भेज दीजिए।",
    rti_guidance_title: "यह कैसे काम करता है",
    rti_guidance_1: "मामला चुनिए। जनरेटर उस मामले का रिकॉर्ड पढ़कर तय करता है कि फ़ाइल असल में किस मंत्रालय या प्राधिकरण के पास है, और फिर उसी के अनुरूप सवाल तैयार करता है।",
    rti_guidance_2: "आपका नाम और पता आपके अपने ब्राउज़र में ही पत्र में जुड़ते हैं। यहाँ आप जो भी भरते हैं वह कहीं भेजा नहीं जाता, संग्रहीत नहीं होता, और इस साइट को दिखता भी नहीं। आरटीआई के लिए असली नाम और असली पता ज़रूरी है, इसलिए वही लिखिए।",
    rti_guidance_3: "भेजने से पहले मसौदा पढ़िए। जो बात फ़िट न बैठे उसे बदल दीजिए। आवेदक आप हैं, हम नहीं।",
    rti_field_case: "आप किस मामले के बारे में पूछ रहे हैं?",
    rti_field_authority: "यह किस लोक प्राधिकरण को संबोधित हो",
    rti_field_authority_custom: "या प्राधिकरण ख़ुद लिखिए",
    rti_optional_override: "(ऊपर का चयन रद्द कर देगा)",
    rti_optional: "(वैकल्पिक)",
    rti_field_name: "आपका पूरा नाम",
    rti_field_phone: "दूरभाष",
    rti_field_address: "आपका डाक पता, पिन कोड सहित",
    rti_field_email: "ईमेल",
    rti_field_place: "हस्ताक्षर का स्थान",
    rti_place_placeholder: "नई दिल्ली",
    rti_field_bpl: "मेरे पास ग़रीबी रेखा से नीचे का कार्ड है, इसलिए धारा 7(5) के अंतर्गत कोई शुल्क देय नहीं है",
    rti_output_title: "आपका आवेदन",
    rti_copy: "टेक्स्ट कॉपी करें",
    rti_download: ".txt डाउनलोड करें",
    rti_print: "प्रिंट / पीडीएफ़ सहेजें",
    rti_help_title: "कहाँ भेजें, कितना ख़र्च है, और टालमटोल हो तो क्या करें",
    rti_help_file_h: "कहाँ दाख़िल करें",
    rti_help_fee_h: "शुल्क",
    rti_help_clock_h: "समय-सीमा",
    rti_help_clock: "धारा 7(1) के अंतर्गत तीस दिन, उनके पास पहुँचने की तारीख़ से। यदि सूचना जीवन या स्वतंत्रता से जुड़ी है तो अड़तालीस घंटे। यदि वे इसे धारा 6(3) के अंतर्गत किसी अन्य प्राधिकरण को अंतरित करते हैं तो पाँच दिन के भीतर करना होगा, और घड़ी वहाँ पहुँचने से फिर शुरू होगी। समय-सीमा के बाद की चुप्पी क़ानूनन इनकार मानी जाती है, और इनकार के विरुद्ध अपील होती है।",
    rti_help_appeal_h: "जब वे टालें",
    rti_help_appeal: "उसी कार्यालय के प्रथम अपीलीय अधिकारी के पास धारा 19(1) के अंतर्गत पहली अपील कीजिए — निःशुल्क, इनकार से या समय-सीमा बीतने से तीस दिन के भीतर। वह भी विफल हो तो धारा 19(3) के अंतर्गत दूसरी अपील केंद्रीय या राज्य सूचना आयोग में जाती है। बिना कारण इनकार करने वाले लोक सूचना अधिकारी पर धारा 20 के अंतर्गत ₹250 प्रतिदिन, अधिकतम ₹25,000 का जुर्माना लग सकता है। यह जुर्माना कम ही लगता है, जो अपने आप में एक संकेत है, पर धारा मौजूद है और उसका ज़िक्र ध्यान खींचता है।",
    rti_disclaimer: "यह एक प्रारूप है, क़ानूनी सलाह नहीं। इसे इस लेजर के सार्वजनिक रिकॉर्ड और सूचना का अधिकार अधिनियम, 2005 के मूल पाठ से तैयार किया गया है। दाख़िल करने से पहले पता और शब्दावली जाँच लीजिए, और मामला अदालत में हो तो उचित सलाह लीजिए।",

    rti_case_search_placeholder: "नाम, मंत्री या वर्ष से मामला खोजें",
    rti_field_case_select: "मिलते-जुलते मामले",
    rti_case_all: "फ़ाइल में {n} मामले। छाँटने के लिए टाइप कीजिए।",
    rti_case_matches: "{n} मामले मिले। एक चुनिए।",
    rti_case_none: "इससे कुछ नहीं मिला। किसी मंत्री का नाम, कोई वर्ष, या शीर्षक का एक शब्द आज़माइए।",
    rti_authority_incomplete: "राज्य का नाम भरें",
    rti_note_state: "यह राज्य का प्राधिकरण है, इसलिए आवेदन राज्य लोक सूचना अधिकारी के पास जाएगा। राज्यों के शुल्क नियम और पोर्टल केंद्र से अलग हैं; पत्र के नीचे दिए निर्देश उसी के अनुसार बदल गए हैं।",
    rti_note_incomplete: "लेजर में पद दर्ज है, पर यह नहीं कि वह किस राज्य का है। दाख़िल करने से पहले ऊपर के बॉक्स में सटीक प्राधिकरण और पता भरिए, वरना आवेदन बिना जवाब लौट आएगा।",
    rti_note_party: "पार्टी कार्यालय सरकारी विभाग नहीं है। केंद्रीय सूचना आयोग ने 2013 में तय किया था कि राष्ट्रीय दल इस अधिनियम के अंतर्गत लोक प्राधिकरण हैं; उन्होंने बस पालन करने से मना कर दिया, और कुछ नहीं हुआ। आप फिर भी लिख सकते हैं। जवाब की उम्मीद मत रखिए, और यह मान लीजिए कि वह चुप्पी ही जवाब है।",
    rti_missing: "भेजने से पहले अपना {fields} भरिए। इनके बिना आरटीआई बिना पढ़े लौटा दी जाती है।",
    rti_missing_join: " और ",
    rti_missing_name: "नाम",
    rti_missing_address: "डाक पता",
    rti_copied: "कॉपी हो गया। इसे rtionline.gov.in पर या पत्र में चिपका दीजिए।",
    rti_copy_failed: "आपके ब्राउज़र ने क्लिपबोर्ड रोक दिया। टेक्स्ट चुन लिया गया है, इसे हाथ से कॉपी कीजिए।",
    rti_load_failed: "लेजर लोड नहीं हुआ, इसलिए मामलों की सूची ख़ाली है। पृष्ठ फिर से लोड कीजिए।",
    rti_help_file_union: "केंद्रीय मंत्रालय और उनके विभाग rtionline.gov.in पर ऑनलाइन आवेदन लेते हैं, जो सबसे तेज़ रास्ता है और उसी दिन पंजीकरण संख्या दे देता है। डाक भी चलती है: लिफ़ाफ़ा पत्र में दिए पते पर केंद्रीय लोक सूचना अधिकारी के नाम, पंजीकृत या स्पीड पोस्ट से भेजिए, और रसीद सँभालकर रखिए।",
    rti_help_file_state: "राज्य के प्राधिकरण केंद्रीय पोर्टल पर नहीं हैं। अधिकतर राज्यों के अपने पोर्टल हैं, और कुछ के पास आज भी कोई नहीं; संबंधित राज्य का आरटीआई पृष्ठ देखिए। पत्र में दिए पते पर राज्य लोक सूचना अधिकारी को पंजीकृत या स्पीड पोस्ट हमेशा चलती है, और रसीद ही इस बात का प्रमाण है कि वह उन्हें किस दिन मिली — घड़ी उसी दिन से चलती है।",
    rti_help_fee_union: "₹10, भारतीय पोस्टल ऑर्डर, डिमांड ड्राफ़्ट, बैंकर्स चेक या कोर्ट फ़ीस स्टांप के रूप में, उस प्राधिकरण के लेखा अधिकारी के नाम। ऑनलाइन दाख़िल करने पर कार्ड या यूपीआई से भुगतान होता है। बीपीएल कार्ड हो तो धारा 7(5) के अंतर्गत कोई शुल्क नहीं लगता, और प्राधिकरण अपनी ओर से कोई शुल्क गढ़ नहीं सकता।",
    rti_help_fee_state: "राज्य का शुल्क राज्य के नियमों से तय होता है और हमेशा ₹10 नहीं होता; कुछ राज्य ज़्यादा लेते हैं और कुछ किसी एक ही तरीक़े पर अड़ते हैं, आमतौर पर कोर्ट फ़ीस स्टांप या आईपीओ। भुगतान से पहले उस राज्य के नियम देख लीजिए। बीपीएल आवेदकों के लिए धारा 7(5) की छूट हर जगह लागू है और राज्य उसे हटा नहीं सकता।",
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
