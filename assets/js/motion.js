/**
 * Pointer tracking for the cursor sheen.
 *
 * The effect itself is CSS — a radial highlight in each tile's own background
 * layer, see the Motion section of assets/css/styles.css. All this file does is
 * keep that highlight's centre under the cursor.
 *
 * It is deliberately the smallest possible amount of JavaScript for the job:
 *
 *   - Nothing runs at all on a touch device or for a reader who has asked for
 *     reduced motion. Those two checks happen once, before any listener exists.
 *   - One delegated listener on the document, not one per tile. There are 84
 *     cards on the ledger page.
 *   - Coalesced into a single animation frame, so a mouse reporting at 1000Hz
 *     still costs one measurement per painted frame.
 *   - Two custom properties written on one element. No layout is read except
 *     that element's own box, and no style is read back.
 */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (reduced.matches || !fine.matches) return;

  /** Must match the sheen selector list in the stylesheet. */
  const TILES = ".file,.related-item,.prevnext,.submission-guidance,"
    + ".desk-grid > section,.claim-case,.docket .cell";

  let current = null;
  let pending = null;
  let frame = 0;

  function clear(tile) {
    if (!tile) return;
    tile.style.removeProperty("--mx");
    tile.style.removeProperty("--my");
  }

  function paint() {
    frame = 0;
    const event = pending;
    pending = null;
    if (!event) return;

    const tile = event.target.closest?.(TILES) ?? null;
    if (tile !== current) {
      clear(current);
      current = tile;
    }
    if (!tile) return;

    const box = tile.getBoundingClientRect();
    tile.style.setProperty("--mx", `${Math.round(event.clientX - box.left)}px`);
    tile.style.setProperty("--my", `${Math.round(event.clientY - box.top)}px`);
  }

  function onMove(event) {
    pending = event;
    if (!frame) frame = requestAnimationFrame(paint);
  }

  document.addEventListener("pointermove", onMove, { passive: true });
  // A pointer can enter a tile and stop dead, which fires no move event and
  // would light the sheen at the tile's centre rather than under the cursor.
  document.addEventListener("pointerover", onMove, { passive: true });
  // Leaving the window entirely never resolves to a tile, so drop the last one.
  document.addEventListener("pointerleave", () => { clear(current); current = null; }, { passive: true });

  // If the reader turns reduced motion on mid-visit, stop immediately.
  reduced.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerover", onMove);
    clear(current);
    current = null;
  });
})();

