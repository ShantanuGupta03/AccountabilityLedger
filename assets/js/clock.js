/**
 * Keeps the accountability clocks current.
 *
 * The day count is rendered at build time so a case page reads correctly with
 * JavaScript switched off and in a search index. Between deploys that number
 * drifts, so this recomputes it from the case's own YYYYMMDD sort key.
 *
 * Every element carrying data-since-sk is updated; the build-time value is the
 * fallback, never the only answer.
 */
(() => {
  const DAY_MS = 86400000;

  function daysSince(sk) {
    const text = String(sk ?? "");
    if (!/^\d{8}$/.test(text)) return null;
    const when = Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
    const days = Math.floor((Date.now() - when) / DAY_MS);
    return days > 0 ? days : null;
  }

  function refresh() {
    document.querySelectorAll("[data-since-sk]").forEach((node) => {
      const days = daysSince(node.dataset.sinceSk);
      if (days === null) return;
      const target = node.querySelector(".clock-num") ?? node;
      const shown = days.toLocaleString("en-IN");
      if (target.textContent !== shown) target.textContent = shown;
    });
  }

  document.addEventListener("DOMContentLoaded", refresh);
  document.addEventListener("ledger:langchange", refresh);
  // Cheap safety net for a tab left open across midnight.
  setInterval(refresh, 60 * 60 * 1000);
  window.LedgerClock = { daysSince, refresh };
})();
