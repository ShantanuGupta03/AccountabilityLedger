/* Floating "back to top" control, shared by the long scrolling pages. */
(() => {
  const SHOW_AFTER = 900;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "to-top";
  button.setAttribute("aria-label", "Back to top");
  button.innerHTML = '<span aria-hidden="true">&#8593;</span>Top';
  document.body.append(button);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    // Headers are not focusable by default, so make the top of the page a one-off
    // focus target rather than leaving a keyboard user stranded at the bottom.
    const top = document.querySelector("header");
    if (!top) return;
    top.tabIndex = -1;
    top.focus({ preventScroll: true });
    top.addEventListener("blur", () => top.removeAttribute("tabindex"), { once: true });
  });

  let ticking = false;
  const sync = () => {
    button.classList.toggle("visible", window.scrollY > SHOW_AFTER);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sync);
  }, { passive: true });

  sync();
})();
