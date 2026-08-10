const form = document.querySelector("#suggest-form");
const status = document.querySelector("#form-status");
const targetCase = document.querySelector("#target-case");
const turnstileMount = document.querySelector("#turnstile");
const note = document.querySelector("#form-note");
const submitButton = form.querySelector("button[type='submit']");

const params = new URLSearchParams(location.search);
let caseId = (params.get("case") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
let caseTitle = (params.get("title") ?? "").slice(0, 240);

const casePicker = document.querySelector("#suggest-case-picker");
const caseSelect = document.querySelector("#suggest-case");
const caseSearch = document.querySelector("#suggest-case-search");
const caseCount = document.querySelector("#suggest-case-count");
let allCases = [];
let turnstileWidget;
let lastConfig = null;
let localBypass = false;
/** See assets/js/submit.js: a blocked challenge must not cost a reader their source. */
let degraded = false;
const loadedAt = Date.now();

/** Must match LOCAL_HUMAN_TOKEN in functions/_utils.js. */
const LOCAL_HUMAN_TOKEN = "local-dev-bypass";

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

/** Only an in-flight request may show a wait cursor. See assets/css/styles.css. */
function setBusy(busy) {
  submitButton.disabled = busy;
  if (busy) submitButton.setAttribute("aria-busy", "true");
  else submitButton.removeAttribute("aria-busy");
}

function block(reason) {
  submitButton.removeAttribute("aria-busy");
  submitButton.disabled = true;
  submitButton.title = reason;
  setNote(reason, true);
}

function disableForm(message) {
  setStatus(message, true);
  block(message);
}

function describeCase() {
  // The banner starts hidden: this form shares a page with the corrections desk,
  // so an empty "Loading the case…" line above unrelated prose reads as a bug
  // rather than as status.
  if (!caseId) {
    targetCase.hidden = true;
    return;
  }
  targetCase.hidden = false;
  targetCase.classList.remove("error");
  const link = document.createElement("a");
  link.href = `../?case=${encodeURIComponent(caseId)}`;
  link.textContent = caseTitle || caseId;
  targetCase.textContent = "Adding a source to: ";
  targetCase.append(link);
}

/* ---------- case picker ----------
   This form used to require arriving from a case page and refused to work
   otherwise. Now that the corrections desk is in the main navigation, a reader
   can land here first, and telling them to go away and come back through a
   different door is a good way to lose the source they were about to give us. */

function matchesCase(caseFile, query) {
  if (!query) return true;
  const hay = [
    caseFile.title, caseFile.cat, caseFile.date, caseFile.year, caseFile.stamp,
    ...(caseFile.ministers ?? []).map((minister) => `${minister.n} ${minister.r}`),
  ].join(" ").toLowerCase();
  return query.split(/\s+/).every((word) => hay.includes(word));
}

function renderCaseOptions() {
  const query = (caseSearch.value ?? "").trim().toLowerCase();
  const shown = allCases.filter((caseFile) => matchesCase(caseFile, query));
  const previous = caseSelect.value;
  caseSelect.innerHTML = "";
  shown.forEach((caseFile) => {
    caseSelect.append(new Option(`${caseFile.date} — ${caseFile.title}`, caseFile.id));
  });
  if (previous && shown.some((caseFile) => caseFile.id === previous)) caseSelect.value = previous;
  else if (shown.length) caseSelect.value = shown[0].id;
  caseCount.textContent = shown.length
    ? `${shown.length} case${shown.length === 1 ? "" : "s"}. Pick the one this source belongs to.`
    : "Nothing matches that. Try a minister's name, a year, or a word from the title.";
  caseCount.classList.toggle("blocked", shown.length === 0);
  syncPickedCase();
}

function syncPickedCase() {
  const picked = allCases.find((caseFile) => caseFile.id === caseSelect.value);
  caseId = picked?.id ?? "";
  caseTitle = picked?.title ?? "";
  if (caseId) unblockForCase();
  else block("Pick the case this source belongs to.");
}

function unblockForCase() {
  submitButton.removeAttribute("title");
  if (!degraded && !localBypass && turnstileWidget !== undefined
    && !window.turnstile?.getResponse(turnstileWidget)) {
    return;
  }
  submitButton.disabled = false;
  setNote("");
}

async function offerCasePicker() {
  try {
    const response = await fetch("../assets/data/cases.json", { cache: "no-store" });
    if (!response.ok) throw new Error("cases");
    allCases = (await response.json())
      .map((caseFile) => ({ ...caseFile, id: caseFile.id ?? `case-${caseFile.no}` }))
      .sort((a, b) => Number(b.sk) - Number(a.sk));
  } catch {
    block("The case list could not be loaded. Open a case on the ledger and use its “Suggest a source” button.");
    return;
  }
  casePicker.hidden = false;
  caseSearch.addEventListener("input", renderCaseOptions);
  caseSelect.addEventListener("change", syncPickedCase);
  renderCaseOptions();
}

/** One retry, then give up and let the form through unverified. */
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
  submitButton.removeAttribute("aria-busy");
  submitButton.removeAttribute("title");
  setNote("Human verification could not be shown here, so it has been skipped. You can still send this: it will be "
    + "queued as unverified and checked by an editor by hand.");
  setStatus("");
  console.warn("Turnstile unavailable, sending unverified:", error);
}

