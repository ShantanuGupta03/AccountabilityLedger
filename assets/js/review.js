const list = document.querySelector("#submission-list");
const queueList = document.querySelector("#queue-list");
const queueCount = document.querySelector("#queue-count");
const reviewerInfo = document.querySelector("#reviewer-info");
const detail = document.querySelector("#submission-detail");
const form = document.querySelector("#review-form");
const notes = document.querySelector("#review-notes");
const caseJson = document.querySelector("#case-json");
const status = document.querySelector("#review-status");
const queueStatus = document.querySelector("#queue-status");
const queueWarning = document.querySelector("#queue-warning");
const deleteButton = document.querySelector("#delete-submission");
const reviewAuth = document.querySelector("#review-auth");
const reviewConsole = document.querySelector("#review-console");
const reviewAuthForm = document.querySelector("#review-auth-form");
const reviewSecretInput = document.querySelector("#review-secret");
const reviewSecretToggle = document.querySelector("#review-secret-toggle");
const reviewAuthStatus = document.querySelector("#review-auth-status");
const reviewAuthLead = document.querySelector("#review-auth-lead");
let submissions = [];
let reviewerEmail = "";

const REVIEW_SECRET_KEY = "ledger-review-secret";

function reviewHeaders(extra = {}) {
  const headers = { ...extra };
  const secret = sessionStorage.getItem(REVIEW_SECRET_KEY);
  if (secret) headers["X-Review-Secret"] = secret;
  return headers;
}

function adminFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: reviewHeaders(options.headers ?? {}),
  });
}

function showAuthGate(message = "") {
  reviewConsole.hidden = true;
  reviewAuth.hidden = false;
  if (message) {
    reviewAuthStatus.textContent = message;
    reviewAuthStatus.classList.add("error");
  }
}

function showConsole() {
  reviewAuth.hidden = true;
  reviewConsole.hidden = false;
  reviewAuthStatus.textContent = "";
  reviewAuthStatus.classList.remove("error");
}

async function loadAuthHints() {
  try {
    const response = await fetch("/api/public-config", { cache: "no-store" });
    if (!response.ok) {
      reviewAuthLead.textContent = "Could not reach the server. Check your connection and try again.";
    }
  } catch {
    reviewAuthLead.textContent = "Could not reach the server. Check your connection and try again.";
  }
}

