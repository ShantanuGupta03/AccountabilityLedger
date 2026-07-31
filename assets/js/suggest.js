const form = document.querySelector("#suggest-form");
const status = document.querySelector("#form-status");
const targetCase = document.querySelector("#target-case");
const turnstileMount = document.querySelector("#turnstile");

const params = new URLSearchParams(location.search);
const caseId = (params.get("case") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
const caseTitle = (params.get("title") ?? "").slice(0, 240);
let turnstileWidget;

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function disableForm(message) {
  setStatus(message, true);
  form.querySelector("button[type='submit']").disabled = true;
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
  turnstileWidget = window.turnstile.render(turnstileMount, { sitekey: config.turnstileSiteKey });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (turnstileWidget === undefined) {
    setStatus("Human verification is still loading. Please wait a moment.", true);
    return;
  }

  const submit = form.querySelector("button[type='submit']");
  const data = new FormData(form);
  submit.disabled = true;
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
    submit.disabled = false;
  }
});

if (describeCase()) {
  configureTurnstile().catch(() => {
    disableForm("Human verification could not load. Please try again later.");
  });
} else {
  form.querySelector("button[type='submit']").disabled = true;
}
