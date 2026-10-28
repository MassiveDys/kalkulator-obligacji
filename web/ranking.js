/* Ranking „Co wybrać?” — jedna wpłata, zadany horyzont, wszystkie serie. */
(function () {
  "use strict";

  const { rankBonds, PROFILES } = window.Bonds;
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

  const el = {
    amount: document.getElementById("rk-amount"),
    years: document.getElementById("rk-years"),
    months: document.getElementById("rk-months"),
    ike: document.getElementById("rk-ike"),
    family: document.getElementById("rk-family"),
    inflation: document.getElementById("rk-inflation"),
    nbp: document.getElementById("rk-nbp"),
    calc: document.getElementById("rk-calc"),
    alert: document.getElementById("rk-alert"),
    rows: document.getElementById("rk-rows"),
    subtitle: document.getElementById("rk-subtitle"),
    quick: Array.from(document.querySelectorAll(".rk-quick")),
    winner: document.getElementById("rk-winner"),
    winnerName: document.getElementById("rk-winner-name"),
    winnerNet: document.getElementById("rk-winner-net"),
    winnerProfit: document.getElementById("rk-winner-profit"),
    winnerRate: document.getElementById("rk-winner-rate"),
    winnerMode: document.getElementById("rk-winner-mode"),
    summary: document.getElementById("rk-summary"),
  };

  if (!el.amount) return;

  let timer = 0;

  function monthsText(months) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (years <= 0) return rest + " mies.";
    if (rest === 0) return years + (years === 1 ? " rok" : " lat");
    return years + " lat " + rest + " mies.";
  }

  function render() {
    const amount = parseNumber(el.amount.value);
    const years = Math.round(parseNumber(el.years.value) || 0);
    const months = Math.round(parseNumber(el.months.value) || 0);
    const inflation = parseNumber(el.inflation.value);
    const nbp = parseNumber(el.nbp.value);
    const totalMonths = years * 12 + months;

    const fail = (message) => {
      el.alert.textContent = message;
      el.alert.hidden = false;
      return false;
    };

    if (!Number.isFinite(amount) || amount < 100) {
      return fail("Kwota musi wynosić co najmniej 100 zł (1 obligacja).");
    }
    if (amount > 10000000) return fail("Kwota jest zbyt duża (maks. 10 mln zł).");
    if (!Number.isFinite(years) || years < 0 || years > 40 || !Number.isFinite(months) || months < 0 || months > 11) {
      return fail("Okres: lata 0–40, miesiące 0–11.");
    }
    if (totalMonths < 1 || totalMonths > 480) {
      return fail("Okres inwestycji musi wynosić od 1 miesiąca do 40 lat.");
    }
    if (!Number.isFinite(inflation) || inflation < -20 || inflation > 100) {
      return fail("Inflacja musi być w zakresie -20% … 100%.");
    }
    if (!Number.isFinite(nbp) || nbp < -20 || nbp > 100) {
      return fail("Stopa NBP musi być w zakresie -20% … 100%.");
    }

    let ranking;
    try {
      ranking = rankBonds({
        amount,
        years,
        months,
        inflation,
        nbp,
        ike: el.ike.checked,
        includeFamily: el.family.checked,
      });
    } catch (err) {
      return fail("Błąd obliczeń: " + err.message);
    }
    el.alert.hidden = true;

    const winner = ranking.winner;
    const second = ranking.results[1] || null;
    const diff = second ? winner.net - second.net : 0;

    el.winner.hidden = false;
    el.winnerName.textContent = winner.name;
    el.winnerNet.textContent = fmtMoney(winner.net, 0);
    el.winnerProfit.textContent = fmtMoney(winner.profit, 0);
    el.winnerRate.textContent = fmtPercent(winner.cagr * 100);
    el.winnerMode.textContent = winner.mode +
      (winner.earlyFee > 0.005 ? " · opłata " + fmtMoney(winner.earlyFee, 0) : "");

    const parts = [];
    ranking.results.forEach((item) => {
      const cls = item.rank === 1 ? "is-winner" : item.rank % 2 === 0 ? "odd" : "even";
      parts.push(
        '<tr class="' + cls + '">' +
          '<td class="col-rank">' + item.rank + "</td>" +
          '<td class="col-series">' + item.name + "</td>" +
          '<td class="num">' + fmtNumber(item.net, 2) + "</td>" +
          '<td class="num">' + fmtNumber(item.profit, 2) + "</td>" +
          '<td class="num">' + fmtPercent(item.cagr * 100) + "</td>" +
          '<td class="col-mode">' + item.mode +
            (item.earlyFee > 0.005 ? ' <span class="badge">opłata ' + fmtNumber(item.earlyFee, 0) + " zł</span>" : "") +
          "</td>" +
          '<td class="num">' + fmtNumber(item.taxPaid, 2) + "</td>" +
        "</tr>"
      );
    });
    el.rows.innerHTML = parts.join("");

    el.subtitle.textContent =
      fmtMoney(amount, 0) +
      ", okres " +
      monthsText(totalMonths) +
      ", " +
      (el.ike.checked ? "IKE 0% podatku" : "podatek Belki 19%") +
      ", inflacja " +
      fmtPercent(inflation) +
      ", NBP " +
      fmtPercent(nbp) +
      (el.family.checked ? ", z obligacjami rodzinnymi" : ", bez obligacji rodzinnych") +
      ". Jednorazowa wpłata, wykupy i kupony reinwestowane w tę samą serię; końcówka bez pełnego cyklu — w gotówce.";

    window.BondCharts.categories("chart-ranking", {
      labels: ranking.results.map((item) => item.code),
      values: ranking.results.map((item) => item.profit),
      colors: ranking.results.map((item, index) =>
        item.profit < 0 ? "#b3261e" : index === 0 ? "#1f9d55" : index === 1 ? "#2d6da3" : "#8a9bb0"
      ),
    });

    const lines = [];
    lines.push(
      "Najlepszy wybór: " + winner.name + " — " + fmtMoney(winner.net, 0) +
      " na koniec, zysk " + fmtMoney(winner.profit, 0) + " (" + fmtPercent(winner.cagr * 100) + " rocznie)."
    );
    if (second) {
      const pct = amount > 0 ? (diff / amount) * 100 : 0;
      lines.push(
        "Drugi jest " + second.name + " (" + fmtMoney(second.net, 0) + "), różnica " +
        fmtMoney(diff, 0) + " — " + (diff < amount * 0.001 ? "to praktycznie remis." : "przewaga " + fmtPercent(pct) + " kapitału.")
      );
    }
    if (winner.earlyFee > 0.005) {
      lines.push(
        "Wynik zwycięzcy uwzględnia wcześniejszy wykup: opłata " + fmtMoney(winner.earlyFee, 0) +
        " została potrącona z odsetek, kapitał 100 zł/szt. jest zwracany."
      );
    }
    if (!el.family.checked) {
      lines.push("Obligacje rodzinne ROS/ROD są poza rankingiem — włącz przełącznik, jeśli chcesz je uwzględnić.");
    }
    if (ranking.results.some((item) => item.mode.indexOf("gotówka") >= 0)) {
      lines.push("Końcówka okresu, której nie da się ulokować na pełny cykl, zostaje w gotówce (0%) — dlatego część serii ma tryb „+ gotówka”.");
    }
    if (winner.modeKey === "early" || winner.modeKey === "roll-early") {
      lines.push(
        "W tym horyzoncie część serii trzeba wykupić przed terminem; ich wynik zależy od opłaty likwidacyjnej i założeń inflacji/NBP."
      );
    }
    el.summary.textContent = lines.join(" ");

    saveState("rk", {
      amount,
      years,
      months,
      ike: el.ike.checked,
      family: el.family.checked,
      inflation,
      nbp,
    });
    return true;
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 300);
  }

  function setQuick(months) {
    el.years.value = String(Math.floor(months / 12));
    el.months.value = String(months % 12);
    render();
    toast("Okres: " + monthsText(months));
  }

  /* ------------------------------------------------------------- start */
  const saved = getSaved("rk");
  el.amount.value = saved ? String(saved.amount) : "100000";
  el.years.value = saved ? String(saved.years) : "2";
  el.months.value = saved ? String(saved.months) : "0";
  el.inflation.value = decimalText(saved ? Number(saved.inflation) || 3 : 3);
  el.nbp.value = decimalText(saved ? Number(saved.nbp) || 5.75 : 5.75);
  el.ike.checked = Boolean(saved && saved.ike);
  el.family.checked = Boolean(saved && saved.family);

  el.quick.forEach((button) => {
    button.addEventListener("click", () => setQuick(Number(button.dataset.months)));
  });

  [el.amount, el.years, el.months, el.inflation, el.nbp].forEach((input) => {
    input.addEventListener("input", schedule);
    input.addEventListener("change", () => render());
  });
  [el.ike, el.family].forEach((input) => input.addEventListener("change", () => render()));
  el.calc.addEventListener("click", () => render());

  render();
})();
