const list = document.querySelector("#submission-list");
const detail = document.querySelector("#submission-detail");
const form = document.querySelector("#review-form");
const notes = document.querySelector("#review-notes");
const caseJson = document.querySelector("#case-json");
const status = document.querySelector("#review-status");
let submissions = [];

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
  notes.value = "";
  caseJson.value = JSON.stringify(caseTemplate(submission), null, 2);
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
    submissions = submissions.filter((item) => item.id !== submission.id);
    [...list.options].find((option) => option.value === submission.id)?.remove();
    list.value = list.options[0]?.value ?? "";
    showSubmission();
    status.textContent = `Marked ${result.status}.`;
  } catch (error) {
    status.textContent = error.message || "Unable to save the review decision.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

async function loadQueue() {
  const response = await fetch("../api/admin/submissions?status=pending", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load review queue.");
  submissions = data.submissions;
  list.replaceChildren();
  if (!submissions.length) {
    list.append(new Option("No pending submissions", ""));
    showSubmission();
    return;
  }
  submissions.forEach((submission) => list.append(new Option(`${submission.incident_date} · ${submission.title}`, submission.id)));
  showSubmission();
}

list.addEventListener("change", showSubmission);
form.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", updateSubmission));
loadQueue().catch((error) => {
  status.textContent = error.message || "Unable to load review queue.";
  status.classList.add("error");
});
