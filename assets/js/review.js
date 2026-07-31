const list = document.querySelector("#submission-list");
const detail = document.querySelector("#submission-detail");
const form = document.querySelector("#review-form");
const notes = document.querySelector("#review-notes");
const caseJson = document.querySelector("#case-json");
const status = document.querySelector("#review-status");
const queueStatus = document.querySelector("#queue-status");
const queueWarning = document.querySelector("#queue-warning");
const deleteButton = document.querySelector("#delete-submission");
let submissions = [];

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

function showSubmission() {
  const submission = selectedSubmission();
  const queue = queueStatus.value;
  queueWarning.hidden = queue !== "published";
  queueWarning.textContent = queue === "published"
    ? "These cases are live on the public ledger right now. Unpublishing removes one immediately."
    : "";
  form.querySelectorAll("[data-status]").forEach((button) => {
    button.textContent = ACTION_LABELS[queue][button.dataset.status];
  });

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
  meta.textContent = `${submission.incident_date} · ${submission.category}`;
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
  status.classList.remove("error");
  status.textContent = "Saving review decision…";
  try {
    const response = await fetch(`../api/admin/submissions/${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to save the review decision.");
    // The list only holds one status, so a decision that changes it drops the item.
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
    const response = await fetch(`../api/admin/submissions/${encodeURIComponent(submission.id)}`, { method: "DELETE" });
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
  published: "Nothing is live on the ledger",
  approved: "Nothing approved and unpublished",
  rejected: "Nothing rejected",
};

function emptyLabel() {
  return EMPTY_LABELS[queueStatus.value];
}

async function loadQueue() {
  const response = await fetch(`../api/admin/submissions?status=${queueStatus.value}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load review queue.");
  submissions = data.submissions;
  list.replaceChildren();
  if (!submissions.length) {
    list.append(new Option(emptyLabel(), ""));
    showSubmission();
    return;
  }
  submissions.forEach((submission) => list.append(new Option(`${submission.incident_date} · ${submission.title}`, submission.id)));
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
    actions.querySelectorAll("button").forEach((element) => { element.disabled = true; });
    result.classList.remove("error");
    result.textContent = "Saving…";
    try {
      const response = await fetch(`../api/admin/source-suggestions/${encodeURIComponent(suggestion.id)}`, request);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? failure);
      if (payload.status === queue) {
        result.textContent = "Saved.";
        actions.querySelectorAll("button").forEach((element) => { element.disabled = false; });
        return;
      }
      item.remove();
      updateSuggestionCount();
    } catch (error) {
      result.textContent = error.message || failure;
      result.classList.add("error");
      actions.querySelectorAll("button").forEach((element) => { element.disabled = false; });
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
  const response = await fetch(`../api/admin/source-suggestions?status=${suggestionStatus.value}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load suggested sources.");
  suggestionList.replaceChildren(...data.suggestions.map(suggestionCard));
  updateSuggestionCount();
}

function refreshQueue() {
  loadQueue().catch((error) => {
    status.textContent = error.message || "Unable to load review queue.";
    status.classList.add("error");
  });
}

function refreshSuggestions() {
  loadSuggestions().catch((error) => {
    suggestionCount.textContent = error.message || "Unable to load suggested sources.";
    suggestionCount.classList.add("error");
  });
}

list.addEventListener("change", showSubmission);
queueStatus.addEventListener("change", refreshQueue);
suggestionStatus.addEventListener("change", refreshSuggestions);
deleteButton.addEventListener("click", deleteSubmission);
form.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", updateSubmission));
refreshQueue();
refreshSuggestions();
