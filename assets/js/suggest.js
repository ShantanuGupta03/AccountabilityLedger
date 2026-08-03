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
      block("Human verification could not complete on this domain. If you are the operator, check the Turnstile widget's allowed hostnames.");
      return true;
    },
    "expired-callback": () => setStatus("Human verification expired. Please complete it again.", true),
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (turnstileWidget === undefined) {
    setStatus("Human verification is still loading. Please wait a moment.", true);
    return;
  }

  if (!window.turnstile.getResponse(turnstileWidget)) {
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
        turnstileToken: window.turnstile.getResponse(turnstileWidget),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "That could not be sent.");
    form.reset();
    window.turnstile.reset(turnstileWidget);
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
    .then(() => { if (!submitButton.disabled) setNote("Complete the verification check above before sending."); })
    .catch(() => disableForm("Human verification could not load, so this form cannot be sent. An ad or script blocker is the usual cause."));
} else {
  block("Open a case on the ledger and use its \u201cSuggest a source\u201d button; this form needs to know which case you mean.");
}
