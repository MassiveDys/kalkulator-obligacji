"""Silnik obliczeniowy kalkulatora polskich obligacji skarbowych.

Model: co miesiąc wpłata trafia do portfela i kupowane są obligacje po 100 zł.
Każda transza (lot) ma własny termin zapadalności; po wykupie środki są
reinwestowane w ten sam rodzaj obligacji aż do horyzontu inwestycji.
Oprocentowanie roczne jest przeliczane na miesięczne efektywne, a odsetki
naliczane miesięcznie (roczna kapitalizacja / roczna wypłata odsetek).
"""

from __future__ import annotations

from dataclasses import dataclass, field

NOMINAL = 100.0
BELKA = 0.19


@dataclass(frozen=True)
class BondProfile:
    code: str
    name: str
    term_years: float
    kind: str  # "inflacja", "stale", "nbp"
    payout: str  # "kapitalizacja" albo "wyplata"
    default_rate1: float
    default_margin: float
    description: str

    @property
    def term_months(self) -> int:
        return max(1, round(self.term_years * 12))


PROFILES: dict[str, BondProfile] = {
    "EDO": BondProfile(
        "EDO", "EDO 10-letnie", 10, "inflacja", "kapitalizacja",
        5.35, 2.00, "Indeksowane inflacją, roczna kapitalizacja odsetek.",
    ),
    "COI": BondProfile(
        "COI", "COI 4-letnie", 4, "inflacja", "wyplata",
        5.15, 1.75, "Indeksowane inflacją, roczne wypłaty odsetek.",
    ),
    "TOS": BondProfile(
        "TOS", "TOS 3-letnie", 3, "stale", "kapitalizacja",
        5.75, 0.00, "Stałe oprocentowanie, roczna kapitalizacja.",
    ),
    "DOR": BondProfile(
        "DOR", "DOR 2-letnie", 2, "nbp", "wyplata",
        5.75, 0.25, "Stopa NBP + marża, roczne wypłaty odsetek.",
    ),
    "ROR": BondProfile(
        "ROR", "ROR 1-roczne", 1, "nbp", "wyplata",
        5.75, 0.00, "Stopa NBP, odsetki wypłacane przy wykupie.",
    ),
    "OTS": BondProfile(
        "OTS", "OTS 3-miesięczne", 0.25, "stale", "kapitalizacja",
        4.50, 0.00, "Stałe oprocentowanie, wykup po 3 miesiącach.",
    ),
    "ROS": BondProfile(
        "ROS", "ROS 6-letnie (rodzinne)", 6, "inflacja", "kapitalizacja",
        5.60, 2.00, "Obligacje rodzinne, indeksowane inflacją.",
    ),
    "ROD": BondProfile(
        "ROD", "ROD 12-letnie (rodzinne)", 12, "inflacja", "kapitalizacja",
        5.75, 2.50, "Obligacje rodzinne, indeksowane inflacją.",
    ),
}

DEFAULT_ORDER = ["EDO", "COI", "TOS", "DOR", "ROR", "OTS", "ROS", "ROD"]

# Scenariusze pomocnicze do pól "marża" i "inflacja". Wartości są orientacyjne
# i służą jako punkt wyjścia; użytkownik zawsze może wpisać własną liczbę.
MARGIN_SCENARIOS = [
    {"key": "mf", "name": "Aktualna oferta MF", "value": None,
     "note": "Marża z aktualnej oferty Ministerstwa Finansów dla wybranego typu."},
    {"key": "high", "name": "Wysoka historyczna", "value": 2.50,
     "note": "Górny poziom marż oferowanych w historii (np. EDO, ROD)."},
    {"key": "avg", "name": "Średnia historyczna", "value": 1.50,
     "note": "Typowa marża z ostatnich lat."},
    {"key": "low", "name": "Niska 2018–2021", "value": 1.00,
     "note": "Niskie marże z okresu 2018–2021."},
]

