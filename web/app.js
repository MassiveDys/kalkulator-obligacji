/* Interfejs kalkulatora obligacji — logika i sterowanie. */
(function () {
  "use strict";

  const {
    PROFILES,
    DEFAULT_ORDER,
    MARGIN_SCENARIOS,
    INFLATION_SCENARIOS,
    calculate,
  } = window.Bonds;

  const PROFILE_LABELS = {
    EDO: "EDO · 10 lat · inflacja",
    COI: "COI · 4 lata · inflacja",
    TOS: "TOS · 3 lata · stałe",
    DOR: "DOR · 2 lata · NBP + marża",
    ROR: "ROR · 1 rok · NBP",
    OTS: "OTS · 3 miesiące · stałe",
    ROS: "ROS · 6 lat · rodzinne",
    ROD: "ROD · 12 lat · rodzinne",
  };

  const PROFILE_PLACEHOLDER_MARGIN = "Scenariusz marży (opcjonalnie)";
  const PROFILE_PLACEHOLDER_INFLATION = "Scenariusz inflacji (opcjonalnie)";
  const CUSTOM_LABEL = "Własna wartość (wpisz powyżej)";

  const el = {
    form: document.getElementById("form"),
    profile: document.getElementById("profile"),
    profileShort: document.getElementById("profile-short"),
    profileInfo: document.getElementById("profile-info"),
    deposit: document.getElementById("deposit"),
    years: document.getElementById("years"),
    horizon: document.getElementById("horizon"),
    rate1: document.getElementById("rate1"),
    margin: document.getElementById("margin"),
    marginScenario: document.getElementById("margin-scenario"),
    marginNote: document.getElementById("margin-note"),
    inflation: document.getElementById("inflation"),
    inflationScenario: document.getElementById("inflation-scenario"),
    inflationNote: document.getElementById("inflation-note"),
    nbp: document.getElementById("nbp"),
    ike: document.getElementById("ike"),
    calcButton: document.getElementById("calc-button"),
    alert: document.getElementById("alert"),
    rows: document.getElementById("rows"),
    exportButton: document.getElementById("export-button"),
    tileDeposits: document.getElementById("tile-deposits"),
    tileBonds: document.getElementById("tile-bonds"),
    tileGross: document.getElementById("tile-gross"),
    tileNet: document.getElementById("tile-net"),
    tileProfit: document.getElementById("tile-profit"),
    tileIrr: document.getElementById("tile-irr"),
    chartsSubtitle: document.getElementById("charts-subtitle"),
    legendPhase: document.getElementById("legend-phase"),
    legendWealth: document.getElementById("legend-wealth"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    panels: {
      calc: document.getElementById("panel-calc"),
      charts: document.getElementById("panel-charts"),
    },
    modeButtons: Array.from(document.querySelectorAll(".segmented button")),
  };

  const state = {
    mode: "payout",
    last: null,
    silentTimer: 0,
  };

  const scenarios = {
    margin: { items: [], byKey: {}, placeholder: PROFILE_PLACEHOLDER_MARGIN },
    inflation: { items: [], byKey: {}, placeholder: PROFILE_PLACEHOLDER_INFLATION },
  };

  /* ------------------------------------------------------------ format */
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
    return value.toFixed(2).replace(".", ",") + " %";
  }

  function parseNumber(text) {
    const cleaned = String(text)
      .trim()
      .replace(/[\s\u00A0\u202F]/g, "")
      .replace(",", ".");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function scenarioLabel(name, value) {
    return name + " (" + value.toFixed(2).replace(".", ",") + "%)";
  }

  function decimalText(value) {
    return value.toFixed(2).replace(".", ",");
  }

  function termYearsText(profile) {
    return String(profile.termYears).replace(".", ",");
  }

  /* --------------------------------------------------------- komunikaty */
  function showAlert(message) {
    el.alert.textContent = message;
    el.alert.hidden = false;
  }

  function clearAlert() {
    el.alert.textContent = "";
    el.alert.hidden = true;
  }

  /* --------------------------------------------------------- scenariusze */
  function buildScenarios(profile) {
    const marginItems = MARGIN_SCENARIOS.map((item) => {
      const value = item.value === null ? profile.defaultMargin : item.value;
      return { key: item.key, label: scenarioLabel(item.name, value), value, note: item.note };
    });
    const inflationItems = INFLATION_SCENARIOS.map((item) => ({
      key: item.key,
      label: scenarioLabel(item.name, item.value),
      value: item.value,
      note: item.note,
    }));

    fillScenarioSelect(el.marginScenario, PROFILE_PLACEHOLDER_MARGIN, marginItems, MARGIN_SCENARIOS);
    fillScenarioSelect(el.inflationScenario, PROFILE_PLACEHOLDER_INFLATION, inflationItems, INFLATION_SCENARIOS);

    scenarios.margin = {
      items: marginItems,
      byKey: Object.fromEntries(marginItems.map((i) => [i.key, i])),
      placeholder: PROFILE_PLACEHOLDER_MARGIN,
    };
    scenarios.inflation = {
      items: inflationItems,
      byKey: Object.fromEntries(inflationItems.map((i) => [i.key, i])),
      placeholder: PROFILE_PLACEHOLDER_INFLATION,
    };

    el.marginNote.textContent = "";
    el.inflationNote.textContent = "";
  }

  function fillScenarioSelect(select, placeholder, items, original) {
    select.textContent = "";
    const base = document.createElement("option");
    base.value = "";
    base.textContent = placeholder;
    select.appendChild(base);

    items.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = item.key;
      option.textContent = scenarioLabel(original[index].name, item.value);
      select.appendChild(option);
    });

    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = CUSTOM_LABEL;
    select.appendChild(custom);
    select.value = "";
  }

  function applyScenario(kind, key) {
    const config = scenarios[kind];
    const select = kind === "margin" ? el.marginScenario : el.inflationScenario;
    const input = kind === "margin" ? el.margin : el.inflation;
    const note = kind === "margin" ? el.marginNote : el.inflationNote;

    if (key === "custom") {
      select.value = "";
      input.focus();
      input.select();
      note.textContent = "Wpisz własną wartość w polu powyżej.";
      return;
    }

    const item = config.byKey[key];
    if (!item) {
      note.textContent = "";
      return;
    }

    input.value = decimalText(item.value);
    note.textContent = "Scenariusz: " + item.label + " — " + item.note + " Możesz wpisać własną wartość.";
    calculateAndRender(true);
  }

  function clearScenario(kind) {
    const select = kind === "margin" ? el.marginScenario : el.inflationScenario;
    const note = kind === "margin" ? el.marginNote : el.inflationNote;
    if (select.value !== "" || note.textContent) {
      select.value = "";
      note.textContent = "";
    }
  }

  /* ------------------------------------------------------------- profil */
  function applyProfile(code, options = {}) {
    const profile = PROFILES[code];
    if (!profile) return;
    el.profileShort.textContent = profile.description;

    el.rate1.value = decimalText(profile.defaultRate1);
    el.margin.value = decimalText(profile.defaultMargin);

    const kind = profile.kind;
    const marginEnabled = (kind === "inflacja" || kind === "nbp") && code !== "ROR";
    const inflationEnabled = kind === "inflacja";

    el.rate1.disabled = !(kind === "inflacja" || kind === "stale");
    el.margin.disabled = !marginEnabled;
    el.marginScenario.disabled = !marginEnabled;
    el.inflation.disabled = !inflationEnabled;
    el.inflationScenario.disabled = !inflationEnabled;
    el.nbp.disabled = kind !== "nbp";

    buildScenarios(profile);

    el.profileInfo.textContent =
      profile.description +
      " Okres: " +
      termYearsText(profile) +
      " lat, odsetki: " +
      (profile.payout === "kapitalizacja" ? "kapitalizacja roczna" : "wypłata roczna") +
      ".";

    if (!options.silent) {
      el.profile.value = code;
    }
  }

  function currentCode() {
    return el.profile.value;
  }

  /* ----------------------------------------------------------- odczyty */
  function readInputs() {
    const code = currentCode();
    const profile = PROFILES[code];
    const deposit = parseNumber(el.deposit.value);
    const yearsRaw = parseNumber(el.years.value);
    const horizonRaw = parseNumber(el.horizon.value);

    const rate1 = el.rate1.disabled ? profile.defaultRate1 : parseNumber(el.rate1.value);
    const margin = el.margin.disabled ? profile.defaultMargin : parseNumber(el.margin.value);
    const inflation = el.inflation.disabled ? 3.0 : parseNumber(el.inflation.value);
    const nbp = el.nbp.disabled ? 5.75 : parseNumber(el.nbp.value);

    if (!Number.isFinite(deposit)) return { error: "Wpisz poprawną miesięczną dopłatę." };
    if (deposit < 100) {
      return { error: "Miesięczna dopłata musi wynosić co najmniej 100 zł (1 obligacja)." };
    }
    if (deposit > 10000000) return { error: "Miesięczna dopłata jest zbyt duża." };

    if (!Number.isFinite(yearsRaw)) return { error: "Wpisz poprawną liczbę lat dopłat." };
    if (!Number.isFinite(horizonRaw)) return { error: "Wpisz poprawny horyzont inwestycji." };

    const years = Math.round(yearsRaw);
    const horizon = Math.round(horizonRaw);
    if (years < 1 || years > 60) return { error: "Liczba lat dopłat musi być w zakresie 1–60." };
    if (horizon < 1 || horizon > 60) {
      return { error: "Horyzont inwestycji musi być w zakresie 1–60 lat." };
    }

    const inRange = (value) => Number.isFinite(value) && value >= -20 && value <= 100;
    if (!inRange(rate1) || !inRange(inflation) || !inRange(nbp)) {
      return { error: "Stopy procentowe muszą być w zakresie -20% … 100%." };
    }
    if (!inRange(margin)) return { error: "Marża musi być w zakresie -20% … 100%." };

    return {
      code,
      deposit,
      years,
      horizon,
      rate1,
      margin,
      inflation,
      nbp,
      ike: el.ike.checked,
      reinvest: state.mode === "reinvest",
    };
  }

  /* --------------------------------------------------------- renderowanie */
  function renderTable(result) {
    const parts = [];
    result.rows.forEach((row, index) => {
      const cls = index % 2 === 1 ? "odd" : "even";
      parts.push(
        '<tr class="' + cls + '">' +
          '<td class="col-year">' + row.year + "</td>" +
          '<td class="num">' + fmtNumber(row.deposits, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.cumulativeDeposits, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.interest, 2) + "</td>" +
          '<td class="num">' + fmtNumber(row.tax, 2) + "</td>" +
          '<td class="num">' + fmtNumber(row.gross, 2) + "</td>" +
          '<td class="num">' + fmtNumber(row.net, 2) + "</td>" +
        "</tr>"
      );
    });
    el.rows.innerHTML = parts.join("");
  }

  function renderTiles(result) {
    el.tileDeposits.textContent = fmtMoney(result.totalDeposits, 0);
    el.tileBonds.textContent = fmtNumber(Math.floor(result.totalDeposits / 100), 0);
    el.tileGross.textContent = fmtMoney(result.gross);
    el.tileNet.textContent = fmtMoney(result.net);
    el.tileProfit.textContent = fmtMoney(result.netProfit);
    el.tileIrr.textContent = fmtPercent(result.irr * 100);
  }

  function render(result, inputs) {
    renderTiles(result);
    renderTable(result);

    const modeText = result.reinvest
      ? "wykupy reinwestowane"
      : "wykupy wypłacane na konto";
    el.chartsSubtitle.textContent =
      result.years +
      " lat, " +
      modeText +
      "; słupki to transze zapadające w danym roku, druga linia pokazuje wartość netto portfela.";

    const phaseEnd = Math.min(inputs.years, result.years);
    el.legendPhase.textContent =
      phaseEnd > 0 ? "Faza wpłat (1–" + phaseEnd + ")" : "Faza wpłat";
    el.legendWealth.textContent = result.reinvest
      ? "Wartość netto portfela"
      : "Majątek netto (portfel + wypłaty)";

    state.last = { result, code: inputs.code, ike: inputs.ike };
    window.BondCharts.render(result, inputs.years);
  }

  function calculateAndRender(explicit) {
    const inputs = readInputs();
    if (inputs.error) {
      if (explicit) showAlert(inputs.error);
      return false;
    }

    let result;
    try {
      result = calculate(
        inputs.code,
        inputs.deposit,
        inputs.years,
        inputs.horizon,
        inputs.rate1,
        inputs.margin,
        inputs.inflation,
        inputs.nbp,
        inputs.ike,
        inputs.reinvest
      );
    } catch (err) {
      if (explicit) showAlert("Błąd obliczeń: " + err.message);
      return false;
    }

    clearAlert();
    render(result, inputs);
    return true;
  }

  function scheduleSilentCalculate() {
    window.clearTimeout(state.silentTimer);
    state.silentTimer = window.setTimeout(() => calculateAndRender(false), 350);
  }

  /* --------------------------------------------------------------- CSV */
  function exportCsv() {
    if (!state.last) {
      showAlert("Najpierw wykonaj obliczenia.");
      return;
    }
    const { result, code, ike } = state.last;
    const lines = [];
    lines.push(
      ["Kalkulator obligacji - " + code, ike ? "IKE" : "podatek Belki 19%"].join(";")
    );
    lines.push(
      [
        "Rok",
        "Wpłaty w roku",
        "Skumulowane wpłaty",
        "Odsetki",
        "Podatek",
        "Wartość brutto",
        "Wartość netto",
      ].join(";")
    );
    result.rows.forEach((row) => {
      lines.push(
        [
          row.year,
          row.deposits.toFixed(2),
          row.cumulativeDeposits.toFixed(2),
          row.interest.toFixed(2),
          row.tax.toFixed(2),
          row.gross.toFixed(2),
          row.net.toFixed(2),
        ].join(";")
      );
    });
    lines.push("");
    lines.push(["Suma wpłat", result.totalDeposits.toFixed(2)].join(";"));
    lines.push(["Wartość brutto", result.gross.toFixed(2)].join(";"));
    lines.push(["Wartość netto", result.net.toFixed(2)].join(";"));
    lines.push(["Zysk netto", result.netProfit.toFixed(2)].join(";"));
    lines.push(["Stopa netto (rocznie)", (result.irr * 100).toFixed(2) + "%"].join(";"));

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "obligacje-" + code.toLowerCase() + ".csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------- zakładki */
  function showTab(name) {
    el.tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });
    Object.keys(el.panels).forEach((key) => {
      el.panels[key].hidden = key !== name;
    });
    if (name === "charts") {
      window.BondCharts.redraw();
    }
  }

  /* --------------------------------------------------------------- tryb */
  function setMode(mode) {
    state.mode = mode;
    el.modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------- start */
  function populateProfiles() {
    DEFAULT_ORDER.forEach((code) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = PROFILE_LABELS[code];
      el.profile.appendChild(option);
    });
  }

  function wireEvents() {
    el.form.addEventListener("submit", (event) => {
      event.preventDefault();
      calculateAndRender(true);
    });

    el.profile.addEventListener("change", () => {
      applyProfile(el.profile.value);
      calculateAndRender(true);
    });

    el.marginScenario.addEventListener("change", () => {
      applyScenario("margin", el.marginScenario.value);
    });
    el.inflationScenario.addEventListener("change", () => {
      applyScenario("inflation", el.inflationScenario.value);
    });

    [el.margin, el.inflation].forEach((input, index) => {
      const kind = index === 0 ? "margin" : "inflation";
      input.addEventListener("input", () => {
        clearScenario(kind);
        scheduleSilentCalculate();
      });
      input.addEventListener("change", () => calculateAndRender(true));
    });

    [el.deposit, el.years, el.horizon, el.rate1, el.nbp].forEach((input) => {
      input.addEventListener("input", scheduleSilentCalculate);
      input.addEventListener("change", () => calculateAndRender(true));
    });

    el.ike.addEventListener("change", () => calculateAndRender(true));

    el.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.dataset.mode);
        calculateAndRender(true);
      });
    });

    el.exportButton.addEventListener("click", exportCsv);

    el.tabs.forEach((tab) => {
      tab.addEventListener("click", () => showTab(tab.dataset.tab));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const index = el.tabs.indexOf(tab);
        const next = event.key === "ArrowRight"
          ? (index + 1) % el.tabs.length
          : (index - 1 + el.tabs.length) % el.tabs.length;
        el.tabs[next].focus();
        showTab(el.tabs[next].dataset.tab);
      });
    });
  }

  populateProfiles();
  setMode("payout");
  applyProfile("EDO", { silent: true });
  el.profile.value = "EDO";
  wireEvents();
  calculateAndRender(true);
})();
