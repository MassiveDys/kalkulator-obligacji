/*
 * Silnik obliczeniowy kalkulatora polskich obligacji skarbowych.
 * Port 1:1 z src/bonds.py (Python) — ta sama kolejność operacji i zaokrągleń.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.Bonds = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NOMINAL = 100.0;
  const BELKA = 0.19;

  const PROFILES = {
    EDO: {
      code: "EDO", name: "EDO 10-letnie", termYears: 10, kind: "inflacja",
      payout: "kapitalizacja", defaultRate1: 5.35, defaultMargin: 2.00,
      earlyFee: 3.00, earlyNoInterest: false,
      description: "Indeksowane inflacją, roczna kapitalizacja odsetek.",
    },
    COI: {
      code: "COI", name: "COI 4-letnie", termYears: 4, kind: "inflacja",
      payout: "wyplata", defaultRate1: 5.15, defaultMargin: 1.75,
      earlyFee: 2.00, earlyNoInterest: false,
      description: "Indeksowane inflacją, roczne wypłaty odsetek.",
    },
    TOS: {
      code: "TOS", name: "TOS 3-letnie", termYears: 3, kind: "stale",
      payout: "kapitalizacja", defaultRate1: 5.75, defaultMargin: 0.00,
      earlyFee: 1.00, earlyNoInterest: false,
      description: "Stałe oprocentowanie, roczna kapitalizacja.",
    },
    DOR: {
      code: "DOR", name: "DOR 2-letnie", termYears: 2, kind: "nbp",
      payout: "wyplata", defaultRate1: 5.75, defaultMargin: 0.25,
      earlyFee: 0.70, earlyNoInterest: false,
      description: "Stopa NBP + marża, roczne wypłaty odsetek.",
    },
    ROR: {
      code: "ROR", name: "ROR 1-roczne", termYears: 1, kind: "nbp",
      payout: "wyplata", defaultRate1: 5.75, defaultMargin: 0.00,
      earlyFee: 0.50, earlyNoInterest: false,
      description: "Stopa NBP, odsetki wypłacane przy wykupie.",
    },
    OTS: {
      code: "OTS", name: "OTS 3-miesięczne", termYears: 0.25, kind: "stale",
      payout: "kapitalizacja", defaultRate1: 4.50, defaultMargin: 0.00,
      earlyFee: 0.00, earlyNoInterest: true,
      description: "Stałe oprocentowanie, wykup po 3 miesiącach.",
    },
    ROS: {
      code: "ROS", name: "ROS 6-letnie (rodzinne)", termYears: 6, kind: "inflacja",
      payout: "kapitalizacja", defaultRate1: 5.60, defaultMargin: 2.00,
      earlyFee: 2.00, earlyNoInterest: false,
      description: "Obligacje rodzinne, indeksowane inflacją.",
    },
    ROD: {
      code: "ROD", name: "ROD 12-letnie (rodzinne)", termYears: 12, kind: "inflacja",
      payout: "kapitalizacja", defaultRate1: 5.75, defaultMargin: 2.50,
      earlyFee: 3.00, earlyNoInterest: false,
      description: "Obligacje rodzinne, indeksowane inflacją.",
    },
  };

  const DEFAULT_ORDER = ["EDO", "COI", "TOS", "DOR", "ROR", "OTS", "ROS", "ROD"];

  const MARGIN_SCENARIOS = [
    {
      key: "mf", name: "Aktualna oferta MF", value: null,
      note: "Marża z aktualnej oferty Ministerstwa Finansów dla wybranego typu.",
    },
    {
      key: "high", name: "Wysoka historyczna", value: 2.50,
      note: "Górny poziom marż oferowanych w historii (np. EDO, ROD).",
    },
    {
      key: "avg", name: "Średnia historyczna", value: 1.50,
      note: "Typowa marża z ostatnich lat.",
    },
    {
      key: "low", name: "Niska 2018–2021", value: 1.00,
      note: "Niskie marże z okresu 2018–2021.",
    },
  ];

  const INFLATION_SCENARIOS = [
    {
      key: "target", name: "Cel inflacyjny NBP", value: 2.50,
      note: "Oficjalny cel NBP: 2,5% ± 1 pkt proc.",
    },
    {
      key: "base", name: "Bazowa / umiarkowana", value: 3.00,
      note: "Umiarkowany scenariusz bazowy.",
    },
    {
      key: "avg15", name: "Średnia 15 lat", value: 3.60,
      note: "Przybliżona średnia inflacja z ostatnich 15 lat.",
    },
    {
      key: "elevated", name: "Podwyższona", value: 5.00,
      note: "Okresy presji cenowej.",
    },
    {
      key: "high", name: "Wysoka / kryzysowa", value: 8.00,
      note: "Scenariusz kryzysowy.",
    },
  ];

  function termMonths(profile) {
    return Math.max(1, Math.round(profile.termYears * 12));
  }

  function monthlyRate(annualPercent) {
    const annual = Math.max(-99.0, Number(annualPercent)) / 100.0;
    return Math.pow(1.0 + annual, 1.0 / 12.0) - 1.0;
  }

  function xirrMonthly(flows) {
    if (!flows.length) return 0.0;
    if (flows.every((f) => f[1] >= 0) || flows.every((f) => f[1] <= 0)) return 0.0;

    const npv = (r) => flows.reduce((sum, [m, f]) => sum + f / Math.pow(1.0 + r, m), 0);

    let lo = -0.5;
    let hi = 0.5;
    let fLo = npv(lo);
    let fHi = npv(hi);
    if (fLo * fHi > 0) return 0.0;

    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      const fMid = npv(mid);
      if (Math.abs(fMid) < 1e-9) return mid;
      if (fLo * fMid <= 0) {
        hi = mid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return (lo + hi) / 2;
  }

  function positions(lots) {
    let value = 0.0;
    let gain = 0.0;
    for (const lot of lots) {
      if (lot.payout === "kapitalizacja") {
        value += lot.nominal;
        gain += lot.gain;
      } else {
        value += NOMINAL + lot.coupon;
      }
    }
    return [value, gain];
  }

  function grossValue(lots, cash, taxPaid) {
    const [value] = positions(lots);
    return value + cash + taxPaid;
  }

  function netValue(lots, cash, taxFactor) {
    const [value, gain] = positions(lots);
    return value + cash - gain * taxFactor;
  }

  function calculate(
    code,
    monthlyDeposit,
    depositYears,
    horizonYears,
    rate1,
    margin,
    inflation,
    nbpRate,
    ike,
    reinvest = true,
    options = {}
  ) {
    const profile = PROFILES[code];
    if (!profile) throw new Error("Nieznany rodzaj obligacji: " + code);

    const mode = options && options.mode === "lump" ? "lump" : "monthly";
    const lumpAmount =
      mode === "lump" ? Math.max(0, Number(options.amount) || 0) : 0;

    depositYears = Math.max(0, Math.trunc(depositYears));
    horizonYears = Math.max(1, Math.trunc(horizonYears));
    const months = horizonYears * 12;
    const depositMonths = mode === "lump" ? 0 : Math.min(depositYears * 12, months);

    let laterRate;
    if (profile.kind === "inflacja") {
      laterRate = inflation + margin;
    } else if (profile.kind === "nbp") {
      laterRate = nbpRate + margin;
    } else {
      laterRate = rate1;
    }

    const firstRate = profile.kind === "nbp" ? laterRate : rate1;

    let lots = [];
    let cash = 0.0;
    let paidOut = 0.0;
    let totalDeposits = 0.0;
    let bondsBought = 0;
    let taxPaid = 0.0;
    let annualInterest = 0.0;
    let annualTax = 0.0;
    let annualDeposits = 0.0;
    let annualPrincipal = 0.0;
    let annualMaturedInterest = 0.0;
    const rows = [];
    const flows = [];
    const taxFactor = ike ? 0.0 : BELKA;
    const earlyAtEnd = Boolean(options && options.earlyRedemption);

    function buy(month, available) {
      const count = Math.floor(available / NOMINAL);
      if (count <= 0) return [available, 0];
      for (let i = 0; i < count; i += 1) {
        lots.push({
          startMonth: month,
          termMonths: termMonths(profile),
          rate1: firstRate,
          laterRate,
          payout: profile.payout,
          nominal: NOMINAL,
          gain: 0.0,
          coupon: 0.0,
          age: 0,
        });
      }
      return [available - count * NOMINAL, count];
    }

    function settleCoupon(lot) {
      if (lot.coupon <= 0) return;
      const tax = lot.coupon * taxFactor;
      const netCoupon = lot.coupon - tax;
      if (reinvest) {
        cash += netCoupon;
      } else {
        paidOut += netCoupon;
      }
      annualMaturedInterest += netCoupon;
      taxPaid += tax;
      annualTax += tax;
      lot.coupon = 0.0;
    }

    if (mode === "lump") {
      cash += lumpAmount;
      totalDeposits += lumpAmount;
      annualDeposits += lumpAmount;
      flows.push([0, -lumpAmount]);
      const [cashAfterBuy, boughtLump] = buy(0, cash);
      cash = cashAfterBuy;
      bondsBought += boughtLump;
    }

    for (let month = 1; month <= months; month += 1) {
      if (mode === "monthly" && month <= depositMonths) {
        cash += monthlyDeposit;
        totalDeposits += monthlyDeposit;
        annualDeposits += monthlyDeposit;
        flows.push([month - 1, -monthlyDeposit]);
      }

      let bought;
      [cash, bought] = buy(month, cash);
      bondsBought += bought;

      const stillAlive = [];
      for (const lot of lots) {
        const yearIndex = Math.floor(lot.age / 12) + 1;
        const annualRate = yearIndex <= 1 ? lot.rate1 : lot.laterRate;
        const interest = lot.nominal * monthlyRate(annualRate);
        annualInterest += interest;
        lot.age += 1;

        if (lot.payout === "kapitalizacja") {
          lot.nominal += interest;
          lot.gain += interest;
        } else {
          lot.coupon += interest;
        }

        const mature = lot.age >= lot.termMonths;
        const skipCoupon = earlyAtEnd && month === months && !mature;
        if (lot.payout === "wyplata" && (lot.age % 12 === 0 || mature) && !skipCoupon) {
          settleCoupon(lot);
        }

        if (mature) {
          if (lot.payout === "kapitalizacja") {
            const tax = lot.gain * taxFactor;
            const valueNet = lot.nominal - tax;
            if (reinvest) {
              cash += valueNet;
            } else {
              paidOut += valueNet;
            }
            annualMaturedInterest += valueNet - NOMINAL;
            taxPaid += tax;
            annualTax += tax;
          } else if (reinvest) {
            cash += NOMINAL;
          } else {
            paidOut += NOMINAL;
          }
          annualPrincipal += NOMINAL;
          continue;
        }
        stillAlive.push(lot);
      }
      lots = stillAlive;

      [cash, bought] = buy(month, cash);
      bondsBought += bought;

      if (month % 12 === 0) {
        const gross = grossValue(lots, cash, taxPaid) + paidOut;
        const net = netValue(lots, cash, taxFactor) + paidOut;
        rows.push({
          year: month / 12,
          deposits: annualDeposits,
          cumulativeDeposits: totalDeposits,
          interest: annualInterest,
          tax: annualTax,
          gross,
          net,
          maturedPrincipal: annualPrincipal,
          maturedInterest: annualMaturedInterest,
          payoutCum: paidOut,
          early: false,
          earlyFee: 0,
        });
        annualDeposits = 0.0;
        annualInterest = 0.0;
        annualTax = 0.0;
        annualPrincipal = 0.0;
        annualMaturedInterest = 0.0;
      }
    }

    let gross;
    let net;
    let earlyBonds = 0;
    let earlyFee = 0;
    let earlyFeeNominal = 0;
    let earlyTax = 0;
    let earlyNetInterest = 0;
    const earlyApplied = Boolean(options && options.earlyRedemption && lots.length > 0);

    if (earlyApplied) {
      const feePerBond = Number(profile.earlyFee) || 0;
      earlyBonds = lots.length;
      earlyFeeNominal = earlyBonds * feePerBond;
      let heldGross = 0.0;
      let heldNet = 0.0;

      for (const lot of lots) {
        let interest = lot.payout === "kapitalizacja" ? lot.gain : lot.coupon;
        // OTS: przy przedterminowym wykupie odsetki nie są naliczane.
        if (profile.earlyNoInterest) interest = 0.0;
        const fee = Math.min(feePerBond, Math.max(0.0, interest));
        const taxable = Math.max(0.0, interest - fee);
        const tax = taxable * taxFactor;
        earlyFee += fee;
        earlyTax += tax;
        earlyNetInterest += taxable - tax;
        heldGross += NOMINAL + interest - fee;
        heldNet += NOMINAL + interest - fee - tax;
      }

      gross = heldGross + cash + taxPaid + paidOut;
      net = heldNet + cash + paidOut;

      const last = rows[rows.length - 1];
      if (last) {
        last.early = true;
        last.earlyFee = earlyFee;
        last.gross = gross;
        last.net = net;
        last.tax += earlyTax;
        last.maturedPrincipal += earlyBonds * NOMINAL;
        last.maturedInterest += earlyNetInterest;
      }
    } else {
      gross = grossValue(lots, cash, taxPaid) + paidOut;
      net = netValue(lots, cash, taxFactor) + paidOut;
    }

    flows.push([months, net]);
    const monthlyIrr = xirrMonthly(flows);
    const irr = monthlyIrr > -1 ? Math.pow(1.0 + monthlyIrr, 12) - 1.0 : -1.0;

    return {
      totalDeposits,
      bondsBought,
      bondsHeld: lots.length,
      cashLeft: cash,
      gross,
      net,
      netProfit: net - totalDeposits,
      irr,
      taxPaid,
      taxDue: gross - net,
      years: horizonYears,
      months,
      paidOut,
      reinvest,
      paymentMode: mode,
      lumpAmount,
      earlyApplied,
      earlyBonds,
      earlyFee,
      earlyFeeNominal,
      earlyTax,
      earlyRate: Number(profile.earlyFee) || 0,
      earlyNoInterest: Boolean(profile.earlyNoInterest),
      rows,
    };
  }

  /*
   * Wartość identycznego planu wpłat przy stałej rocznej stopie zwrotu.
   * Plan: { mode: "monthly"|"lump", monthlyDeposit, depositMonths, amount }.
   * Zwraca wartość na koniec każdego roku (po podatku Belki, jeśli tax=true).
   */
  function benchmarkSeries(annualPercent, months, plan, tax = false) {
    const growth = 1.0 + monthlyRate(annualPercent);
    let value = 0.0;
    let contributed = 0.0;
    const values = [];
    const mode = plan.mode === "lump" ? "lump" : "monthly";

    if (mode === "lump") {
      value = Math.max(0, Number(plan.amount) || 0);
      contributed = value;
    }

    for (let month = 1; month <= months; month += 1) {
      if (mode === "monthly" && month <= plan.depositMonths) {
        value += plan.monthlyDeposit;
        contributed += plan.monthlyDeposit;
      }
      value *= growth;
      if (month % 12 === 0) {
        const gain = Math.max(0.0, value - contributed);
        values.push(tax ? value - gain * BELKA : value);
      }
    }
    return values;
  }

  return {
    NOMINAL,
    BELKA,
    PROFILES,
    DEFAULT_ORDER,
    MARGIN_SCENARIOS,
    INFLATION_SCENARIOS,
    termMonths,
    monthlyRate,
    xirrMonthly,
    calculate,
    benchmarkSeries,
  };
});
