/**
 * Shows published RTI responses on the case page they belong to.
 *
 * Case pages are static, built at deploy time; responses live in D1 and are
 * published by a reviewer whenever one arrives. So this is a progressive
 * enhancement: the page is complete without it, and if the API is down or the
 * reader has JavaScript off they simply do not see a section that would
 * otherwise have been empty.
 *
 * It is inserted after the sources list, because that is the argument it belongs
 * to. A reply on a ministry's letterhead is a primary record, and on most of
 * these cases it is the only one.
 */
(() => {
  const article = document.querySelector(".casefile");
  const sources = document.querySelector(".src-items")?.closest(".case-field");
  if (!article || !sources) return;

  // /case/<id>/ — the id is the only thing we need and the URL already has it.
  const caseId = location.pathname.replace(/\/+$/, "").split("/").pop();
  if (!caseId) return;

  const SU = window.SourceUtils;
  const t = (key, vars) => window.LedgerI18n?.t(key, vars) ?? "";
  const escapeHTML = (value) => SU?.escapeHTML(value) ?? String(value ?? "");

  const OUTCOME_CLASS = {
    answered: "rtir-answered",
    partial: "rtir-partial",
    refused: "rtir-refused",
    no_reply: "rtir-silent",
  };

  function card(row) {
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
      ? `<p class="case-actions-row"><a class="case-share" href="${escapeHTML(row.document_url)}" rel="nofollow noopener noreferrer">${escapeHTML(t("rtir_see_document"))}</a></p>`
      : "";
    return `<li class="rtir-item ${OUTCOME_CLASS[row.outcome] ?? ""}">
      <p class="rtir-head">
        <span class="rtir-outcome">${escapeHTML(t(`rtir_badge_${row.outcome}`))}</span>
        ${clause}
        <span class="rtir-dates">${dates}</span>
      </p>
      <p class="rtir-authority">${escapeHTML(row.authority)}</p>
      <p class="rtir-summary">${escapeHTML(row.summary)}</p>
      ${text}
      ${doc}
    </li>`;
  }

  async function render() {
    let rows = [];
    try {
      const response = await fetch("../../api/rti-responses", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      rows = payload?.byCase?.[caseId] ?? [];
    } catch {
      return;
    }
    if (!rows.length) return;

    const section = document.createElement("section");
    section.className = "case-field rtir-on-case";
    section.innerHTML = `
      <h2 class="case-field-k">${escapeHTML(t("rtir_on_case_heading"))}</h2>
      <p class="case-caveat">${escapeHTML(t("rtir_on_case_note"))}</p>
      <ul class="rtir-list">${rows.map(card).join("")}</ul>
      <p class="case-actions-row">
        <a class="case-share act" href="../../rti/responses/?case=${encodeURIComponent(caseId)}#add">${escapeHTML(t("rtir_on_case_add"))}</a>
      </p>`;
    sources.after(section);
  }

  render();
})();
