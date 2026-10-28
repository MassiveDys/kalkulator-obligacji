/* Porównywarka dwóch wariantów A/B. */
(function () {
  "use strict";

  const { PROFILES, DEFAULT_ORDER, calculate } = window.Bonds;
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
    a: document.getElementById("cmp-a"),
    b: document.getElementById("cmp-b"),
    alert: document.getElementById("cmp-alert"),
    rows: document.getElementById("cmp-rows"),
    subtitle: document.getElementById("cmp-subtitle"),
    tileNetA: document.getElementById("cmp-net-a"),
    tileNetB: document.getElementById("cmp-net-b"),
    tileNetDiff: document.getElementById("cmp-net-diff"),
    tileProfitA: document.getElementById("cmp-profit-a"),
    tileProfitB: document.getElementById("cmp-profit-b"),
    tileProfitDiff: document.getElementById("cmp-profit-diff"),
    tileIrrA: document.getElementById("cmp-irr-a"),
    tileIrrB: document.getElementById("cmp-irr-b"),
    swap: document.getElementById("cmp-swap"),
    copy: document.getElementById("cmp-copy"),
    recalc: document.getElementById("cmp-calc"),
    inflation: document.getElementById("cmp-inflation"),
    nbp: document.getElementById("cmp-nbp"),
  };

  if (!el.a) return;

  let state = null;
  let last = null;
  let timer = 0;

  function optionsMarkup() {
    return DEFAULT_ORDER.map(
      (code) => '<option value="' + code + '">' + LABELS[code] + "</option>"
    ).join("");
  }

  function sideMarkup(side) {
    return (
      '<div class="cmp-head">' +
        '<span class="cmp-tag cmp-tag-' + side + '">' + side.toUpperCase() + "</span>" +
        "<strong>Wariant " + side.toUpperCase() + "</strong>" +
      "</div>" +
      '<div class="field"><label for="cmp-' + side + '-code">Obligacja</label>' +
        '<select id="cmp-' + side + '-code" data-role="code">' + optionsMarkup() + "</select></div>" +
      '<div class="segmented cmp-plan" role="group" aria-label="Tryb wpłat">' +
        '<button type="button" data-plan="monthly">Dopłaty</button>' +
        '<button type="button" data-plan="lump">Jednorazowo</button>' +
      "</div>" +
      '<div class="field" data-role="deposit-field"><label for="cmp-' + side + '-deposit">Dopłata miesięczna (zł)</label>' +
        '<input id="cmp-' + side + '-deposit" data-role="deposit" type="text" inputmode="decimal" value="400"></div>' +
      '<div class="field" data-role="years-field"><label for="cmp-' + side + '-years">Liczba lat dopłat</label>' +
        '<input id="cmp-' + side + '-years" data-role="years" type="text" inputmode="numeric" value="10"></div>' +
      '<div class="field" data-role="amount-field"><label for="cmp-' + side + '-amount">Wpłata jednorazowa (zł)</label>' +
        '<input id="cmp-' + side + '-amount" data-role="amount" type="text" inputmode="decimal" value="10000"></div>' +
      '<div class="field"><label for="cmp-' + side + '-horizon">Horyzont (lata)</label>' +
        '<input id="cmp-' + side + '-horizon" data-role="horizon" type="text" inputmode="numeric" value="10"></div>' +
      '<div class="cmp-checks">' +
        '<label class="check"><input type="checkbox" data-role="ike"> IKE (0% podatku)</label>' +
        '<label class="check"><input type="checkbox" data-role="early"> Wcześniejszy wykup</label>' +
      "</div>"
    );
  }

  function controls(side) {
    const root = side === "a" ? el.a : el.b;
    return {
      root,
      code: root.querySelector('[data-role="code"]'),
      planButtons: Array.from(root.querySelectorAll(".cmp-plan button")),
      deposit: root.querySelector('[data-role="deposit"]'),
      depositField: root.querySelector('[data-role="deposit-field"]'),
      years: root.querySelector('[data-role="years"]'),
      yearsField: root.querySelector('[data-role="years-field"]'),
      amount: root.querySelector('[data-role="amount"]'),
      amountField: root.querySelector('[data-role="amount-field"]'),
      horizon: root.querySelector('[data-role="horizon"]'),
      ike: root.querySelector('[data-role="ike"]'),
      early: root.querySelector('[data-role="early"]'),
    };
  }

  function defaultSide(overrides) {
    const base = { code: "EDO", plan: "lump", deposit: 400, years: 10, amount: 10000, horizon: 10, ike: false, early: false };
    return Object.assign(base, overrides || {});
  }

  function initial() {
    const saved = getSaved("cmp");
    if (saved && saved.a && saved.b) {
      return {
        a: Object.assign(defaultSide(), saved.a),
        b: Object.assign(defaultSide(), saved.b),
        inflation: Number(saved.inflation) || 3,
        nbp: Number(saved.nbp) || 5.75,
      };
    }
    const calc = window.BondCalc ? window.BondCalc.snapshot() : null;
    let a = defaultSide();
    if (calc) {
      a = defaultSide({
        code: calc.code,
        plan: calc.plan,
        deposit: parseNumber(calc.deposit) || 400,
        years: parseNumber(calc.years) || 10,
        amount: parseNumber(calc.amount) || 10000,
        horizon: parseNumber(calc.horizon) || 10,
        ike: Boolean(calc.ike),
        early: false,
      });
    }
    const b = defaultSide(
      Object.assign({}, a, {
        code: a.code === "COI" ? "EDO" : "COI",
        ike: false,
        early: false,
      })
    );
    return { a, b, inflation: calc ? Number(calc.inflation) || 3 : 3, nbp: calc ? Number(calc.nbp) || 5.75 : 5.75 };
  }

  function applySide(side, cfg) {
    const c = controls(side);
    c.code.value = PROFILES[cfg.code] ? cfg.code : "EDO";
    c.deposit.value = String(cfg.deposit).replace(".", ",");
    c.years.value = String(cfg.years);
    c.amount.value = String(cfg.amount).replace(".", ",");
    c.horizon.value = String(cfg.horizon);
    c.ike.checked = Boolean(cfg.ike);
    c.early.checked = Boolean(cfg.early);
    setPlan(side, cfg.plan);
  }

  function setPlan(side, plan) {
    const c = controls(side);
    const isLump = plan === "lump";
    c.planButtons.forEach((button) => {
      const active = button.dataset.plan === (isLump ? "lump" : "monthly");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    c.depositField.hidden = isLump;
    c.amountField.hidden = !isLump;
  }

  function readSide(side) {
    const c = controls(side);
    const plan = c.planButtons.find((button) => button.classList.contains("is-active"))?.dataset.plan || "monthly";
    return {
      code: c.code.value,
      plan: plan === "lump" ? "lump" : "monthly",
      deposit: parseNumber(c.deposit.value),
      years: Math.round(parseNumber(c.years.value)),
      amount: parseNumber(c.amount.value),
      horizon: Math.round(parseNumber(c.horizon.value)),
      ike: c.ike.checked,
      early: c.early.checked,
    };
  }

  function validate(side, inputs) {
    const name = "Wariant " + side.toUpperCase() + ": ";
    if (!PROFILES[inputs.code]) return name + "wybierz rodzaj obligacji.";
    if (!Number.isFinite(inputs.horizon) || inputs.horizon < 1 || inputs.horizon > 60) {
      return name + "horyzont musi być w zakresie 1–60 lat.";
    }
    if (inputs.plan === "lump") {
      if (!Number.isFinite(inputs.amount) || inputs.amount < 100) {
        return name + "wpłata jednorazowa musi wynosić co najmniej 100 zł.";
      }
      if (inputs.amount > 10000000) return name + "wpłata jest zbyt duża.";
    } else {
      if (!Number.isFinite(inputs.deposit) || inputs.deposit < 100) {
        return name + "dopłata musi wynosić co najmniej 100 zł.";
      }
      if (inputs.deposit > 10000000) return name + "dopłata jest zbyt duża.";
      if (!Number.isFinite(inputs.years) || inputs.years < 1 || inputs.years > 60) {
        return name + "liczba lat dopłat musi być w zakresie 1–60.";
      }
    }
    return null;
  }

  function run(inputs, inflation, nbp) {
    const profile = PROFILES[inputs.code];
    return calculate(
      inputs.code,
      inputs.plan === "lump" ? 0 : inputs.deposit,
      inputs.plan === "lump" ? 0 : inputs.years,
      inputs.horizon,
      profile.defaultRate1,
      profile.defaultMargin,
      inflation,
      nbp,
      inputs.ike,
      true,
      { mode: inputs.plan, amount: inputs.amount, earlyRedemption: inputs.early }
    );
  }

  function diffMoney(a, b) {
    const diff = b - a;
    const sign = diff > 0.005 ? "+" : diff < -0.005 ? "−" : "";
    return sign + fmtMoney(Math.abs(diff));
  }

  function metric(label, a, b, opts) {
    const percent = Boolean(opts && opts.percent);
    const fmt = percent ? (value) => fmtPercent(value * 100) : (value) => fmtMoney(value);
    return (
      "<tr><th scope=\"row\">" + label + "</th>" +
      '<td class="num">' + fmt(a) + "</td>" +
      '<td class="num">' + fmt(b) + "</td>" +
      '<td class="num">' + diffCell(a, b, percent) + "</td></tr>"
    );
  }

  function diffCell(a, b, percent) {
    const diff = b - a;
    if (percent) {
      return (diff > 0 ? "+" : diff < 0 ? "−" : "") + fmtPercent(Math.abs(diff) * 100);
    }
    return diffMoney(a, b);
  }

  function render(stateValue) {
    const inflation = parseNumber(el.inflation.value);
    const nbp = parseNumber(el.nbp.value);
    if (!Number.isFinite(inflation) || inflation < -20 || inflation > 100) {
      el.alert.textContent = "Inflacja musi być w zakresie -20% … 100%.";
      el.alert.hidden = false;
      return false;
    }
    if (!Number.isFinite(nbp) || nbp < -20 || nbp > 100) {
      el.alert.textContent = "Stopa NBP musi być w zakresie -20% … 100%.";
      el.alert.hidden = false;
      return false;
    }

    const sides = ["a", "b"].map((side) => {
      const inputs = readSide(side);
      const error = validate(side, inputs);
      if (error) return { side, error, inputs };
      try {
        return { side, inputs, result: run(inputs, inflation, nbp) };
      } catch (err) {
        return { side, error: "Wariant " + side.toUpperCase() + ": " + err.message, inputs };
      }
    });

    const failed = sides.find((item) => item.error);
    if (failed) {
      el.alert.textContent = failed.error;
      el.alert.hidden = false;
      return false;
    }
    el.alert.hidden = true;

    const a = sides[0].result;
    const b = sides[1].result;

    el.tileNetA.textContent = fmtMoney(a.net, 0);
    el.tileNetB.textContent = fmtMoney(b.net, 0);
    el.tileNetDiff.textContent = diffMoney(a.net, b.net);
    el.tileNetDiff.classList.toggle("is-negative", b.net < a.net);
    el.tileProfitA.textContent = fmtMoney(a.netProfit, 0);
    el.tileProfitB.textContent = fmtMoney(b.netProfit, 0);
    el.tileProfitDiff.textContent = diffMoney(a.netProfit, b.netProfit);
    el.tileProfitDiff.classList.toggle("is-negative", b.netProfit < a.netProfit);
    el.tileIrrA.textContent = fmtPercent(a.irr * 100);
    el.tileIrrB.textContent = fmtPercent(b.irr * 100);

    el.rows.innerHTML = [
      metric("Wpłacony kapitał", a.totalDeposits, b.totalDeposits),
      metric("Wartość brutto", a.gross, b.gross),
      metric("Podatki i opłaty", a.taxDue + a.earlyFee, b.taxDue + b.earlyFee),
      metric("Wartość netto (na rękę)", a.net, b.net),
      metric("Zysk netto", a.netProfit, b.netProfit),
      metric("Stopa zwrotu netto (rocznie)", a.irr, b.irr, { percent: true }),
      metric("Opłata za wcześniejszy wykup", a.earlyFee, b.earlyFee),
    ].join("");

    const maxYears = Math.max(a.rows.length, b.rows.length);
    const years = [0];
    for (let year = 1; year <= maxYears; year += 1) years.push(year);
    const seriesFor = (result) => {
      let lastValue = 0;
      const values = [0];
      for (let year = 1; year <= maxYears; year += 1) {
        const row = result.rows[year - 1];
        if (row) lastValue = row.net;
        values.push(lastValue);
      }
      return values;
    };
    window.BondCharts.line("chart-compare", {
      years,
      series: [
        { values: seriesFor(a), color: "#1f4e79", width: 2.4, dots: true },
        { values: seriesFor(b), color: "#c2410c", width: 2.4, dots: true },
      ],
    });

    el.subtitle.textContent =
      "Wykupy reinwestowane, podatek Belki 19% (IKE 0%), inflacja " +
      fmtPercent(inflation) +
      ", stopa NBP " +
      fmtPercent(nbp) +
      ". Oś pionowa: wartość netto portfela.";

    const snapshotValue = {
      a: readSide("a"),
      b: readSide("b"),
      inflation,
      nbp,
    };
    state = snapshotValue;
    last = { a, b };
    saveState("cmp", snapshotValue);
    return true;
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(), 350);
  }

  function wireSide(side) {
    const c = controls(side);
    c.planButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setPlan(side, button.dataset.plan);
        render();
      });
    });
    [c.code, c.deposit, c.years, c.amount, c.horizon, c.ike, c.early].forEach((input) => {
      input.addEventListener("input", schedule);
      input.addEventListener("change", () => render());
    });
  }

  el.a.innerHTML = sideMarkup("a");
  el.b.innerHTML = sideMarkup("b");

  const start = initial();
  applySide("a", start.a);
  applySide("b", start.b);
  el.inflation.value = decimalText(start.inflation);
  el.nbp.value = decimalText(start.nbp);

  wireSide("a");
  wireSide("b");
  [el.inflation, el.nbp].forEach((input) => {
    input.addEventListener("input", schedule);
    input.addEventListener("change", () => render());
  });

  el.swap.addEventListener("click", () => {
    const a = readSide("a");
    const b = readSide("b");
    applySide("a", b);
    applySide("b", a);
    render();
  });

  el.copy.addEventListener("click", () => {
    applySide("b", readSide("a"));
    render();
  });

  el.recalc.addEventListener("click", () => render());

  render();
})();
