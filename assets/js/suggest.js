const form = document.querySelector("#suggest-form");
const status = document.querySelector("#form-status");
const targetCase = document.querySelector("#target-case");
const turnstileMount = document.querySelector("#turnstile");
const note = document.querySelector("#form-note");
const submitButton = form.querySelector("button[type='submit']");

const params = new URLSearchParams(location.search);
const caseId = (params.get("case") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
const caseTitle = (params.get("title") ?? "").slice(0, 240);
let turnstileWidget;
let lastConfig = null;
let localBypass = false;

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
  // The banner starts hidden: this form now shares a page with the corrections
  // desk, so an empty "Loading the case…" line above unrelated prose reads as a
  // bug rather than as status.
  targetCase.hidden = false;
  if (!caseId) {
    targetCase.textContent = "No case was selected. Open a case on the ledger and use its “Suggest a source” button.";
    targetCase.classList.add("error");
    return false;
  }
  const link = document.createElement("a");
  link.href = `../?case=${encodeURIComponent(caseId)}`;
  link.textContent = caseTitle || caseId;
  targetCase.textContent = "Adding a source to: ";
  targetCase.append(link);
  return true;
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

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
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
      block(lastConfig?.turnstileMode === "live"
        ? `Human verification did not render: a live Turnstile key (${key.slice(0, 6)}\u2026) on "${host}". Add this hostname in the Turnstile dashboard, or set ALLOW_LOCAL_TURNSTILE_BYPASS=true in .dev.vars for local testing.`
        : `Human verification did not render on "${host}". Reload to try again.`);
      return true;
    },
    "expired-callback": () => setStatus("Human verification expired. Please complete it again.", true),
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!localBypass && turnstileWidget === undefined) {
    setStatus("Human verification is still loading. Please wait a moment.", true);
    return;
  }

  if (!localBypass && !window.turnstile.getResponse(turnstileWidget)) {
    setStatus("Complete the human-verification check above, then send.", true);
    return;
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
        turnstileToken: localBypass ? LOCAL_HUMAN_TOKEN : window.turnstile.getResponse(turnstileWidget),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "That could not be sent.");
    form.reset();
    if (!localBypass) window.turnstile.reset(turnstileWidget);
    setStatus(result.message ?? "Thank you. An editor will check the link.");
  } catch (error) {
    setStatus(error.message || "Unable to send that source.", true);
  } finally {
    setBusy(false);
  }
});

if (describeCase()) {
  setNote("Loading human verification…");
  configureTurnstile()
    .then(() => { if (!submitButton.disabled && !localBypass) setNote("Complete the verification check above before sending."); })
    .catch(() => disableForm("Human verification could not load, so this form cannot be sent. An ad or script blocker is the usual cause."));
} else {
  block("Open a case on the ledger and use its \u201cSuggest a source\u201d button; this form needs to know which case you mean.");
}
