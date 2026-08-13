/**
 * Copy buttons for the cite-and-export block on a case page.
 *
 * The citation is printed as ordinary selectable text in the HTML, so this file
 * is a convenience and never a dependency: with JavaScript off the reader can
 * still read the citation and select it by hand. All this does is save the
 * selecting.
 *
 * Two shapes, because researchers want different things at different moments:
 *   data-copy-target="<id>"  copies the text content of that element
 *   data-copy-text="…"       copies a literal string
 */
(() => {
  const buttons = document.querySelectorAll("[data-copy-target],[data-copy-text]");
  if (!buttons.length) return;

  const CONFIRM_MS = 2200;

  async function copy(button) {
    const targetId = button.dataset.copyTarget;
    const text = targetId
      ? (document.getElementById(targetId)?.textContent ?? "").trim()
      : (button.dataset.copyText ?? "");
    if (!text) return;

    const original = button.dataset.originalLabel ?? button.textContent;
    button.dataset.originalLabel = original;

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = window.LedgerI18n?.t("cite_copied") || "Copied";
      button.classList.add("copied");
    } catch {
      // Insecure origins and some in-app browsers refuse clipboard access.
      // Selecting the text is the honest fallback: the reader finishes the job.
      const node = targetId ? document.getElementById(targetId) : null;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = window.LedgerI18n?.t("cite_select") || "Selected, press Ctrl+C";
      } else {
        window.prompt("Copy this:", text);
        return;
      }
    }
    setTimeout(() => {
      button.textContent = button.dataset.originalLabel;
      button.classList.remove("copied");
    }, CONFIRM_MS);
  }

  buttons.forEach((button) => button.addEventListener("click", () => copy(button)));
})();
