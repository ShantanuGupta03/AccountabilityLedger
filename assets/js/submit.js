const form = document.querySelector("#submission-form");
const status = document.querySelector("#form-status");
const turnstileMount = document.querySelector("#turnstile");
let turnstileWidget;

function lines(value) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

async function configureTurnstile() {
  const response = await fetch("../api/public-config", { cache: "no-store" });
  const config = await response.json();
  if (!config.submissionsEnabled) {
    setStatus("Submissions are temporarily unavailable. Please return later.", true);
    form.querySelector("button").disabled = true;
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
    submit.disabled = false;
  }
});

configureTurnstile().catch(() => {
  setStatus("Human verification could not load. Please try again later.", true);
  form.querySelector("button").disabled = true;
});
