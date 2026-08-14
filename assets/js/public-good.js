/**
 * The first-visit public-interest notice.
 *
 * This is deliberately a slim dismissible bar and not a modal that blocks the
 * page. A modal would be worse on every axis that matters here. Legally it is
 * close to worthless: a dialog everybody clicks away in a fifth of a second is
 * poor evidence that anything was read, whereas the framing that actually does
 * the work — public interest stated, allegations labelled as allegations, every
 * claim sourced and tiered, a standing right of reply — is printed on every
 * page and in the footer of every case, permanently, where it cannot be
 * dismissed. Practically, a modal is the worst thing you can put in front of a
 * reader on a phone, and most of this ledger's readers arrive on one.
 *
 * So: one sentence, one link to the principles it is summarising, one dismissal
 * that is remembered. The version suffix on the storage key means a materially
 * reworded notice is shown again rather than silently assumed to have been read.
 */
(() => {
  const KEY = "ledger:public-good-notice:1";

  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    // Private mode or storage disabled. Show the notice; it stays dismissible.
  }
  if (stored === "dismissed") return;

  const t = (key) => window.LedgerI18n?.t(key) ?? "";

  const bar = document.createElement("aside");
  bar.className = "pg-notice";
  bar.setAttribute("role", "note");
  bar.setAttribute("aria-label", "About this ledger");

  const text = document.createElement("p");
  // The sentence lives in its own span. Writing to the paragraph's textContent
  // would delete the link beside it, which is exactly what happened the first
  // time: every page that loads i18n.js fires a langchange on startup, paint()
  // ran a second time, and the link to the principles page vanished on load.
  const sentence = document.createElement("span");
  const link = document.createElement("a");
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "pg-dismiss";

  function paint() {
    sentence.textContent = t("pg_notice") || bar.dataset.fallback || "";
    link.textContent = t("pg_notice_link") || "Why this exists →";
    dismiss.textContent = t("pg_notice_dismiss") || "Understood";
    dismiss.setAttribute("aria-label", dismiss.textContent);
  }

  // Root-absolute: this ledger is served from the domain root, and the notice
  // has to resolve identically from /, /case/<id>/ and /rti/responses/.
  link.href = "/about/";
  link.className = "pg-link";
  bar.dataset.fallback = "Published in the public interest, about the public conduct of public office. "
    + "Allegations are labelled as allegations and every claim is sourced.";

  paint();
  text.append(sentence, " ", link);
  bar.append(text, dismiss);

  function close() {
    bar.classList.add("pg-leaving");
    document.body.classList.remove("has-pg-notice");
    try {
      localStorage.setItem(KEY, "dismissed");
    } catch {
      // Nothing to do; the reader can dismiss again next time.
    }
    const done = () => bar.remove();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) done();
    else bar.addEventListener("transitionend", done, { once: true });
  }

  dismiss.addEventListener("click", close);
  document.addEventListener("ledger:langchange", paint);

  document.body.append(bar);
  document.body.classList.add("has-pg-notice");
  // One frame before the entry transition, so it animates in rather than
  // appearing to have always been there.
  requestAnimationFrame(() => bar.classList.add("pg-in"));
})();