INFLATION_SCENARIOS = [
    {"key": "target", "name": "Cel inflacyjny NBP", "value": 2.50,
     "note": "Oficjalny cel NBP: 2,5% ± 1 pkt proc."},
    {"key": "base", "name": "Bazowa / umiarkowana", "value": 3.00,
     "note": "Umiarkowany scenariusz bazowy."},
    {"key": "avg15", "name": "Średnia 15 lat", "value": 3.60,
     "note": "Przybliżona średnia inflacja z ostatnich 15 lat."},
    {"key": "elevated", "name": "Podwyższona", "value": 5.00,
     "note": "Okresy presji cenowej."},
    {"key": "high", "name": "Wysoka / kryzysowa", "value": 8.00,
     "note": "Scenariusz kryzysowy."},
]


@dataclass
class Lot:
    start_month: int
    term_months: int
    rate1: float
    later_rate: float
    payout: str
    nominal: float = NOMINAL
    gain: float = 0.0          # skapitalizowane odsetki (brutto)
    coupon: float = 0.0        # naliczone, jeszcze niewypłacone odsetki
    age: int = 0

    def annual_rate(self, year_index: int) -> float:
        return self.rate1 if year_index <= 1 else self.later_rate


@dataclass
class YearRow:
    year: int
    deposits: float = 0.0
    cumulative_deposits: float = 0.0
    interest: float = 0.0
    tax: float = 0.0
    gross: float = 0.0
    net: float = 0.0
    matured_principal: float = 0.0
    matured_interest: float = 0.0
    payout_cum: float = 0.0


@dataclass
class Result:
    total_deposits: float
    bonds_bought: int
    bonds_held: int
    cash_left: float
    gross: float
    net: float
    net_profit: float
    irr: float
    tax_paid: float
    tax_due: float
    years: int
    months: int
    paid_out: float = 0.0
    reinvest: bool = True
    rows: list[YearRow] = field(default_factory=list)


def _monthly_rate(annual_percent: float) -> float:
    annual = max(-99.0, float(annual_percent)) / 100.0
    return (1.0 + annual) ** (1.0 / 12.0) - 1.0


def _xirr_monthly(flows: list[tuple[int, float]]) -> float:
    """Stopa miesięczna IRR metodą bisekcji (przepływy: miesiąc, kwota)."""
    if not flows or all(f >= 0 for _, f in flows) or all(f <= 0 for _, f in flows):
        return 0.0
    last = max(m for m, _ in flows)

    def npv(r: float) -> float:
        return sum(f / ((1.0 + r) ** m) for m, f in flows)

    lo, hi = -0.5, 0.5
    f_lo, f_hi = npv(lo), npv(hi)
    if f_lo * f_hi > 0:
        return 0.0
    for _ in range(200):
        mid = (lo + hi) / 2
        f_mid = npv(mid)
        if abs(f_mid) < 1e-9:
            return mid
        if f_lo * f_mid <= 0:
            hi = mid
        else:
            lo, f_lo = mid, f_mid
    return (lo + hi) / 2


