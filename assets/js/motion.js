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
