/** UI strings for English and Hindi. Case text stays in the data file for now. */
(() => {
  const STRINGS = {
    en: {
      nav_ledger: "Ledger",
      nav_dashboard: "Minister dashboard",
      nav_submit: "Submit an incident",
      nav_suggest: "Suggest a source",
      nav_corrections: "Corrections",
      nav_threads: "Threads",
      search_placeholder: "Search the ledger",
      sort_newest: "Newest incident first",
      sort_oldest: "Oldest incident first",
      footer_what: "What this is",
      footer_read: "How to read it",
      footer_funding: "Who pays for this",
      lang_label: "Language",
    },
    hi: {
      nav_ledger: "लेजर",
      nav_dashboard: "मंत्री डैशबोर्ड",
      nav_submit: "घटना दर्ज करें",
      nav_suggest: "स्रोत सुझाएँ",
      nav_corrections: "सुधार",
      nav_threads: "धागे",
      search_placeholder: "लेजर में खोजें",
      sort_newest: "नई घटना पहले",
      sort_oldest: "पुरानी घटना पहले",
      footer_what: "यह क्या है",
      footer_read: "कैसे पढ़ें",
      footer_funding: "इसे कौन चलाता है",
      lang_label: "भाषा",
    },
  };

  const SUPPORTED = ["en", "hi"];

  function detectLang() {
    const saved = localStorage.getItem("ledger-lang");
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language ?? "en").slice(0, 2);
    return SUPPORTED.includes(browser) ? browser : "en";
  }

  function apply(lang) {
    const strings = STRINGS[lang] ?? STRINGS.en;
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (strings[key]) node.textContent = strings[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.dataset.i18nPlaceholder;
      if (strings[key]) node.placeholder = strings[key];
    });
    document.querySelectorAll(".lang-switch [data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    localStorage.setItem("ledger-lang", lang);
    apply(lang);
  }

  window.LedgerI18n = { setLang, apply, detectLang, SUPPORTED };
  document.addEventListener("DOMContentLoaded", () => {
    apply(detectLang());
    document.querySelectorAll(".lang-switch [data-lang]").forEach((button) => {
      button.addEventListener("click", () => setLang(button.dataset.lang));
    });
  });
})();