function humanToken() {
  if (localBypass) return LOCAL_HUMAN_TOKEN;
  if (degraded || turnstileWidget === undefined) return "";
  return window.turnstile.getResponse(turnstileWidget) ?? "";
}

async function configureTurnstile() {
  const response = await fetch("../api/public-config", { cache: "no-store" });
  const config = await response.json();
  lastConfig = config;
  if (config.submissionsEnabled && config.localHumanBypass) {
    localBypass = true;
    turnstileMount.textContent = "";
    setNote("Local development: human verification is bypassed on this host. This never applies to a deployed site.");
    return;
  }
  if (!config.submissionsEnabled) {
    disableForm("Source suggestions are temporarily unavailable. Please return later.");
    return;
  }

  await loadTurnstileScript();
  turnstileWidget = window.turnstile.render(turnstileMount, {
    sitekey: config.turnstileSiteKey,
    callback: () => {
      submitButton.disabled = false;
      submitButton.removeAttribute("title");
      setNote("");
    },
    "error-callback": () => {
      const host = lastConfig?.hostname || location.hostname;
      const key = String(lastConfig?.turnstileSiteKey ?? "");
      console.warn(lastConfig?.turnstileMode === "live"
        ? `Turnstile did not render: live key (${key.slice(0, 6)}\u2026) on "${host}". Add this hostname in the Turnstile dashboard.`
        : `Turnstile did not render on "${host}".`);
      degradeToUnverified(new Error("turnstile error-callback"));
      return true;
    },
    "expired-callback": () => setStatus("Human verification expired. Please complete it again.", true),
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!caseId) {
    setStatus("Pick the case this source belongs to first.", true);
    return;
  }
  if (!localBypass && !degraded) {
    if (turnstileWidget === undefined) {
      setStatus("Human verification is still loading. Please wait a moment.", true);
      return;
    }
    if (!window.turnstile.getResponse(turnstileWidget)) {
      setStatus("Complete the human-verification check above, then send.", true);
      return;
    }
  }

  const data = new FormData(form);
  setBusy(true);
  setStatus("Sending…");

  try {
    const response = await fetch("../api/case-sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caseId,
        caseTitle,
        url: data.get("url"),
        label: data.get("label"),
        note: data.get("note"),
        submitterEmail: data.get("submitterEmail"),
        turnstileToken: humanToken(),
        honeypot: data.get("website") ?? "",
        dwellMs: Date.now() - loadedAt,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "That could not be sent.");
    form.reset();
    if (!localBypass && !degraded) window.turnstile.reset(turnstileWidget);
    setStatus(result.message ?? "Thank you. An editor will check the link.");
  } catch (error) {
    setStatus(error.message || "Unable to send that source.", true);
  } finally {
    setBusy(false);
  }
});

describeCase();
if (!caseId) offerCasePicker();

setNote("Loading human verification\u2026");
configureTurnstile()
  .then(() => { if (!submitButton.disabled && !localBypass) setNote("Complete the verification check above before sending."); })
  .catch((error) => degradeToUnverified(error));