/* ==========================================================================
   Interface motion that carries meaning.

   Each of these exists to answer a question the reader would otherwise have to
   work out for themselves: how big is that number really, why is content
   sliding under a bar, how far through this case am I. All of them are skipped
   entirely under prefers-reduced-motion — that check is at the top of each
   block rather than assumed, because this file's first guard also requires a
   fine pointer and these are not pointer effects.
   ========================================================================== */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sameSiteReferrer = (() => {
    try {
      return Boolean(document.referrer && new URL(document.referrer).origin === location.origin);
    } catch {
      return false;
    }
  })();
  // Hero entrance only on a cold landing — not when switching Ledger / Ministers / RTI.
  if (!reduced && !sameSiteReferrer) document.body.classList.add("motion-ready");

  /* ---------- counting up ----------
     A figure that ticks up to its value reads as measured rather than asserted,
     and it draws the eye to the one part of the page that is pure evidence.
     Only plain integers are animated: the cost and death figures carry a second
     reading you can tap for, and rewriting their text would break that. */
  function countUp(node, target) {
    const DURATION = 900;
    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / DURATION);
      // Ease out, so it decelerates into the real number instead of stopping dead.
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = Math.round(target * eased).toLocaleString("en-IN");
      if (progress < 1) requestAnimationFrame(tick);
      else node.textContent = target.toLocaleString("en-IN");
    };
    requestAnimationFrame(tick);
  }

  function watchCounters() {
    const nodes = [...document.querySelectorAll("[data-count-up]:not([data-count-done])")]
      .filter((node) => /^[\d,]+$/.test(node.textContent.trim()));
    if (!nodes.length) return;
    if (reduced || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const target = Number(entry.target.textContent.trim().replace(/,/g, ""));
        if (!Number.isFinite(target) || target <= 0 || target > 1e7) return;
        entry.target.textContent = "0";
        entry.target.setAttribute("data-count-done", "");
        countUp(entry.target, target);
      });
    }, { threshold: 0.6 });
    nodes.forEach((node) => observer.observe(node));
  }

  /* ---------- year dividers ----------
     Chronological sort inserts a yearmark before each batch. The rule draws in
     once the divider enters the viewport so the timeline feels like it unfolds. */
  let yearObserver;
  function watchYearmarks() {
    const marks = document.querySelectorAll(".yearmark");
    if (!marks.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      marks.forEach((node) => node.classList.add("in-view"));
      return;
    }
    if (!yearObserver) {
      yearObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          yearObserver.unobserve(entry.target);
        });
      }, { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });
    }
    marks.forEach((node) => {
      if (!node.classList.contains("in-view")) yearObserver.observe(node);
    });
  }

  /* ---------- the sticky filter bar ----------
     It is position:sticky, so cases slide underneath it. Without a shadow at
     that moment the bar looks like it is cutting the page rather than floating
     over it, and the reader cannot tell which layer is which. */
  function watchStickyBar() {
    const bar = document.querySelector(".controls");
    if (!bar || !("IntersectionObserver" in window)) return;
    const sentinel = document.createElement("div");
    sentinel.className = "controls-sentinel";
    bar.parentNode.insertBefore(sentinel, bar);
    new IntersectionObserver(
      ([entry]) => bar.classList.toggle("stuck", !entry.isIntersecting),
      { threshold: 1 },
    ).observe(sentinel);
  }

  /* ---------- reading position ----------
     Case pages are long and their length is not obvious from the top. A hairline
     that fills as you read answers "how much of this is left" at a glance. */
  function readingProgress() {
    const article = document.querySelector(".casefile");
    if (!article || reduced) return;
    const bar = document.createElement("div");
    bar.className = "read-progress";
    bar.setAttribute("role", "presentation");
    document.body.append(bar);
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = article.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const done = total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 0;
      bar.style.transform = `scaleX(${done})`;
    };
    addEventListener("scroll", () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    addEventListener("resize", () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  const start = () => {
    watchCounters();
    watchStickyBar();
    readingProgress();
    watchYearmarks();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // The front page fills its docket after fetching the ledger, so those figures
  // read "--" at DOMContentLoaded. app.js says when they are real.
  document.addEventListener("ledger:stats", watchCounters);
  // Year dividers are rebuilt on every filter/sort; re-attach observers.
  document.addEventListener("ledger:rendered", watchYearmarks);

  /* ---------- minister table rows ----------
     Rows step in as they enter the viewport, capped so a long table never
     leaves the last entry waiting. */
  function watchDashboardRows() {
    const tbody = document.querySelector("#minister-rows");
    if (!tbody) return;
    if (reduced || !("IntersectionObserver" in window)) {
      tbody.querySelectorAll("tr").forEach((row) => row.classList.add("in"));
      return;
    }
    let lastReveal = 0;
    let offset = 0;
    const observer = new IntersectionObserver((entries) => {
      const now = performance.now();
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        offset = now - lastReveal < 140 ? Math.min(offset + 35, 280) : 0;
        lastReveal = now;
        entry.target.style.transitionDelay = `${offset}ms`;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06 });
    tbody.querySelectorAll("tr:not(.table-empty)").forEach((row) => observer.observe(row));
  }
  document.addEventListener("dashboard:rendered", watchDashboardRows);
})();

/* ==========================================================================
   Shared motion helpers.

   pulse() — one opacity beat when a panel re-renders (filter, dropdown, view).
   Cross-page tab navigation is intentionally instant: no view transitions and
   no post-load entrance animation, which read as a double load.
   ========================================================================== */
(() => {
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pulse(el) {
    if (!el || reduced()) return;
    el.classList.add("ui-swapping");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("ui-swapping")));
  }

  window.LedgerMotion = { pulse };
})();