def calculate(
    code: str,
    monthly_deposit: float,
    deposit_years: int,
    horizon_years: int,
    rate1: float,
    margin: float,
    inflation: float,
    nbp_rate: float,
    ike: bool,
    reinvest: bool = True,
) -> Result:
    profile = PROFILES[code]
    deposit_years = max(0, int(deposit_years))
    horizon_years = max(1, int(horizon_years))
    months = horizon_years * 12
    deposit_months = min(deposit_years * 12, months)

    if profile.kind == "inflacja":
        later_rate = inflation + margin
    elif profile.kind == "nbp":
        later_rate = nbp_rate + margin
    else:
        later_rate = rate1

    # dla obligacji opartych na stopie NBP również 1. rok jest liczony od tej stopy
    first_rate = later_rate if profile.kind == "nbp" else rate1

    lots: list[Lot] = []
    cash = 0.0
    paid_out = 0.0
    total_deposits = 0.0
    bonds_bought = 0
    tax_paid = 0.0
    annual_interest = 0.0
    annual_tax = 0.0
    annual_deposits = 0.0
    annual_principal = 0.0
    annual_matured_interest = 0.0
    rows: list[YearRow] = []
    flows: list[tuple[int, float]] = []
    tax_factor = 0.0 if ike else BELKA

    def buy(month: int, available: float) -> tuple[float, int]:
        count = int(available // NOMINAL)
        if count <= 0:
            return available, 0
        for _ in range(count):
            lots.append(
                Lot(
                    start_month=month,
                    term_months=profile.term_months,
                    rate1=first_rate,
                    later_rate=later_rate,
                    payout=profile.payout,
                )
            )
        return available - count * NOMINAL, count

    def settle_coupon(lot: Lot) -> None:
        nonlocal cash, paid_out, tax_paid, annual_tax, annual_matured_interest
        if lot.coupon <= 0:
            return
        tax = lot.coupon * tax_factor
        net_coupon = lot.coupon - tax
        if reinvest:
            cash += net_coupon
        else:
            paid_out += net_coupon
        annual_matured_interest += net_coupon
        tax_paid += tax
        annual_tax += tax
        lot.coupon = 0.0

    for month in range(1, months + 1):
        if month <= deposit_months:
            cash += monthly_deposit
            total_deposits += monthly_deposit
            annual_deposits += monthly_deposit
            flows.append((month - 1, -monthly_deposit))

        cash, bought = buy(month, cash)
        bonds_bought += bought

        still_alive: list[Lot] = []
        for lot in lots:
            year_index = lot.age // 12 + 1
            interest = lot.nominal * _monthly_rate(lot.annual_rate(year_index))
            annual_interest += interest
            lot.age += 1

            if lot.payout == "kapitalizacja":
                lot.nominal += interest
                lot.gain += interest
            else:
                lot.coupon += interest

            mature = lot.age >= lot.term_months
            if lot.payout == "wyplata" and (lot.age % 12 == 0 or mature):
                settle_coupon(lot)

            if mature:
                if lot.payout == "kapitalizacja":
                    tax = lot.gain * tax_factor
                    value_net = lot.nominal - tax
                    if reinvest:
                        cash += value_net
                    else:
                        paid_out += value_net
                    annual_matured_interest += value_net - NOMINAL
                    tax_paid += tax
                    annual_tax += tax
                else:
                    if reinvest:
                        cash += NOMINAL
                    else:
                        paid_out += NOMINAL
                annual_principal += NOMINAL
                continue
            still_alive.append(lot)
        lots = still_alive

        # kupno za środki z wykupów w tym samym miesiącu
        cash, bought = buy(month, cash)
        bonds_bought += bought

        if month % 12 == 0:
            gross = _gross_value(lots, cash, tax_paid) + paid_out
            net = _net_value(lots, cash, tax_factor) + paid_out
            rows.append(
                YearRow(
                    year=month // 12,
                    deposits=annual_deposits,
                    cumulative_deposits=total_deposits,
                    interest=annual_interest,
                    tax=annual_tax,
                    gross=gross,
                    net=net,
                    matured_principal=annual_principal,
                    matured_interest=annual_matured_interest,
                    payout_cum=paid_out,
                )
            )
            annual_deposits = 0.0
            annual_interest = 0.0
            annual_tax = 0.0
            annual_principal = 0.0
            annual_matured_interest = 0.0

    gross = _gross_value(lots, cash, tax_paid) + paid_out
    net = _net_value(lots, cash, tax_factor) + paid_out
    flows.append((months, net))
    monthly_irr = _xirr_monthly(flows)
    irr = (1.0 + monthly_irr) ** 12 - 1.0 if monthly_irr > -1 else -1.0

    return Result(
        total_deposits=total_deposits,
        bonds_bought=bonds_bought,
        bonds_held=len(lots),
        cash_left=cash,
        gross=gross,
        net=net,
        net_profit=net - total_deposits,
        irr=irr,
        tax_paid=tax_paid,
        tax_due=gross - net,
        years=horizon_years,
        months=months,
        paid_out=paid_out,
        reinvest=reinvest,
        rows=rows,
    )


def _positions(lots: list[Lot]) -> tuple[float, float]:
    """(wartość brutto obligacji, niezrealizowany zysk podlegający Belce)."""
    value = 0.0
    gain = 0.0
    for lot in lots:
        if lot.payout == "kapitalizacja":
            value += lot.nominal
            gain += lot.gain
        else:
            value += NOMINAL + lot.coupon
    return value, gain


def _gross_value(lots: list[Lot], cash: float, tax_paid: float) -> float:
    """Wartość przed podatkiem: portfel + podatki już zapłacone."""
    value, _ = _positions(lots)
    return value + cash + tax_paid


def _net_value(lots: list[Lot], cash: float, tax_factor: float) -> float:
    value, gain = _positions(lots)
    return value + cash - gain * tax_factor
