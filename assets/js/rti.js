/**
 * The RTI generator.
 *
 * Turns a case in this ledger into an application under Section 6(1) of the
 * Right to Information Act, 2005, addressed to the public authority that
 * actually holds the file.
 *
 * One rule governs this whole file: the applicant's details never leave the
 * browser. There is no fetch of anything the reader types, no storage, no
 * analytics on it. An RTI has to carry a real name and a real address, and
 * asking someone to hand those to a website before they can ask their own
 * government a question would be its own small act of surveillance.
 */
(() => {
  const SU = window.SourceUtils;
  const form = document.querySelector("#rti-form");
  const caseSelect = document.querySelector("#rti-case");
  const authoritySelect = document.querySelector("#rti-authority");
  const authorityCustom = document.querySelector("#rti-authority-custom");
  const authorityNote = document.querySelector("#rti-authority-note");
  const letterNode = document.querySelector("#rti-letter");
  const statusNode = document.querySelector("#rti-status");
  const helpFile = document.querySelector("#rti-help-file");
  const helpFee = document.querySelector("#rti-help-fee");
  if (!form || !caseSelect || !letterNode) return;

  const lang = () => window.LedgerI18n?.getLang?.() ?? "en";
  const t = (key, vars) => window.LedgerI18n?.t(key, vars) ?? "";
  const title = (caseFile) => window.LedgerI18n?.caseField(caseFile, "title") ?? caseFile.title;

  let cases = [];
  let authorities = [];

  /* ---------- letter strings ---------- */

  const L = {
    en: {
      to: "To,",
      cpio: "The Central Public Information Officer (CPIO)",
      spio: "The State Public Information Officer (SPIO)",
      subject: (subject) => `Subject: Application under Section 6(1) of the Right to Information Act, 2005 — ${subject}`,
      salutation: "Sir / Madam,",
      opening: (subject) => `Under Section 6(1) of the Right to Information Act, 2005, I request the following information held by your office in relation to ${subject}. Where a document is asked for, I am asking for a copy of it, not a summary of it.`,
      notings: (year) => `Copies of all file notings, inter-departmental correspondence and minutes of meetings recorded in your office in relation to this matter, from 1 January ${year} to the date of this application.`,
      inquiry: "Whether any inquiry, committee or fact-finding exercise was constituted in this matter. If so, copies of (a) the order constituting it, (b) its terms of reference, (c) its report, and (d) the action-taken report on that report. If the report has not been made public, the reason recorded on file for withholding it.",
      officers: "The names and designations of the officers, if any, against whom disciplinary or other action was proposed, initiated or dropped in this matter, and the present status of each such proceeding.",
      audit: "Copies of any audit observations relating to this matter, including any raised by the Comptroller and Auditor General or by internal audit, together with your office's replies to them.",
      deaths: "The number of deaths officially attributed to this matter in your records, the date-wise entries from which that figure is compiled, and the basis on which it was arrived at. If no such figure is maintained, please state that in writing.",
      cost: "The amounts sanctioned, released and actually utilised under this head, year by year, with the number and date of every sanction order.",
      dataDenial: "Whether the data in question is held by your office in any form, digital or physical. If it is not, a copy of the file noting, order or minute recording the decision not to collect, compile or publish it, and the name and designation of the officer who took that decision.",
      resignations: (names) => `Copies of the resignation letter(s) of ${names}, the order(s) accepting them, and any note on file recording the reason for the resignation.`,
      warnings: "Copies of every advisory, warning, intelligence input or inspection report received by your office before this incident and relating to the risk it materialised, the date each was received, and the action recorded on file against each.",
      safety: "Copies of the safety, structural or inspection reports for the works or facility in question for the three years preceding this incident, and the compliance report on every deficiency recorded in them.",
      exam: "The number of candidates affected, the standard operating procedure for question-paper security in force on the date in question, and the report of any breach recorded against it.",
      environment: "Copies of the environmental or forest clearance granted in this matter, the conditions attached to it, and every compliance report filed against those conditions.",
      rights: "Copies of the orders passed in this matter and the reasons recorded in writing for them, the number of such orders passed in the same period, and the authority that approved each.",
      security: "The number of applications relating to this matter that your office has rejected under Section 8(1)(a), and the designation of the officer who recorded each such decision.",
      procurement: "Copies of the tender or bid documents, the minutes of the evaluation committee, and the reasons recorded for the award, including any approved deviation from the standard procurement procedure.",
      funds: "The scheme-wise break-up of receipts and expenditure under this head, and copies of the utilisation certificates received against it.",
      denial: "If any part of the above is denied, the specific clause of Section 8(1) or Section 9 relied upon for each part, the reasons for the denial as required by Section 7(8), and the name, designation and address of the First Appellate Authority under Section 19(1).",
      transfer: "If any part of this application concerns information more closely connected with another public authority, please transfer that part under Section 6(3) within five days and inform me of the transfer.",
      feeStandard: "The prescribed application fee of ₹10 is enclosed.",
      feeBpl: "I belong to a household below the poverty line and am therefore exempt from any fee under Section 7(5). A copy of the relevant certificate is enclosed.",
      formOfInfo: "Under Section 7(9), I request the information in electronic form by email where it already exists in that form, and as attested photocopies otherwise.",
      citizen: "I am a citizen of India.",
      signoff: "Yours faithfully,",
      place: "Place:",
      date: "Date:",
      phone: "Phone:",
      email: "Email:",
      placeholderName: "[Your full name]",
      placeholderAddress: "[Your postal address, with PIN code]",
      placeholderPlace: "[Place]",
      placeholderAuthority: "[Name and address of the public authority]",
    },
    hi: {
      to: "सेवा में,",
      cpio: "केंद्रीय लोक सूचना अधिकारी (CPIO)",
      spio: "राज्य लोक सूचना अधिकारी (SPIO)",
      subject: (subject) => `विषय: सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत आवेदन — ${subject}`,
      salutation: "महोदय / महोदया,",
      opening: (subject) => `सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत, मैं ${subject} से संबंधित निम्नलिखित सूचना चाहता/चाहती हूँ जो आपके कार्यालय के पास उपलब्ध है। जहाँ किसी दस्तावेज़ की माँग की गई है, वहाँ उसकी प्रति चाहिए, सारांश नहीं।`,
      notings: (year) => `इस विषय से संबंधित आपके कार्यालय में दर्ज समस्त फ़ाइल नोटिंग, अंतर-विभागीय पत्राचार तथा बैठकों के कार्यवृत्त की प्रतियाँ, 1 जनवरी ${year} से इस आवेदन की तिथि तक।`,
      inquiry: "क्या इस विषय में कोई जाँच, समिति अथवा तथ्य-अन्वेषण गठित किया गया था। यदि हाँ, तो (क) उसके गठन का आदेश, (ख) उसकी विचारार्थ शर्तें, (ग) उसकी रिपोर्ट, तथा (घ) उस रिपोर्ट पर की गई कार्रवाई रिपोर्ट की प्रतियाँ। यदि रिपोर्ट सार्वजनिक नहीं की गई है, तो उसे रोकने का फ़ाइल पर दर्ज कारण।",
      officers: "इस विषय में जिन अधिकारियों के विरुद्ध अनुशासनात्मक अथवा अन्य कार्रवाई प्रस्तावित की गई, आरंभ की गई या छोड़ दी गई, उनके नाम और पदनाम, तथा प्रत्येक कार्यवाही की वर्तमान स्थिति।",
      audit: "इस विषय से संबंधित कोई भी लेखा-परीक्षा टिप्पणी, जिसमें नियंत्रक एवं महालेखापरीक्षक अथवा आंतरिक लेखा-परीक्षा द्वारा उठाई गई टिप्पणियाँ सम्मिलित हैं, तथा उन पर आपके कार्यालय के उत्तर।",
      deaths: "इस विषय में आपके अभिलेखों में आधिकारिक रूप से दर्ज मृतकों की संख्या, वह तिथिवार प्रविष्टियाँ जिनसे यह संख्या संकलित की गई है, तथा इसे निकालने का आधार। यदि ऐसी कोई संख्या संधारित नहीं की जाती, तो कृपया इसे लिखित में बताएँ।",
      cost: "इस मद में वर्ष-वार स्वीकृत, जारी तथा वास्तव में उपयोग की गई राशि, प्रत्येक स्वीकृति आदेश की संख्या और तिथि सहित।",
      dataDenial: "क्या प्रश्नगत आँकड़े आपके कार्यालय के पास किसी भी रूप में, डिजिटल अथवा भौतिक, उपलब्ध हैं। यदि नहीं, तो उन्हें एकत्र, संकलित या प्रकाशित न करने के निर्णय को दर्ज करने वाली फ़ाइल नोटिंग, आदेश अथवा कार्यवृत्त की प्रति, तथा वह निर्णय लेने वाले अधिकारी का नाम और पदनाम।",
      resignations: (names) => `${names} के त्यागपत्र की प्रतियाँ, उन्हें स्वीकार करने वाले आदेश, तथा त्यागपत्र का कारण दर्ज करने वाली फ़ाइल पर की गई कोई भी टिप्पणी।`,
      warnings: "इस घटना से पूर्व आपके कार्यालय को प्राप्त प्रत्येक परामर्श, चेतावनी, ख़ुफ़िया इनपुट अथवा निरीक्षण रिपोर्ट की प्रतियाँ जो उस ख़तरे से संबंधित हों जो बाद में घटित हुआ, प्रत्येक की प्राप्ति तिथि, तथा प्रत्येक पर फ़ाइल में दर्ज की गई कार्रवाई।",
      safety: "प्रश्नगत निर्माण अथवा सुविधा की, इस घटना से पूर्ववर्ती तीन वर्षों की सुरक्षा, संरचनात्मक अथवा निरीक्षण रिपोर्टों की प्रतियाँ, तथा उनमें दर्ज प्रत्येक कमी पर अनुपालन रिपोर्ट।",
      exam: "प्रभावित अभ्यर्थियों की संख्या, प्रश्नपत्र सुरक्षा के लिए उस तिथि को प्रवृत्त मानक संचालन प्रक्रिया, तथा उसके उल्लंघन पर दर्ज कोई भी रिपोर्ट।",
      environment: "इस विषय में दी गई पर्यावरण अथवा वन स्वीकृति की प्रतियाँ, उससे संलग्न शर्तें, तथा उन शर्तों के विरुद्ध दाख़िल प्रत्येक अनुपालन रिपोर्ट।",
      rights: "इस विषय में पारित आदेशों की प्रतियाँ तथा उनके लिए लिखित में दर्ज कारण, उसी अवधि में पारित ऐसे आदेशों की संख्या, और प्रत्येक को अनुमोदित करने वाला प्राधिकारी।",
      security: "इस विषय से संबंधित कितने आवेदन आपके कार्यालय ने धारा 8(1)(क) के अंतर्गत अस्वीकार किए हैं, तथा प्रत्येक ऐसा निर्णय दर्ज करने वाले अधिकारी का पदनाम।",
      procurement: "निविदा अथवा बोली दस्तावेज़ों, मूल्यांकन समिति के कार्यवृत्त, तथा आवंटन के लिए दर्ज कारणों की प्रतियाँ, जिनमें मानक ख़रीद प्रक्रिया से अनुमोदित कोई भी विचलन सम्मिलित हो।",
      funds: "इस मद में योजनावार प्राप्तियों और व्यय का ब्यौरा, तथा उसके विरुद्ध प्राप्त उपयोगिता प्रमाणपत्रों की प्रतियाँ।",
      denial: "यदि उपरोक्त में से कोई सूचना देने से इनकार किया जाता है, तो प्रत्येक भाग के लिए धारा 8(1) अथवा धारा 9 का वह विशिष्ट खंड जिस पर भरोसा किया गया है, धारा 7(8) के अनुसार इनकार के कारण, तथा धारा 19(1) के अंतर्गत प्रथम अपीलीय अधिकारी का नाम, पदनाम और पता।",
      transfer: "यदि इस आवेदन का कोई भाग किसी अन्य लोक प्राधिकरण से अधिक निकटता से संबंधित है, तो कृपया उस भाग को धारा 6(3) के अंतर्गत पाँच दिनों के भीतर अंतरित करें और मुझे इसकी सूचना दें।",
      feeStandard: "₹10 का निर्धारित आवेदन शुल्क संलग्न है।",
      feeBpl: "मैं ग़रीबी रेखा से नीचे के परिवार से हूँ और इसलिए धारा 7(5) के अंतर्गत किसी भी शुल्क से मुक्त हूँ। संबंधित प्रमाणपत्र की प्रति संलग्न है।",
      formOfInfo: "धारा 7(9) के अंतर्गत, जहाँ सूचना पहले से इलेक्ट्रॉनिक रूप में उपलब्ध है वहाँ मैं उसे ईमेल द्वारा चाहता/चाहती हूँ, अन्यथा अभिप्रमाणित छायाप्रतियों के रूप में।",
      citizen: "मैं भारत का नागरिक हूँ।",
      signoff: "भवदीय,",
      place: "स्थान:",
      date: "दिनांक:",
      phone: "दूरभाष:",
      email: "ईमेल:",
      placeholderName: "[आपका पूरा नाम]",
      placeholderAddress: "[आपका डाक पता, पिन कोड सहित]",
      placeholderPlace: "[स्थान]",
      placeholderAuthority: "[लोक प्राधिकरण का नाम और पता]",
    },
  };

  const strings = () => L[lang()] ?? L.en;

  /* ---------- authorities ----------
     A party post is not a public authority. The CIC held in 2013 that the
     national parties were covered by the Act; they simply refused to comply and
     nothing happened to them. So the option is offered and honestly labelled
     rather than quietly dropped. */

  const NOT_A_PUBLIC_OFFICE = /not a public office/i;
  const NEEDS_EDIT = /\bconcerned\b/i;

  function authoritiesFor(caseFile) {
    const seen = new Map();
    (caseFile.ministers ?? []).forEach((minister) => {
      const names = SU?.splitOfficeHolders
        ? SU.splitOfficeHolders(minister.n)
        : [String(minister.n ?? "")];
      names.forEach((name) => {
        const address = SU?.officeAddress(name, minister.r) ?? "";
        if (!address || seen.has(address)) return;
        seen.set(address, {
          address,
          name,
          role: minister.r ?? "",
          state: SU?.isStateAuthority(name, minister.r) ?? false,
          notPublic: NOT_A_PUBLIC_OFFICE.test(address),
          needsEdit: NEEDS_EDIT.test(address),
        });
      });
    });
    const list = [...seen.values()];
    // A party HQ can never be the only addressee an application is built for.
    return list.some((item) => !item.notPublic) ? list.filter((item) => !item.notPublic) : list;
  }

  /* ---------- the questions ----------
     Every extra question is earned by something in the case record, so the
     application asks about the deaths only where deaths are recorded, and about
     sanction orders only where money is. A generic RTI gets a generic brush-off. */

  function requests(caseFile, S) {
    const year = String(caseFile.sk ?? "").slice(0, 4) || caseFile.year;
    const list = [S.notings(year), S.inquiry, S.officers, S.audit];
    const estimates = caseFile.estimates ?? {};
    const cat = String(caseFile.cat ?? "");
    const stamp = `${caseFile.stamp ?? ""} ${caseFile.dodge ?? ""}`.toLowerCase();

    if (Number(estimates.deaths) > 0) list.push(S.deaths);
    if (Number(estimates.costInrCrore) > 0) list.push(S.cost);
    if (cat === "Data denial" || /no data|not maintained|data not|no such record/.test(stamp)) {
      list.push(S.dataDenial);
    }
    const resigned = (caseFile.resignations ?? []).map((entry) => entry?.n).filter(Boolean);
    if (resigned.length) list.push(S.resignations(resigned.join(", ")));

    const byCategory = {
      // A "public safety" case is sometimes a bridge and sometimes a riot, so
      // the question that fits both is what was known beforehand and ignored.
      // The structural reports are asked for only where there is a structure.
      "Public safety": S.warnings,
      "Exam integrity": S.exam,
      "Environment": S.environment,
      "Rights and dissent": S.rights,
      "Democratic institutions": S.rights,
      "National security": S.security,
      "Crony capital (alleged)": S.procurement,
      "Public money": S.procurement,
      "Fund opacity": S.funds,
      "Consumer harm": S.funds,
    };
    if (byCategory[cat]) list.push(byCategory[cat]);

    const built = `${caseFile.title ?? ""} ${caseFile.what ?? ""}`.toLowerCase();
    if (/\b(bridge|expressway|highway|flyover|building|tunnel|dam|collapse|caved|construction|stadium|hospital|factory|boiler|stampede)\b/.test(built)) {
      list.push(S.safety);
    }

    list.push(S.denial);
    return list;
  }

  /* ---------- the letter ---------- */

  function today() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  }

  function selectedAuthority() {
    const typed = authorityCustom.value.trim();
    if (typed) return { address: typed, state: false, needsEdit: false, notPublic: false, typed: true };
    return authorities[Number(authoritySelect.value)] ?? null;
  }

  function buildLetter() {
    const S = strings();
    const caseFile = cases.find((item) => String(item.no) === caseSelect.value);
    if (!caseFile) return "";
    const authority = selectedAuthority();
    const subject = `${title(caseFile)} (${caseFile.date})`;
    const name = form.name.value.trim() || S.placeholderName;
    const address = form.address.value.trim() || S.placeholderAddress;
    const place = form.place.value.trim() || S.placeholderPlace;
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();

    const lines = [
      S.to,
      authority?.state ? S.spio : S.cpio,
      authority?.address || S.placeholderAuthority,
      "",
      S.subject(subject),
      "",
      S.salutation,
      "",
      S.opening(subject),
      "",
      ...requests(caseFile, S).map((request, index) => `${index + 1}. ${request}`),
      "",
      S.transfer,
      "",
      form.bpl.checked ? S.feeBpl : S.feeStandard,
      "",
      S.formOfInfo,
      "",
      S.citizen,
      "",
      S.signoff,
      "",
      name,
      ...address.split("\n").map((part) => part.trim()).filter(Boolean),
      ...(phone ? [`${S.phone} ${phone}`] : []),
      ...(email ? [`${S.email} ${email}`] : []),
      "",
      `${S.place} ${place}`,
      `${S.date} ${today()}`,
    ];
    return lines.join("\n");
  }

  /* ---------- rendering ---------- */

  function renderAuthorityOptions(caseFile) {
    authorities = authoritiesFor(caseFile);
    authoritySelect.innerHTML = authorities
      .map((item, index) => {
        const label = item.notPublic
          ? `${item.name} — ${item.address}`
          : `${item.address}${item.needsEdit ? ` — ${t("rti_authority_incomplete")}` : ""}`;
        return `<option value="${index}">${SU?.escapeHTML(label) ?? label}</option>`;
      })
      .join("");
    updateAuthorityNote();
  }

  function updateAuthorityNote() {
    const authority = selectedAuthority();
    let note = "";
    if (authority?.notPublic) note = t("rti_note_party");
    else if (authority?.needsEdit) note = t("rti_note_incomplete");
    else if (authority?.state) note = t("rti_note_state");
    authorityNote.textContent = note;
    authorityNote.hidden = !note;
    authorityNote.classList.toggle("blocked", Boolean(authority?.notPublic));

    // The filing route and the fee are different for a state authority, so the
    // guidance under the letter has to move with the addressee.
    if (helpFile) helpFile.textContent = t(authority?.state ? "rti_help_file_state" : "rti_help_file_union");
    if (helpFee) helpFee.textContent = t(authority?.state ? "rti_help_fee_state" : "rti_help_fee_union");
  }

  function render() {
    letterNode.textContent = buildLetter();
    const missing = [];
    if (!form.name.value.trim()) missing.push(t("rti_missing_name"));
    if (!form.address.value.trim()) missing.push(t("rti_missing_address"));
    // Two items at most, so "name and postal address" reads better than a list.
    statusNode.textContent = missing.length
      ? t("rti_missing", { fields: missing.join(t("rti_missing_join")) })
      : "";
    statusNode.classList.toggle("error", missing.length > 0);
  }

  function onCaseChange() {
    const caseFile = cases.find((item) => String(item.no) === caseSelect.value);
    if (caseFile) renderAuthorityOptions(caseFile);
    render();
  }

  function renderCaseOptions() {
    const previous = caseSelect.value;
    caseSelect.innerHTML = cases
      .map((caseFile) => `<option value="${caseFile.no}">${SU?.escapeHTML(`${caseFile.date} — ${title(caseFile)}`)}</option>`)
      .join("");
    if (previous) caseSelect.value = previous;
  }

  /* ---------- actions ---------- */

  async function copyLetter(button) {
    const text = letterNode.textContent;
    try {
      await navigator.clipboard.writeText(text);
      statusNode.classList.remove("error");
      statusNode.textContent = t("rti_copied");
    } catch {
      // Clipboard access is refused on insecure origins and in some in-app
      // browsers. Selecting the text is the honest fallback.
      const range = document.createRange();
      range.selectNodeContents(letterNode);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      letterNode.focus();
      statusNode.classList.add("error");
      statusNode.textContent = t("rti_copy_failed");
    }
    button.blur();
  }

  function downloadLetter() {
    const caseFile = cases.find((item) => String(item.no) === caseSelect.value);
    const blob = new Blob([letterNode.textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RTI-case-${caseFile ? String(caseFile.no).padStart(2, "0") : "application"}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- boot ---------- */

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

  window.LedgerI18n?.setCaseStringsBase("../");

  loadCases().then((loaded) => {
    cases = loaded.sort((a, b) => Number(b.sk) - Number(a.sk));
    renderCaseOptions();
    const wanted = new URLSearchParams(location.search).get("case");
    const preselect = wanted && /^case-(\d+)$/.test(wanted) ? wanted.replace("case-", "") : wanted;
    if (preselect && cases.some((item) => String(item.no) === preselect)) caseSelect.value = preselect;
    onCaseChange();
  }).catch(() => {
    statusNode.classList.add("error");
    statusNode.textContent = t("rti_load_failed");
  });

  caseSelect.addEventListener("change", onCaseChange);
  authoritySelect.addEventListener("change", () => { updateAuthorityNote(); render(); });
  form.addEventListener("input", (event) => {
    if (event.target === authorityCustom) updateAuthorityNote();
    render();
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  document.querySelector("#rti-copy")?.addEventListener("click", (event) => copyLetter(event.currentTarget));
  document.querySelector("#rti-download")?.addEventListener("click", downloadLetter);
  document.querySelector("#rti-print")?.addEventListener("click", () => window.print());
  document.addEventListener("ledger:langchange", () => {
    renderCaseOptions();
    updateAuthorityNote();
    render();
  });
})();