reviewSecretToggle?.addEventListener("click", () => {
  const show = reviewSecretInput.type === "password";
  reviewSecretInput.type = show ? "text" : "password";
  reviewSecretToggle.textContent = show ? "Hide" : "Show";
  reviewSecretToggle.setAttribute("aria-pressed", String(show));
  reviewSecretToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

/* What each decision means depends on which queue you are looking at: from the
   published queue, "approved" and "rejected" both retract the live case. */
const ACTION_LABELS = {
  pending: { published: "Publish to ledger", approved: "Keep approved", rejected: "Reject" },
  approved: { published: "Publish to ledger", approved: "Keep approved", rejected: "Reject" },
  published: {
    published: "Update the live case",
    approved: "Unpublish, keep approved",
    rejected: "Unpublish and reject",
  },
  rejected: { published: "Publish to ledger", approved: "Restore to approved", rejected: "Keep rejected" },
};

function caseTemplate(submission) {
  return {
    sk: Number(submission.incident_date.replaceAll("-", "")),
    year: Number(submission.incident_date.slice(0, 4)),
    date: submission.incident_date,
    cat: submission.category,
    sev: "amber",
    title: submission.title,
    stamp: "Submitted incident. Under editorial review.",
    human: { v: "Not quantified in the submitted material.", est: true },
    cost: { v: "Not quantified in the submitted material.", est: true },
    what: submission.summary,
    dodge: submission.accountability_concern,
    ministers: submission.office_holders.map((name) => ({ n: name, r: "Role to verify during review" })),
    alt: "Establish the facts, publish the evidence and determine the appropriate accountability.",
    sources: submission.source_urls.map((url) => ({ label: new URL(url).hostname, url })),
  };
}

function selectedSubmission() {
  return submissions.find((submission) => submission.id === list.value);
}

function isVerified(submission) {
  return Number(submission?.human_verified ?? 1) === 1;
}

function renderQueueList() {
  queueList.replaceChildren();

  if (!submissions.length) {
    const empty = document.createElement("li");
    empty.className = "queue-empty";
    empty.textContent = emptyLabel();
    queueList.append(empty);
    queueCount.textContent = emptyLabel();
    if (queueStatus.value === "published") {
      fetch("/api/cases", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : { cases: [] }))
        .then((data) => {
          const n = Array.isArray(data.cases) ? data.cases.length : 0;
          queueCount.textContent = n
            ? `${emptyLabel()} (${n} submission case${n === 1 ? "" : "s"} in /api/cases; list may be out of sync — refresh)`
            : `${emptyLabel()} (0 submission cases in /api/cases)`;
        })
        .catch(() => {});
    }
    return;
  }

  const unverified = submissions.filter((item) => !isVerified(item)).length;
  queueCount.textContent = `${submissions.length} in ${queueStatus.value}`
    + (unverified ? ` · ${unverified} not human-verified` : "");

  submissions.forEach((submission) => {
    const item = document.createElement("li");
    item.className = "queue-item";
    if (submission.id === list.value) item.classList.add("selected");

    const head = document.createElement("div");
    head.className = "queue-item-head";
    const title = document.createElement("h3");
    title.textContent = submission.title;
    const meta = document.createElement("p");
    meta.className = "queue-item-meta";
    meta.textContent = `${submission.incident_date} · ${submission.category}`;
    head.append(title, meta);
    if (!isVerified(submission)) {
      const badge = document.createElement("span");
      badge.className = "queue-badge";
      badge.textContent = "Unverified";
      head.append(badge);
    }

    const actions = document.createElement("div");
    actions.className = "queue-item-actions";

    const open = document.createElement("button");
    open.type = "button";
    open.className = "case-share";
    open.textContent = "Open";
    open.addEventListener("click", () => {
      list.value = submission.id;
      showSubmission();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "case-share";
    reject.textContent = queueStatus.value === "published" ? "Unpublish" : "Reject";
    reject.addEventListener("click", () => quickDecision(submission.id, queueStatus.value === "published" ? "approved" : "rejected", reject));

    const erase = document.createElement("button");
    erase.type = "button";
    erase.className = "danger-action";
    erase.textContent = "Erase";
    erase.addEventListener("click", () => quickErase(submission.id, erase));

    actions.append(open, reject, erase);
    item.append(head, actions);
    queueList.append(item);
  });
}

async function quickDecision(id, nextStatus, button) {
  const submission = submissions.find((item) => item.id === id);
  if (!submission) return;
  if (nextStatus === "published") {
    list.value = id;
    showSubmission();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    status.textContent = "Edit the JSON below, then press Publish to ledger.";
    return;
  }
  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Saving…";
  try {
    const response = await adminFetch(`/api/admin/submissions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reviewNotes: notes.value || "Quick decision from queue list." }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to save the review decision.");
    if (result.status === queueStatus.value) await loadQueue();
    else dropFromQueue(id);
    status.textContent = `Marked ${result.status}.`;
  } catch (error) {
    status.textContent = error.message || "Unable to save the review decision.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

async function quickErase(id, button) {
  const submission = submissions.find((item) => item.id === id);
  if (!submission) return;
  const confirmed = window.confirm(
    `Erase "${submission.title}" and any case it published?\n\nThis cannot be undone.`,
  );
  if (!confirmed) return;
  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Erasing…";
  try {
    const response = await adminFetch(`/api/admin/submissions/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to erase that submission.");
    dropFromQueue(id);
    status.textContent = "Erased.";
  } catch (error) {
    status.textContent = error.message || "Unable to erase that submission.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

function showSubmission() {
  const submission = selectedSubmission();
  const queue = queueStatus.value;
  if (queue === "published") {
    queueWarning.hidden = false;
    queueWarning.textContent = submissions.length
      ? "These reader-submitted cases are live on the site right now. Unpublishing removes one immediately."
      : QUEUE_SCOPE.published;
  } else {
    queueWarning.hidden = true;
    queueWarning.textContent = "";
  }
  form.querySelectorAll("[data-status]").forEach((button) => {
    button.textContent = ACTION_LABELS[queue][button.dataset.status];
  });
  renderQueueList();

  if (!submission) {
    detail.hidden = true;
    form.hidden = true;
    return;
  }
  detail.hidden = false;
  form.hidden = false;
  detail.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = submission.title;
  const meta = document.createElement("p");
  const verified = isVerified(submission);
  meta.textContent = `${submission.incident_date} · ${submission.category}`
    + (verified ? "" : " · NOT HUMAN-VERIFIED, CHECK BY HAND");
  meta.classList.toggle("meta-unverified", !verified);
  const summary = document.createElement("p");
  summary.textContent = submission.summary;
  const concern = document.createElement("p");
  concern.textContent = `Accountability concern: ${submission.accountability_concern}`;
  const sources = document.createElement("p");
  sources.textContent = `Sources: ${submission.source_urls.join(" · ")}`;
  detail.append(heading, meta, summary, concern, sources);
  notes.value = submission.review_notes ?? "";
  caseJson.value = JSON.stringify(submission.published_case ?? caseTemplate(submission), null, 2);
  status.textContent = "";
}

async function updateSubmission(event) {
  const submission = selectedSubmission();
  if (!submission) return;
  const button = event.currentTarget;
  const payload = { status: button.dataset.status, reviewNotes: notes.value };
  if (payload.status === "published") {
    try {
      payload.caseData = JSON.parse(caseJson.value);
    } catch {
      status.textContent = "Published case JSON is invalid.";
      status.classList.add("error");
      return;
    }
  }
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  status.classList.remove("error");
  status.textContent = "Saving review decision…";
  try {
    const response = await adminFetch(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to save the review decision.");
    if (result.status === queueStatus.value) {
      await loadQueue();
    } else {
      dropFromQueue(submission.id);
    }
    status.textContent = `Marked ${result.status}.`;
  } catch (error) {
    status.textContent = error.message || "Unable to save the review decision.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function dropFromQueue(id) {
  submissions = submissions.filter((item) => item.id !== id);
  [...list.options].find((option) => option.value === id)?.remove();
  if (!list.options.length) list.append(new Option(emptyLabel(), ""));
  list.value = list.options[0]?.value ?? "";
  showSubmission();
}

async function deleteSubmission() {
  const submission = selectedSubmission();
  if (!submission) return;
  const confirmed = window.confirm(
    `Erase "${submission.title}" and any case it published?\n\n`
    + "This deletes the stored submission itself, not just the public case, and cannot be undone. "
    + "To take a case off the ledger while keeping the record, unpublish it instead.",
  );
  if (!confirmed) return;

  deleteButton.disabled = true;
  status.classList.remove("error");
  status.textContent = "Erasing…";
  try {
    const response = await adminFetch(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to erase that submission.");
    dropFromQueue(submission.id);
    status.textContent = "Erased.";
  } catch (error) {
    status.textContent = error.message || "Unable to erase that submission.";
    status.classList.add("error");
  } finally {
    deleteButton.disabled = false;
  }
}

const EMPTY_LABELS = {
  pending: "Nothing waiting for review",
  published: "No reader submissions are live on the site right now",
  approved: "Nothing approved and unpublished",
  rejected: "Nothing rejected",
};

const QUEUE_SCOPE = {
  published: "This queue is only for cases a reader submitted and you published through this console. "
    + "The main ledger cases in assets/data/cases.json are edited in the repository and redeployed — they never appear here.",
};

function emptyLabel() {
  return EMPTY_LABELS[queueStatus.value];
}

async function loadQueue() {
  const response = await adminFetch(`/api/admin/submissions?status=${queueStatus.value}`, { cache: "no-store" });
  const data = await response.json();
  if (response.status === 403) {
    sessionStorage.removeItem(REVIEW_SECRET_KEY);
    showAuthGate("Incorrect password. Try again.");
    throw new Error("Reviewer access required.");
  }
  if (!response.ok) throw new Error(data.error ?? "Unable to load review queue.");
  submissions = data.submissions;
  if (data.reviewer) {
    reviewerEmail = data.reviewer;
    reviewerInfo.hidden = false;
    reviewerInfo.textContent = `Signed in as ${data.reviewer}. Queues are private; nothing here is public until you publish.`;
  }
  showConsole();
  list.replaceChildren();
  if (!submissions.length) {
    list.append(new Option(emptyLabel(), ""));
    showSubmission();
    return;
  }
  submissions.forEach((submission) => list.append(new Option(
    `${isVerified(submission) ? "" : "⚠ "}${submission.incident_date} · ${submission.title}`,
    submission.id,
  )));
  if (!submissions.some((item) => item.id === list.value)) {
    list.value = submissions[0].id;
  }
  showSubmission();
}

const suggestionList = document.querySelector("#suggestion-list");
const suggestionCount = document.querySelector("#suggestion-count");
const suggestionStatus = document.querySelector("#suggestion-status");

const SUGGESTION_LABELS = {
  pending: { approved: "Approve and show on case", rejected: "Reject" },
  approved: { approved: "Save the label", rejected: "Take off the case" },
  rejected: { approved: "Approve and show on case", rejected: "Keep rejected" },
};

function suggestionCard(suggestion) {
  const item = document.createElement("li");
  item.className = "suggestion";

  const heading = document.createElement("h3");
  const caseLink = document.createElement("a");
  caseLink.href = `../?case=${encodeURIComponent(suggestion.case_id)}`;
  caseLink.target = "_blank";
  caseLink.rel = "noopener noreferrer";
  caseLink.textContent = suggestion.case_title || suggestion.case_id;
  heading.append("For: ", caseLink);

  const link = document.createElement("a");
  link.className = "suggestion-url";
  link.href = suggestion.url;
  link.target = "_blank";
  link.rel = "nofollow noopener noreferrer";
  link.textContent = suggestion.url;

  const labelField = document.createElement("label");
  labelField.textContent = "Label shown on the case";
  const labelInput = document.createElement("input");
  labelInput.value = suggestion.label;
  labelInput.maxLength = 60;
  labelField.append(labelInput);

  const notesField = document.createElement("label");
  notesField.textContent = "Review notes";
  const notesInput = document.createElement("input");
  notesInput.maxLength = 5000;
  notesField.append(notesInput);

  const actions = document.createElement("div");
  actions.className = "case-actions";
  const result = document.createElement("p");
  result.className = "form-status";

  const queue = suggestionStatus.value;

  const send = async (button, request, failure) => {
    actions.querySelectorAll("button").forEach((element) => {
      element.disabled = true;
      element.setAttribute("aria-busy", "true");
    });
    result.classList.remove("error");
    result.textContent = "Saving…";
    try {
      const response = await adminFetch(`/api/admin/source-suggestions/${encodeURIComponent(suggestion.id)}`, request);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? failure);
      if (payload.status === queue) {
        result.textContent = "Saved.";
        actions.querySelectorAll("button").forEach((element) => {
          element.disabled = false;
          element.removeAttribute("aria-busy");
        });
        return;
      }
      item.remove();
      updateSuggestionCount();
    } catch (error) {
      result.textContent = error.message || failure;
      result.classList.add("error");
      actions.querySelectorAll("button").forEach((element) => {
        element.disabled = false;
        element.removeAttribute("aria-busy");
      });
      button.focus();
    }
  };

  const decide = (decision, button) => send(button, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: decision, label: labelInput.value, reviewNotes: notesInput.value }),
  }, "Unable to save that decision.");

  const approve = document.createElement("button");
  approve.type = "button";
  approve.className = "form-submit";
  approve.textContent = SUGGESTION_LABELS[queue].approved;
  approve.addEventListener("click", () => decide("approved", approve));

  const reject = document.createElement("button");
  reject.type = "button";
  reject.className = "case-share";
  reject.textContent = SUGGESTION_LABELS[queue].rejected;
  reject.addEventListener("click", () => decide("rejected", reject));

  const erase = document.createElement("button");
  erase.type = "button";
  erase.className = "danger-action";
  erase.textContent = "Erase permanently";
  erase.addEventListener("click", () => {
    const confirmed = window.confirm(
      `Erase the suggested link ${suggestion.url}?\n\n`
      + "This deletes the stored url and note, not just its place on the case, and cannot be undone.",
    );
    if (confirmed) send(erase, { method: "DELETE" }, "Unable to erase that suggestion.");
  });

  actions.append(approve, reject, erase);
  item.append(heading, link);
  if (suggestion.note) {
    const note = document.createElement("p");
    note.className = "suggestion-note";
    note.textContent = suggestion.note;
    item.append(note);
  }
  item.append(labelField, notesField, actions, result);
  return item;
}

function updateSuggestionCount() {
  const remaining = suggestionList.childElementCount;
  const state = suggestionStatus.value === "approved" ? "live on the ledger" : suggestionStatus.value;
  suggestionCount.textContent = remaining
    ? `${remaining} suggested source${remaining > 1 ? "s" : ""} ${state}`
    : `No suggested sources ${state}.`;
}

async function loadSuggestions() {
  suggestionCount.classList.remove("error");
  const response = await adminFetch(`/api/admin/source-suggestions?status=${suggestionStatus.value}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load suggested sources.");
  suggestionList.replaceChildren(...data.suggestions.map(suggestionCard));
  updateSuggestionCount();
}

function refreshSuggestions() {
  loadSuggestions().catch((error) => {
    suggestionCount.textContent = error.message || "Unable to load suggested sources.";
    suggestionCount.classList.add("error");
  });
}

function refreshQueue() {
  loadQueue().catch((error) => {
    if (error.message.includes("Reviewer access")) return;
    status.textContent = error.message || "Unable to load review queue.";
    status.classList.add("error");
  });
}

reviewAuthForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const secret = reviewSecretInput?.value?.trim();
  if (!secret) return;
  sessionStorage.setItem(REVIEW_SECRET_KEY, secret);
  reviewAuthStatus.textContent = "Checking…";
  reviewAuthStatus.classList.remove("error");
  refreshQueue();
});

document.querySelector("#export-published-overlay")?.addEventListener("click", async () => {
  const button = document.querySelector("#export-published-overlay");
  try {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    const response = await adminFetch("/api/admin/submissions?status=published", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to export published cases.");
    const cases = data.submissions.map((item) => item.published_case).filter(Boolean);
    const blob = new Blob([`${JSON.stringify(cases, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "published-overlay.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status.textContent = cases.length
      ? `Downloaded ${cases.length} case(s). Save as assets/data/published-overlay.json and redeploy.`
      : "No published submission cases to export yet.";
    status.classList.remove("error");
  } catch (error) {
    status.textContent = error.message || "Export failed.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
});

list.addEventListener("change", showSubmission);
queueStatus.addEventListener("change", refreshQueue);
suggestionStatus.addEventListener("change", refreshSuggestions);
deleteButton.addEventListener("click", deleteSubmission);
form.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", updateSubmission));

loadAuthHints();
if (sessionStorage.getItem(REVIEW_SECRET_KEY)) {
  refreshQueue();
  refreshSuggestions();
} else {
  showAuthGate();
  loadQueue()
    .then(() => refreshSuggestions())
    .catch(() => {});
}
