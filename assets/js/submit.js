const form = document.querySelector("#submission-form");
const status = document.querySelector("#form-status");
const note = document.querySelector("#form-note");
const turnstileMount = document.querySelector("#turnstile");
const submitButton = form.querySelector("button[type='submit']");
let turnstileWidget;

/** How long to wait for the verification widget before saying so. */
const TURNSTILE_TIMEOUT_MS = 12000;

function lines(value) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

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

/**
 * "Working on it" and "you cannot use this" are different states and get
 * different cursors. Only `busy` may show a wait cursor; anything else that
 * disables the button has to explain itself in the note below it.
 */
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

function unblock() {
  submitButton.disabled = false;
  submitButton.removeAttribute("aria-busy");
  submitButton.removeAttribute("title");
  setNote("");
}

async function configureTurnstile() {
  const response = await fetch("../api/public-config", { cache: "no-store" });
  const config = await response.json();

  if (!config.submissionsEnabled) {
    // The API already tells us which variables are unset; saying which one is
    // missing turns a dead button into something the operator can fix.
    const missing = Array.isArray(config.missing) && config.missing.length
      ? ` Missing configuration: ${config.missing.join(", ")}.`
      : "";
    block(`Submissions are switched off because this site is not fully configured.${missing}`);
    setStatus("Submissions are temporarily unavailable. Please return later.", true);
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("turnstile script blocked"));
    document.head.append(script);
  });

  turnstileWidget = window.turnstile.render(turnstileMount, {
    sitekey: config.turnstileSiteKey,
    callback: () => {
      unblock();
      setStatus("");
    },
    // Turnstile reports its own failures here — an unauthorised site key for
    // this domain, or a blocked challenge. Without this the widget just sits
    // there and the button looks broken for no stated reason.
    "error-callback": () => {
      block("Human verification could not complete on this domain. If you are the operator, check that the Turnstile widget allows this hostname.");
      return true;
    },
    "expired-callback": () => {
      setStatus("Human verification expired. Please complete it again.", true);
    },
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (turnstileWidget === undefined) {
    setStatus("Human verification is still loading. Please wait a moment and try again.", true);
    return;
  }
  if (!window.turnstile.getResponse(turnstileWidget)) {
    setStatus("Complete the human-verification check above, then submit.", true);
    return;
  }

  const data = new FormData(form);
  setBusy(true);
  setStatus("Submitting for review…");

  try {
    const response = await fetch("../api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        incidentDate: data.get("incidentDate"),
        category: data.get("category"),
        summary: data.get("summary"),
        accountabilityConcern: data.get("accountabilityConcern"),
        officeHolders: lines(data.get("officeHolders")),
        sourceUrls: lines(data.get("sourceUrls")),
        submitterEmail: data.get("submitterEmail"),
        turnstileToken: window.turnstile.getResponse(turnstileWidget),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Submission failed.");
    form.reset();
    window.turnstile.reset(turnstileWidget);
    setStatus("Submitted. An editor will review the evidence before any publication decision.");
  } catch (error) {
    setStatus(error.message || "Unable to submit the incident.", true);
  } finally {
    setBusy(false);
  }
});

setNote("Loading human verification…");
const turnstileTimer = setTimeout(() => {
  if (turnstileWidget === undefined && !submitButton.disabled) {
    setNote("Human verification is taking longer than usual. It may be blocked by an extension or a network filter.", true);
  }
}, TURNSTILE_TIMEOUT_MS);

configureTurnstile()
  .then(() => {
    clearTimeout(turnstileTimer);
    if (!submitButton.disabled) setNote("Complete the verification check above before submitting.");
  })
  .catch(() => {
    clearTimeout(turnstileTimer);
    block("Human verification could not load, so the form cannot be submitted. An ad or script blocker is the usual cause.");
    setStatus("Human verification could not load. Please try again later.", true);
  });
