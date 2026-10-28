/*
 * Testy silnika wersji web (bez zależności).
 * Uruchomienie: node tools/test-web.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const Bonds = require(path.join(here, "..", "web", "bonds.js"));

let pass = 0;
const fails = [];

function check(name, condition, details) {
  if (condition) {
    pass += 1;
  } else {
    fails.push(name + (details ? " — " + details : ""));
  }
}

function near(a, b, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

/* 1. Regresja kalkulatora pojedynczej obligacji. */
const edo = Bonds.calculate("EDO", 0, 0, 10, 5.35, 2, 3, 5.75, false, true, {
  mode: "lump",
  amount: 10000,
});
check("EDO: wartość netto", near(edo.net, 15138.03, 0.05), edo.net.toFixed(2));
check("EDO: zysk netto", near(edo.netProfit, 5138.03, 0.05), edo.netProfit.toFixed(2));
check("EDO: IRR", near(edo.irr * 100, 4.23, 0.02), (edo.irr * 100).toFixed(2));
check("EDO: 10 wierszy", edo.rows.length === 10, edo.rows.length);

/* 2. Pojedyncza pozycja portfela = kalkulator. */
const single = Bonds.simulate({
  positions: [{ code: "EDO", amount: 10000, startMonth: 0 }],
  horizonYears: 10,
  inflation: 3,
  nbp: 5.75,
  ike: false,
  reinvest: true,
});
check("Portfel 1 pozycji = kalkulator", near(single.net, edo.net, 0.05), single.net.toFixed(2) + " vs " + edo.net.toFixed(2));
check("Portfel 1 pozycji: IRR", near(single.irr, edo.irr, 0.0005), single.irr);
check("Portfel 1 pozycji: wpłaty", near(single.totalDeposits, 10000), single.totalDeposits);

/* 3. Drabina: suma wpłat i sensowny wynik. */
const ladder = Bonds.simulate({
  positions: [
    { code: "EDO", amount: 4000, startMonth: 0 },
    { code: "COI", amount: 3000, startMonth: 12 },
    { code: "TOS", amount: 3000, startMonth: 24 },
  ],
  horizonYears: 10,
  inflation: 3,
  nbp: 5.75,
  ike: false,
  reinvest: true,
});
check("Drabina: suma wpłat", near(ladder.totalDeposits, 10000), ladder.totalDeposits);
check("Drabina: netto > wpłaty", ladder.net > ladder.totalDeposits, ladder.net);
check("Drabina: 10 wierszy", ladder.rows.length === 10, ladder.rows.length);
check("Drabina: brak wyczerpania", ladder.depleted === false);

/* 4. IKE nie płaci podatku. */
const taxed = Bonds.calculate("COI", 0, 0, 8, 5.15, 1.75, 3, 5.75, false, true, {
  mode: "lump",
  amount: 20000,
});
const ike = Bonds.calculate("COI", 0, 0, 8, 5.15, 1.75, 3, 5.75, true, true, {
  mode: "lump",
  amount: 20000,
});
check("IKE: wyższa wartość netto", ike.net > taxed.net, ike.net + " vs " + taxed.net);
check("IKE: zero podatku", near(ike.taxPaid + ike.taxDue, 0, 0.01), ike.taxPaid);

/* 5. Rentier: wyczerpanie i trwałość. */
const short = Bonds.simulate({
  positions: [{ code: "COI", amount: 100000, startMonth: 0 }],
  horizonYears: 30,
  inflation: 3,
  nbp: 5.75,
  ike: false,
  reinvest: true,
  monthlyWithdrawal: 2000,
});
check("Rentier: kapitał się wyczerpuje", short.depleted === true, short.depletionMonth);
check("Rentier: miesiąc wyczerpania", short.depletionMonth > 12 && short.depletionMonth < 360, short.depletionMonth);
check("Rentier: netto zero po wyczerpaniu", near(short.net, 0, 1), short.net);

const long = Bonds.simulate({
  positions: [{ code: "EDO", amount: 1000000, startMonth: 0 }],
  horizonYears: 30,
  inflation: 3,
  nbp: 5.75,
  ike: true,
  reinvest: true,
  monthlyWithdrawal: 2000,
});
check("Rentier: duży kapitał wystarcza", long.depleted === false);
check("Rentier: wypłacono 30 lat", near(long.totalWithdrawn, 2000 * 360, 1), long.totalWithdrawn);
check("Rentier: kapitał zostaje", long.net > 0, long.net);

/* 6. Wartości realne. */
check("Dyskonto 3% / 10 lat", near(Bonds.discount(13439.16, 10, 3), 10000, 0.1), Bonds.discount(13439.16, 10, 3));
const real = Bonds.realDeposits({ mode: "monthly", deposit: 100, years: 2 }, 3);
check("Realne wpłaty < nominalne", real < 2400 && real > 2300, real);
check("Realne wpłaty lump = kwota", near(Bonds.realDeposits({ mode: "lump", amount: 5000 }, 5), 5000), 0);

