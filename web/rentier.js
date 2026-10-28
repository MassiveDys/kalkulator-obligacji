/* Tryb rentierski: ile lat wystarczy kapitału przy stałej wypłacie. */
(function () {
  "use strict";

  const { PROFILES, DEFAULT_ORDER, simulate, discount } = window.Bonds;
  const {
    fmtNumber,
    fmtMoney,
    fmtPercent,
    parseNumber,
    decimalText,
    get: getSaved,
    set: saveState,
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
    capital: document.getElementById("rn-capital"),
    code: document.getElementById("rn-code"),
    withdrawal: document.getElementById("rn-withdrawal"),
    horizon: document.getElementById("rn-horizon"),
    inflation: document.getElementById("rn-inflation"),
    nbp: document.getElementById("rn-nbp"),
    ike: document.getElementById("rn-ike"),
    calc: document.getElementById("rn-calc"),
    alert: document.getElementById("rn-alert"),
    rows: document.getElementById("rn-rows"),
    subtitle: document.getElementById("rn-subtitle"),
    tileYears: document.getElementById("rn-years"),
    tileWithdrawn: document.getElementById("rn-withdrawn"),
    tileLeft: document.getElementById("rn-left"),
    tileReal: document.getElementById("rn-real"),
    tileRealMonthly: document.getElementById("rn-real-monthly"),
    tileCost: document.getElementById("rn-cost"),
  };

  if (!el.capital) return;

  let timer = 0;

  function fillProfiles() {
    DEFAULT_ORDER.forEach((code) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = LABELS[code];
      el.code.appendChild(option);
    });
  }

  function monthsText(months) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (years <= 0) return rest + " mies.";
    if (rest === 0) return years + " lat";
    return years + " lat " + rest + " mies.";
  }

  function render() {
    const capital = parseNumber(el.capital.value);
    const withdrawal = parseNumber(el.withdrawal.value);
    const horizon = Math.round(parseNumber(el.horizon.value));
    const inflation = parseNumber(el.inflation.value);
    const nbp = parseNumber(el.nbp.value);

    const fail = (message) => {
      el.alert.textContent = message;
      el.alert.hidden = false;
      return false;
    };

    if (!Number.isFinite(capital) || capital < 100) {
      return fail("Kapitał początkowy musi wynosić co najmniej 100 zł.");
    }
    if (capital > 100000000) return fail("Kapitał jest zbyt duży.");
    if (!Number.isFinite(withdrawal) || withdrawal <= 0) {
      return fail("Wypłata miesięczna musi być większa od zera.");
    }
    if (withdrawal > capital) return fail("Wypłata miesięczna nie może przekraczać kapitału.");
    if (!Number.isFinite(horizon) || horizon < 1 || horizon > 40) {
      return fail("Horyzont symulacji musi być w zakresie 1–40 lat.");
    }
    if (!Number.isFinite(inflation) || inflation < -20 || inflation > 100) {
      return fail("Inflacja musi być w zakresie -20% … 100%.");
    }
    if (!Number.isFinite(nbp) || nbp < -20 || nbp > 100) {
      return fail("Stopa NBP musi być w zakresie -20% … 100%.");
    }

    let result;
    try {
      result = simulate({
        positions: [{ code: el.code.value, amount: capital, startMonth: 0 }],
        horizonYears: horizon,
        inflation,
        nbp,
        ike: el.ike.checked,
        reinvest: true,
        monthlyWithdrawal: withdrawal,
      });
    } catch (err) {
      return fail("Błąd obliczeń: " + err.message);
    }
    el.alert.hidden = true;

    const monthsPaid = result.depletionMonth > 0 ? result.depletionMonth : result.months;
    const realWithdrawn = result.rows.reduce(
      (sum, row) => sum + discount(row.withdrawal, row.year, inflation),
      0
    );
    const realMonthly = monthsPaid > 0 ? realWithdrawn / monthsPaid : 0;

    el.tileYears.textContent = result.depleted
      ? monthsText(result.depletionMonth)
      : "ponad " + monthsText(result.months);
    el.tileYears.classList.toggle("is-negative", result.depleted);
    el.tileWithdrawn.textContent = fmtMoney(result.totalWithdrawn, 0);
    el.tileLeft.textContent = fmtMoney(result.net, 0);
    el.tileReal.textContent = fmtMoney(realWithdrawn, 0);
    el.tileRealMonthly.textContent = fmtMoney(realMonthly, 0) + "/mies.";
    el.tileCost.textContent = fmtMoney(result.taxPaid, 0);

    const parts = [];
    result.rows.forEach((row, index) => {
      const cls = index % 2 === 1 ? "odd" : "even";
      parts.push(
        '<tr class="' + cls + '">' +
          '<td class="col-year">' + row.year + "</td>" +
          '<td class="num">' + fmtNumber(row.withdrawal, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.withdrawalCum, 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.net, 0) + "</td>" +
          '<td class="num">' + fmtNumber(discount(row.net, row.year, inflation), 0) + "</td>" +
          '<td class="num">' + fmtNumber(row.tax, 2) + "</td>" +
        "</tr>"
      );
    });
    el.rows.innerHTML = parts.join("");

    const status = result.depleted
      ? "Kapitał wyczerpuje się po " + monthsText(result.depletionMonth) + " — ostatnia wypłata jest niepełna."
      : "Kapitał wystarcza na cały horyzont " + horizon + " lat; na koniec zostaje " + fmtMoney(result.net, 0) + ".";
    el.subtitle.textContent =
      fmtMoney(capital, 0) +
      " w " +
      el.code.value +
      ", wypłata " +
      fmtMoney(withdrawal, 0) +
      "/mies., " +
      (el.ike.checked ? "IKE 0% podatku" : "podatek Belki 19%") +
      ", inflacja " +
      fmtPercent(inflation) +
      ". " +
      status +
      " Model: odsetki reinwestowane, w razie braku gotówki obligacje są wykupywane wcześniej z opłatą.";

    const years = [0].concat(result.rows.map((row) => row.year));
    window.BondCharts.line("chart-rentier", {
      years,
      series: [
        {
          values: [capital].concat(result.rows.map((row) => row.net)),
          color: "#1f4e79",
          width: 2.4,
          dots: true,
          skipFirstDot: true,
        },
        {
          values: [0].concat(result.rows.map((row) => row.withdrawalCum)),
          color: "#c2410c",
          width: 2,
          dash: [6, 4],
        },
      ],
    });

    saveState("rn", {
      capital,
      code: el.code.value,
      withdrawal,
      horizon,
      inflation,
      nbp,
      ike: el.ike.checked,
    });
    return true;
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 350);
  }

  fillProfiles();

  const saved = getSaved("rn");
  el.capital.value = saved ? String(saved.capital) : "300000";
  el.code.value = saved && PROFILES[saved.code] ? saved.code : "EDO";
  el.withdrawal.value = saved ? String(saved.withdrawal) : "2000";
  el.horizon.value = saved ? String(saved.horizon) : "30";
  el.inflation.value = decimalText(saved ? Number(saved.inflation) || 3 : 3);
  el.nbp.value = decimalText(saved ? Number(saved.nbp) || 5.75 : 5.75);
  el.ike.checked = Boolean(saved && saved.ike);

  [el.capital, el.withdrawal, el.horizon, el.inflation, el.nbp].forEach((input) => {
    input.addEventListener("input", schedule);
    input.addEventListener("change", () => render());
  });
  [el.code, el.ike].forEach((input) => input.addEventListener("change", () => render()));
  el.calc.addEventListener("click", () => render());

  render();
})();
