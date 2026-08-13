/**
 * The RTI response library: reads the published ones, takes new ones.
 *
 * This is the loop the generator was missing. /rti/ hands a reader a letter and
 * then loses interest; this page asks what came back. That matters more than it
 * looks: 66 of 84 cases on this ledger rest on reporting alone, which is exactly
 * the flank a government uses to dismiss a case as media narrative. One reply on
 * a ministry's letterhead is a primary record — and so is a refusal, because
 * "denied under 8(1)(a)" is a government naming in writing the door it locked.
 *
 * Structure mirrors assets/js/suggest.js on purpose: same searchable case
 * picker, same Turnstile-is-best-effort posture, same honeypot and dwell-time
 * fallback. A reader whose browser cannot load the challenge still gets to
 * contribute; the row is flagged and a reviewer reads it by hand.
 */
(() => {
  const SU = window.SourceUtils;
  const t = (key, vars) => window.LedgerI18n?.t(key, vars) ?? "";

  const list = document.querySelector("#rtir-list");
  const countLine = document.querySelector("#rtir-count");
  const summary = document.querySelector("#rtir-summary");
  const form = document.querySelector("#rtir-form");
  const caseSelect = document.querySelector("#rtir-case");
  const caseSearch = document.querySelector("#rtir-case-search");
  const caseCount = document.querySelector("#rtir-case-count");
  const sectionWrap = document.querySelector("#rtir-section-wrap");
  const status = document.querySelector("#form-status");
  const note = document.querySelector("#form-note");
  const turnstileMount = document.querySelector("#turnstile");
  const submitButton = form?.querySelector("button[type='submit']");
  if (!list || !form || !submitButton) return;

  const escapeHTML = (value) => SU?.escapeHTML(value) ?? String(value ?? "");
  const LOCAL_HUMAN_TOKEN = "local-dev-bypass";
  const loadedAt = Date.now();
  let turnstileWidget;
  let localBypass = false;
  let degraded = false;
  let allCases = [];

  const OUTCOMES = {
    answered: { label: "Answered", kind: "answered" },
    partial: { label: "Partly answered", kind: "partial" },
    refused: { label: "Refused", kind: "refused" },
    no_reply: { label: "No reply at all", kind: "silent" },
  };

  /* ---------- reading the library ---------- */

  function responseCard(row) {
    const outcome = OUTCOMES[row.outcome] ?? OUTCOMES.answered;
    const clause = row.outcome === "refused" && row.refusal_section
      ? `<span class="rtir-clause">${escapeHTML(`Section ${row.refusal_section}`)}</span>`
      : "";
    const dates = [
      row.applied_on ? `${t("rtir_asked")} ${escapeHTML(row.applied_on)}` : "",
      row.replied_on ? `${t("rtir_replied")} ${escapeHTML(row.replied_on)}` : "",
    ].filter(Boolean).join(" &middot; ");
    const text = row.reply_text
      ? `<details class="rtir-text"><summary>${escapeHTML(t("rtir_read_reply"))}</summary><pre>${escapeHTML(row.reply_text)}</pre></details>`
      : "";
    const doc = row.document_url
      ? `<a class="case-share" href="${escapeHTML(row.document_url)}" rel="nofollow noopener noreferrer">${escapeHTML(t("rtir_see_document"))}</a>`
      : "";
    return `<li class="rtir-item rtir-${outcome.kind}">
      <p class="rtir-head">
        <span class="rtir-outcome">${escapeHTML(t(`rtir_badge_${row.outcome}`) || outcome.label)}</span>
        ${clause}
        <span class="rtir-dates">${dates}</span>
      </p>
      <p class="rtir-authority">${escapeHTML(row.authority)}</p>
      <p class="rtir-summary">${escapeHTML(row.summary)}</p>
      ${text}
      <p class="case-actions-row">
        <a class="case-share" href="../../case/${encodeURIComponent(row.case_id)}/">${escapeHTML(row.case_title || row.case_id)}</a>
        ${doc}
      </p>
    </li>`;
  }

  async function loadLibrary() {
    let payload = { responses: [] };
    try {
      const response = await fetch("../../api/rti-responses", { cache: "no-store" });
      if (response.ok) payload = await response.json();
    } catch {
      // The library is an enhancement; the form below still works without it.
    }
    const rows = Array.isArray(payload.responses) ? payload.responses : [];
    if (!rows.length) {
      // An empty library is the honest starting state, and saying so is a better
      // invitation than a blank space pretending to be a bug.
      countLine.textContent = t("rtir_empty");
      list.innerHTML = "";
      return;
    }
    summary.hidden = false;
    document.querySelector("#rtir-total").textContent = String(rows.length);
    document.querySelector("#rtir-refused").textContent = String(rows.filter((r) => r.outcome === "refused").length);
    document.querySelector("#rtir-silent").textContent = String(rows.filter((r) => r.outcome === "no_reply").length);
    countLine.textContent = t("rtir_count", { n: rows.length });
    list.innerHTML = rows.map(responseCard).join("");
    document.dispatchEvent(new CustomEvent("ledger:stats"));
  }

  /* ---------- the case picker ---------- */

  const caseKey = (caseFile) => caseFile.id ?? `case-${caseFile.no}`;

  function matches(caseFile, query) {
    if (!query) return true;
    const hay = [
      caseFile.title, caseFile.cat, caseFile.date, caseFile.year, caseFile.stamp,
      ...(caseFile.ministers ?? []).map((m) => `${m.n} ${m.r}`),
    ].join(" ").toLowerCase();
    return query.split(/\s+/).every((word) => hay.includes(word));
  }

  function renderCaseOptions() {
    const query = (caseSearch.value ?? "").trim().toLowerCase();
    const shown = allCases.filter((caseFile) => matches(caseFile, query));
    const previous = caseSelect.value;
    caseSelect.innerHTML = "";
    shown.forEach((caseFile) => {
      caseSelect.append(new Option(`${caseFile.date} — ${caseFile.title}`, caseKey(caseFile)));
    });
    if (previous && shown.some((caseFile) => caseKey(caseFile) === previous)) caseSelect.value = previous;
    else if (shown.length) caseSelect.value = caseKey(shown[0]);
    caseCount.textContent = shown.length
      ? t("rtir_case_matches", { n: shown.length })
      : t("rtir_case_none");
    caseCount.classList.toggle("blocked", shown.length === 0);
  }

  async function loadCaseList() {
    try {
      const response = await fetch("../../assets/data/cases.json", { cache: "no-store" });
      if (!response.ok) throw new Error("cases");
      allCases = (await response.json())
        .map((caseFile) => ({ ...caseFile, id: caseKey(caseFile) }))
        .sort((a, b) => Number(b.sk) - Number(a.sk));
    } catch {
      setNote(t("rtir_cases_failed"), true);
      submitButton.disabled = true;
      return;
    }
    caseSearch.addEventListener("input", renderCaseOptions);
    renderCaseOptions();

    // Arriving from a case page preselects it.
    const wanted = new URLSearchParams(location.search).get("case");
    if (wanted && allCases.some((caseFile) => caseFile.id === wanted)) {
      caseSearch.value = "";
      renderCaseOptions();
      caseSelect.value = wanted;
    }
  }

  /* ---------- form plumbing ---------- */

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  function setNote(message, blocked = false) {
    if (!note) return;
    note.textContent = message ?? "";
    note.hidden = !message;
    note.classList.toggle("blocked", blocked);
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    if (busy) submitButton.setAttribute("aria-busy", "true");
    else submitButton.removeAttribute("aria-busy");
  }

  // Only ask for a clause when a clause is the answer.
  form.outcome.addEventListener("change", () => {
    const refused = form.outcome.value === "refused";
    sectionWrap.hidden = !refused;
    form.refusalSection.required = refused;
  });

  function loadTurnstileScript(attempt = 1) {
    return new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        if (attempt >= 2) return reject(new Error("turnstile script unreachable"));
        setTimeout(() => loadTurnstileScript(attempt + 1).then(resolve, reject), 1200);
      };
      document.head.append(script);
    });
  }

  function degradeToUnverified(error) {
    degraded = true;
    turnstileMount.textContent = "";
    submitButton.disabled = false;
    setNote(t("rtir_degraded"));
    console.warn("Turnstile unavailable, sending unverified:", error);
  }

  function humanToken() {
    if (localBypass) return LOCAL_HUMAN_TOKEN;
    if (degraded || turnstileWidget === undefined) return "";
    return window.turnstile.getResponse(turnstileWidget) ?? "";
  }

  async function configureTurnstile() {
    const response = await fetch("../../api/public-config", { cache: "no-store" });
    const config = await response.json();
    if (config.submissionsEnabled && config.localHumanBypass) {
      localBypass = true;
      turnstileMount.textContent = "";
      setNote(t("rtir_local_bypass"));
      return;
    }
    await loadTurnstileScript();
    turnstileWidget = window.turnstile.render(turnstileMount, {
      sitekey: config.turnstileSiteKey,
      callback: () => { submitButton.disabled = false; setNote(""); },
      "error-callback": () => { degradeToUnverified(new Error("turnstile error-callback")); return true; },
      "expired-callback": () => setStatus(t("rtir_expired"), true),
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!caseSelect.value) {
      setStatus(t("rtir_pick_case"), true);
      return;
    }
    if (!localBypass && !degraded && turnstileWidget !== undefined
      && !window.turnstile.getResponse(turnstileWidget)) {
      setStatus(t("rtir_need_human"), true);
      return;
    }

    const picked = allCases.find((caseFile) => caseFile.id === caseSelect.value);
    const data = new FormData(form);
    setBusy(true);
    setStatus(t("rtir_sending"));
    try {
      const response = await fetch("../../api/rti-responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId: caseSelect.value,
          caseTitle: picked?.title ?? "",
          authority: data.get("authority"),
          appliedOn: data.get("appliedOn"),
          repliedOn: data.get("repliedOn"),
          outcome: data.get("outcome"),
          refusalSection: data.get("refusalSection"),
          summary: data.get("summary"),
          replyText: data.get("replyText"),
          documentUrl: data.get("documentUrl"),
          redactionConfirmed: form.redactionConfirmed.checked,
          submitterEmail: data.get("submitterEmail"),
          turnstileToken: humanToken(),
          honeypot: data.get("website") ?? "",
          dwellMs: Date.now() - loadedAt,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "That could not be sent.");
      form.reset();
      sectionWrap.hidden = true;
      if (!localBypass && !degraded && turnstileWidget !== undefined) window.turnstile.reset(turnstileWidget);
      renderCaseOptions();
      setStatus(result.message ?? t("rtir_sent"));
    } catch (error) {
      setStatus(error.message || t("rtir_failed"), true);
    } finally {
      setBusy(false);
    }
  });

  loadLibrary();
  loadCaseList();
  setNote(t("rtir_loading_human"));
  configureTurnstile()
    .then(() => { if (!submitButton.disabled && !localBypass) setNote(t("rtir_complete_human")); })
    .catch((error) => degradeToUnverified(error));

  document.addEventListener("ledger:langchange", () => { loadLibrary(); renderCaseOptions(); });
})();
