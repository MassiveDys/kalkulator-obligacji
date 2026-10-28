/* Portfel wieloskładnikowy / drabina obligacyjna. */
(function () {
  "use strict";

  const { PROFILES, DEFAULT_ORDER, simulate } = window.Bonds;
  const {
    fmtNumber,
    fmtMoney,
    fmtPercent,
    parseNumber,
    decimalText,
    get: getSaved,
    set: saveState,
    toast,
  } = window.BondUI;

  const LABELS = {
    EDO: "EDO · 10 lat",
    COI: "COI · 4 lata",
    TOS: "TOS · 3 lata",
    DOR: "DOR · 2 lata",
    ROR: "ROR · 1 rok",
    OTS: "OTS · 3 mies.",
    ROS: "ROS · 6 lat",
    ROD: "ROD · 12 lat",
  };

  const el = {
    positions: document.getElementById("pf-positions"),
    add: document.getElementById("pf-add"),
    preset: document.getElementById("pf-preset"),
    presetEdo: document.getElementById("pf-preset-edo"),
    calc: document.getElementById("pf-calc"),
    alert: document.getElementById("pf-alert"),
    horizon: document.getElementById("pf-horizon"),
    inflation: document.getElementById("pf-inflation"),
    nbp: document.getElementById("pf-nbp"),
    ike: document.getElementById("pf-ike"),
    rows: document.getElementById("pf-rows"),
    subtitle: document.getElementById("pf-subtitle"),
    tileDeposits: document.getElementById("pf-deposits"),
    tileNet: document.getElementById("pf-net"),
    tileProfit: document.getElementById("pf-profit"),
    tileIrr: document.getElementById("pf-irr"),
    tileBonds: document.getElementById("pf-bonds"),
  };

  if (!el.positions) return;

  let timer = 0;

  function optionsMarkup() {
    return DEFAULT_ORDER.map(
      (code) => '<option value="' + code + '">' + LABELS[code] + "</option>"
    ).join("");
  }

  function addRow(position, focus) {
    if (el.positions.children.length >= 8) {
      toast("Maksymalnie 8 pozycji w portfelu");
      return;
    }
    const row = document.createElement("div");
    row.className = "pos-row";
    row.innerHTML =
      '<select data-role="code" aria-label="Rodzaj obligacji">' + optionsMarkup() + "</select>" +
      '<input data-role="amount" type="text" inputmode="decimal" aria-label="Kwota w zł" value="2500">' +
      '<input data-role="start" type="text" inputmode="numeric" aria-label="Start w miesiącach" value="0">' +
      '<button type="button" class="pos-remove" aria-label="Usuń pozycję">&times;</button>';
    el.positions.appendChild(row);

    const code = row.querySelector('[data-role="code"]');
    const amount = row.querySelector('[data-role="amount"]');
    const start = row.querySelector('[data-role="start"]');

    code.value = position && PROFILES[position.code] ? position.code : "EDO";
    amount.value = String(position && position.amount !== undefined ? position.amount : 2500).replace(".", ",");
    start.value = String(position && position.startMonth !== undefined ? position.startMonth : 0);

    row.querySelector(".pos-remove").addEventListener("click", () => {
      if (el.positions.children.length <= 1) {
        toast("Portfel musi mieć co najmniej jedną pozycję");
        return;
      }
      row.remove();
      render();
    });
    [code, amount, start].forEach((input) => {
      input.addEventListener("input", schedule);
      input.addEventListener("change", () => render());
    });
    if (focus) amount.focus();
  }

  function readPositions() {
    return Array.from(el.positions.children).map((row) => ({
      code: row.querySelector('[data-role="code"]').value,
      amount: parseNumber(row.querySelector('[data-role="amount"]').value),
      startMonth: Math.round(parseNumber(row.querySelector('[data-role="start"]').value)),
    }));
  }

  function setPositions(positions) {
    el.positions.textContent = "";
    positions.forEach((position) => addRow(position, false));
  }

  function render() {
    const horizon = Math.round(parseNumber(el.horizon.value));
    const inflation = parseNumber(el.inflation.value);
    const nbp = parseNumber(el.nbp.value);
    const ike = el.ike.checked;

    const fail = (message) => {
      el.alert.textContent = message;
      el.alert.hidden = false;
      return false;
    };

    if (!Number.isFinite(horizon) || horizon < 1 || horizon > 40) {
      return fail("Horyzont portfela musi być w zakresie 1–40 lat.");
    }
    if (!Number.isFinite(inflation) || inflation < -20 || inflation > 100) {
      return fail("Inflacja musi być w zakresie -20% … 100%.");
    }
    if (!Number.isFinite(nbp) || nbp < -20 || nbp > 100) {
      return fail("Stopa NBP musi być w zakresie -20% … 100%.");
    }

    const positions = readPositions();
    if (!positions.length) return fail("Dodaj co najmniej jedną pozycję portfela.");
    if (positions.some((position) => !PROFILES[position.code])) {
      return fail("Wybierz rodzaj obligacji dla każdej pozycji.");
    }
    if (positions.some((position) => !Number.isFinite(position.amount) || position.amount < 100)) {
      return fail("Każda pozycja musi mieć kwotę co najmniej 100 zł (1 obligacja).");
    }
    if (positions.some((position) => position.amount > 10000000)) {
      return fail("Kwota pojedynczej pozycji jest zbyt duża.");
    }
    if (positions.some((position) => !Number.isFinite(position.startMonth) || position.startMonth < 0 || position.startMonth >= horizon * 12)) {
      return fail("Start pozycji musi mieścić się między 0 a końcem horyzontu (w miesiącach).");
    }

    let result;
    try {
      result = simulate({
        positions,
        horizonYears: horizon,
        inflation,
        nbp,
        ike,
        reinvest: true,
      });
    } catch (err) {
      return fail("Błąd obliczeń: " + err.message);
    }
    el.alert.hidden = true;

    el.tileDeposits.textContent = fmtMoney(result.totalDeposits, 0);
    el.tileNet.textContent = fmtMoney(result.net, 0);
    el.tileProfit.textContent = fmtMoney(result.netProfit, 0);
    el.tileIrr.textContent = fmtPercent(result.irr * 100);
    el.tileBonds.textContent = fmtNumber(result.bondsHeld, 0);

    const parts = [];
    result.rows.forEach((row, index) => {
      const cls = index % 2 === 1 ? "odd" : "even";
      parts.push(
        '<tr class="' + cls + '">' +
          '<td class="col-year">' + row.year + "</td>" +
          '<td class="num">' + fmtNumber(row.deposits, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.cumulativeDeposits, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.maturedPrincipal, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.maturedInterest, 2) + "</td>" +
          '<td class="num">' + fmtNumber(row.tax, 2) + "</td>" +
          '<td class="num">' + fmtNumber(row.net, 2) + "</td>" +
        "</tr>"
      );
    });
    el.rows.innerHTML = parts.join("");

    const weight = positions.reduce((sum, position) => sum + position.amount, 0);
    const mix = positions
      .map((position) => LABELS[position.code].split(" · ")[0] + " " + Math.round((position.amount / weight) * 100) + "%")
      .join(", ");
    el.subtitle.textContent =
      horizon +
      " lat, " +
      fmtMoney(weight, 0) +
      " w " +
      positions.length +
      " pozycjach (" +
      mix +
      "), wykupy reinwestowane w tę samą serię, " +
      (ike ? "IKE 0% podatku" : "podatek Belki 19%") +
      ", inflacja " +
      fmtPercent(inflation) +
      ", NBP " +
      fmtPercent(nbp) +
      ".";

    window.BondCharts.bar("chart-pf-maturity", {
      years: result.rows.map((row) => row.year),
      stacks: [
        { values: result.rows.map((row) => row.maturedPrincipal), color: "#1f4e79" },
        { values: result.rows.map((row) => Math.max(0, row.maturedInterest)), color: "#1f9d55" },
      ],
    });

    const years = [0].concat(result.rows.map((row) => row.year));
    window.BondCharts.line("chart-pf-wealth", {
      years,
      areas: [
        {
          top: [0].concat(result.rows.map((row) => row.net)),
          bottom: [0].concat(result.rows.map((row) => row.cumulativeDeposits)),
          color: "rgba(31, 157, 85, 0.16)",
        },
      ],
      series: [
        {
          values: [0].concat(result.rows.map((row) => row.cumulativeDeposits)),
          color: "#8a9bb0",
          width: 1.4,
          dash: [5, 4],
        },
        {
          values: [0].concat(result.rows.map((row) => row.net)),
          color: "#1f4e79",
          width: 2.4,
          dots: true,
          skipFirstDot: true,
        },
      ],
    });

    saveState("pf", {
      positions,
      horizon,
      inflation,
      nbp,
      ike,
    });
    return true;
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 350);
  }

  function initial() {
    const saved = getSaved("pf");
    if (saved && Array.isArray(saved.positions) && saved.positions.length) {
      el.horizon.value = String(saved.horizon || 10);
      el.inflation.value = decimalText(Number(saved.inflation) || 3);
      el.nbp.value = decimalText(Number(saved.nbp) || 5.75);
      el.ike.checked = Boolean(saved.ike);
      setPositions(saved.positions);
      return;
    }
    el.horizon.value = "10";
    el.inflation.value = "3,00";
    el.nbp.value = "5,75";
    setPositions([
      { code: "EDO", amount: 4000, startMonth: 0 },
      { code: "COI", amount: 3000, startMonth: 12 },
      { code: "TOS", amount: 3000, startMonth: 24 },
    ]);
  }

  el.add.addEventListener("click", () => addRow(null, true));

  el.preset.addEventListener("click", () => {
    el.horizon.value = "10";
    setPositions([
      { code: "EDO", amount: 3000, startMonth: 0 },
      { code: "COI", amount: 2500, startMonth: 12 },
      { code: "TOS", amount: 2500, startMonth: 24 },
      { code: "ROR", amount: 2000, startMonth: 36 },
    ]);
    render();
    toast("Wstawiono przykładową drabinę 4-letnią");
  });

  el.presetEdo.addEventListener("click", () => {
    el.horizon.value = "10";
    setPositions([{ code: "EDO", amount: 10000, startMonth: 0 }]);
    render();
  });

  [el.horizon, el.inflation, el.nbp].forEach((input) => {
    input.addEventListener("input", schedule);
    input.addEventListener("change", () => render());
  });
  el.ike.addEventListener("change", () => render());
  el.calc.addEventListener("click", () => render());

  initial();
  render();
})();