/* 7. Walidacje wejścia silnika. */
let threw = false;
try {
  Bonds.calculate("XXX", 100, 1, 1, 1, 1, 1, 1, false, true, { mode: "monthly" });
} catch (error) {
  threw = true;
}
check("Nieznana obligacja: błąd", threw);

/* 8. Ranking „Co wybrać?”. */
const rank = Bonds.rankBonds({ amount: 100000, years: 2, months: 0, inflation: 3, nbp: 5.75, ike: false });
check("Ranking: 6 serii bez rodzinnych", rank.results.length === 6, rank.results.length);
check("Ranking: posortowany malejąco", rank.results.every((item, index) => index === 0 || rank.results[index - 1].net >= item.net));
check("Ranking: zwycięzca = pozycja 1", rank.winner === rank.results[0] && rank.winner.rank === 1);
check("Ranking: horyzont 24 mies.", rank.months === 24, rank.months);
check("Ranking: wszystkie netto > wpłata", rank.results.every((item) => item.net > 100000));
check("Ranking: DOR 2L wykup naturalny bez opłaty", rank.results.find((x) => x.code === "DOR").modeKey === "natural" && rank.results.find((x) => x.code === "DOR").earlyFee < 0.01);
check("Ranking: EDO 2L wcześniejszy wykup z opłatą", rank.results.find((x) => x.code === "EDO").modeKey === "early" && rank.results.find((x) => x.code === "EDO").earlyFee > 0);
check("Ranking: ROR roluje 2 cykle", rank.results.find((x) => x.code === "ROR").modeKey === "roll" && rank.results.find((x) => x.code === "ROR").cycles === 2);

const rankFamily = Bonds.rankBonds({ amount: 100000, years: 2, months: 0, inflation: 3, nbp: 5.75, ike: false, includeFamily: true });
check("Ranking: 8 serii z rodzinnymi", rankFamily.results.length === 8, rankFamily.results.length);
check("Ranking: ROS/ROD obecne", rankFamily.results.some((x) => x.code === "ROS") && rankFamily.results.some((x) => x.code === "ROD"));

const rankIke = Bonds.rankBonds({ amount: 100000, years: 2, months: 0, inflation: 3, nbp: 5.75, ike: true });
check("Ranking: IKE podnosi wynik", rankIke.results.every((item) => item.net >= rank.results.find((x) => x.code === item.code).net));

const rank18 = Bonds.rankBonds({ amount: 50000, years: 1, months: 6, inflation: 3, nbp: 5.75 });
check("Ranking: okres 18 miesięcy", rank18.months === 18, rank18.months);
check("Ranking: 1,5 roku to wcześniejszy wykup", rank18.winner.modeKey === "early" || rank18.winner.modeKey === "roll-early");

const rank1 = Bonds.rankBonds({ amount: 100000, years: 1, months: 0, inflation: 3, nbp: 5.75 });
check("Ranking: ROR 1 rok naturalny", rank1.results.find((x) => x.code === "ROR").modeKey === "natural");

const rank30 = Bonds.rankBonds({ amount: 100000, years: 2, months: 6, inflation: 3, nbp: 5.75 });
check("Ranking: 2,5 roku — końcówka w gotówce", rank30.results.find((x) => x.code === "ROR").mode.indexOf("gotówka") >= 0, rank30.results.find((x) => x.code === "ROR").mode);
check("Ranking: 2,5 roku — DOR roluje 1 cykl", rank30.results.find((x) => x.code === "DOR").cycles === 1, rank30.results.find((x) => x.code === "DOR").cycles);

/* 9. Dymki z wyjaśnieniami (struktura HTML + teksty). */
const html = fs.readFileSync(path.join(here, "..", "web", "index.html"), "utf8");
const uiSource = fs.readFileSync(path.join(here, "..", "web", "ui.js"), "utf8");
const countTips = (key) => (html.match(new RegExp('data-tip="' + key + '"', "g")) || []).length;
check("Dymki: marża w Obliczeniach", countTips("margin") === 1, countTips("margin"));
check("Dymki: inflacja w 3 modułach", countTips("inflation") === 3, countTips("inflation"));
check("Dymki: stopa NBP w 3 modułach", countTips("nbp") === 3, countTips("nbp"));
check("Dymki: notka pod stopą NBP w Obliczeniach", html.indexOf('id="nbp-note"') >= 0);
check("Dymki: teksty w ui.js", uiSource.indexOf("Stopa referencyjna NBP") >= 0 && uiSource.indexOf("Marża to stały dodatek") >= 0 && uiSource.indexOf("Założona średnia roczna inflacja") >= 0);
check("Dymki: aria-describedby i aria-expanded", uiSource.indexOf('setAttribute("aria-describedby"') >= 0 && uiSource.indexOf('setAttribute("aria-expanded"') >= 0);

console.log("PASS " + pass + " FAIL " + fails.length);
fails.forEach((item) => console.log("FAIL: " + item));
process.exit(fails.length ? 1 : 0);
