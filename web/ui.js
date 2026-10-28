/* Wspólne narzędzia: formatowanie, stan w URL, zakładki, PWA. Bez zależności. */
(function () {
  "use strict";

  const STORAGE_KEY = "kalkulator-obligacji:v1";
  const data = { v: 1, tab: "calc" };
  const listeners = [];
  let saveTimer = 0;
  let toastTimer = 0;

  /* --------------------------------------------------------- formatowanie */
  const formatters = new Map();

  function numberFormatter(decimals) {
    if (!formatters.has(decimals)) {
      formatters.set(
        decimals,
        new Intl.NumberFormat("pl-PL", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      );
    }
    return formatters.get(decimals);
  }

  function fmtNumber(value, decimals = 2) {
    return numberFormatter(decimals).format(value).replace(/\u00A0/g, " ");
  }

  function fmtMoney(value, decimals = 2) {
    return fmtNumber(value, decimals) + " zł";
  }

  function fmtPercent(value) {
    return Number(value).toFixed(2).replace(".", ",") + " %";
  }

  function parseNumber(text) {
    const cleaned = String(text)
      .trim()
      .replace(/[\s\u00A0\u202F]/g, "")
      .replace(",", ".");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function decimalText(value) {
    return Number(value).toFixed(2).replace(".", ",");
  }

  function yearsText(value) {
    return String(value).replace(".", ",");
  }

  /* -------------------------------------------------------------- stan */
  function readInitial() {
    let parsed = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("d");
      if (raw) parsed = JSON.parse(raw);
    } catch (error) {
      parsed = null;
    }
    if (!parsed) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) parsed = JSON.parse(raw);
      } catch (error) {
        parsed = null;
      }
    }
    if (parsed && typeof parsed === "object") {
      data.v = 1;
      if (typeof parsed.tab === "string") data.tab = parsed.tab;
      ["calc", "cmp", "pf", "rn"].forEach((key) => {
        if (parsed[key] && typeof parsed[key] === "object") data[key] = parsed[key];
      });
    }
  }

  function get(key) {
    return data[key] || null;
  }

  function set(key, value) {
    data[key] = value;
    persist();
  }

  function persist() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(writeNow, 250);
  }

  function flush() {
    window.clearTimeout(saveTimer);
    writeNow();
  }

  function writeNow() {
    const snapshot = { v: 1, tab: data.tab };
    ["calc", "cmp", "pf", "rn"].forEach((key) => {
      if (data[key]) snapshot[key] = data[key];
    });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("d", JSON.stringify(snapshot));
      window.history.replaceState(null, "", url.toString());
    } catch (error) {
      /* bardzo długi URL — zostaje localStorage */
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      /* tryb prywatny */
    }
  }

  function resetAll() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* brak dostępu */
    }
    const url = new URL(window.location.href);
    url.search = "";
    window.location.href = url.toString();
  }

  /* ------------------------------------------------------ zakładki */
  function tabNames() {
    return Array.from(document.querySelectorAll(".tab")).map((tab) => tab.dataset.tab);
  }

  function showTab(name, options = {}) {
    const tabs = Array.from(document.querySelectorAll(".tab"));
    if (!tabs.length) return;
    const valid = tabs.some((tab) => tab.dataset.tab === name);
    const target = valid ? name : tabs[0].dataset.tab;

    tabs.forEach((tab) => {
      const active = tab.dataset.tab === target;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      if (active && options.scroll !== false) {
        tab.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });

    document.querySelectorAll(".panel").forEach((panel) => {
      panel.hidden = panel.id !== "panel-" + target;
    });

    data.tab = target;
    persist();
    if (options.silent !== true) {
      window.requestAnimationFrame(() => window.BondCharts.redraw());
    }
    listeners.forEach((fn) => fn(target));
  }

  function onTabChange(fn) {
    listeners.push(fn);
  }

  function initTabs() {
    const tabs = Array.from(document.querySelectorAll(".tab"));
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => showTab(tab.dataset.tab));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const index = tabs.indexOf(tab);
        const next = event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : (index - 1 + tabs.length) % tabs.length;
        tabs[next].focus();
        showTab(tabs[next].dataset.tab);
      });
    });
    showTab(data.tab || "calc", { scroll: false });
  }

  /* ---------------------------------------------------------- toast */
  function toast(message) {
    let node = document.getElementById("toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "toast";
      node.className = "toast";
      node.setAttribute("role", "status");
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove("is-visible"), 2200);
  }

  /* ------------------------------------------------------ schowek */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        area.remove();
      }
    });
  }

  function initHeaderActions() {
    const share = document.getElementById("share-button");
    if (share) {
      share.addEventListener("click", () => {
        flush();
        const label = share.querySelector("span");
        copyText(window.location.href)
          .then(() => {
            if (label) label.textContent = "Skopiowano";
            toast("Link ze scenariuszem skopiowany do schowka");
            window.setTimeout(() => {
              if (label) label.textContent = "Kopiuj link";
            }, 2200);
          })
          .catch(() => toast("Nie udało się skopiować — skopiuj adres z paska przeglądarki"));
      });
    }

    const reset = document.getElementById("reset-button");
    if (reset) {
      reset.addEventListener("click", () => {
        if (window.confirm("Przywrócić ustawienia domyślne i wyczyścić zapisany scenariusz?")) {
          resetAll();
        }
      });
    }
  }

  /* --------------------------------------------------------- PWA */
  function initPwa() {
    if (!("serviceWorker" in navigator)) return;
    const secure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!secure) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline będzie niedostępny */
      });
    });
  }

  readInitial();

  window.BondUI = {
    fmtNumber,
    fmtMoney,
    fmtPercent,
    parseNumber,
    decimalText,
    yearsText,
    get,
    set,
    flush,
    toast,
    copyText,
    showTab,
    onTabChange,
    initTabs,
    initHeaderActions,
    initPwa,
    data,
  };
})();
