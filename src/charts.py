"""Wykresy portfela obligacji (matplotlib + CustomTkinter)."""

from __future__ import annotations

import matplotlib

matplotlib.use("TkAgg")

from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure
from matplotlib.patches import Patch
from matplotlib.ticker import FuncFormatter, MaxNLocator

import customtkinter as ctk

CARD = "#ffffff"
BG = "#eef2f7"
ACCENT = "#1f4e79"
ACCENT_LIGHT = "#6f9cc4"
GREEN = "#1f9d55"
GREEN_LIGHT = "#7cc79a"
GRID = "#dce6f1"
TEXT = "#35587c"
MUTED = "#68798b"
FONT = "Segoe UI"

matplotlib.rcParams.update(
    {
        "font.family": FONT,
        "font.size": 9,
        "axes.edgecolor": GRID,
        "axes.labelcolor": TEXT,
        "axes.titlecolor": ACCENT,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "text.color": TEXT,
        "figure.facecolor": CARD,
        "axes.facecolor": CARD,
        "legend.frameon": False,
    }
)


def _zl(value: float, _pos=None) -> str:
    if abs(value) >= 1000:
        return f"{value / 1000:,.0f} tys.".replace(",", " ")
    return f"{value:,.0f}"


class ChartsPanel(ctk.CTkFrame):
    """Dwa wykresy: terminarz wykupów oraz wartość portfela vs wpłaty."""

    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        head = ctk.CTkFrame(self, fg_color="transparent")
        head.grid(row=0, column=0, sticky="ew", padx=8, pady=(4, 2))
        head.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(
            head,
            text="Drabina obligacyjna — powrót środków i wartość portfela",
            font=ctk.CTkFont(FONT, 18, "bold"),
            text_color=ACCENT,
            anchor="w",
        ).grid(row=0, column=0, sticky="w")
        self.subtitle = ctk.CTkLabel(
            head,
            text="Wpisz parametry i kliknij „Oblicz”, aby odświeżyć wykresy.",
            font=ctk.CTkFont(FONT, 11),
            text_color=MUTED,
            anchor="w",
        )
        self.subtitle.grid(row=1, column=0, sticky="w")

        body = ctk.CTkScrollableFrame(self, fg_color="transparent")
        body.grid(row=1, column=0, sticky="nsew", padx=4, pady=(4, 0))
        body.grid_columnconfigure(0, weight=1)

        self.fig1 = Figure(figsize=(10, 3.0), dpi=100, layout="constrained")
        self.ax1 = self.fig1.add_subplot(111)
        self.canvas1 = FigureCanvasTkAgg(self.fig1, master=body)
        self.canvas1.get_tk_widget().grid(row=0, column=0, sticky="ew", pady=(0, 8))

        self.fig2 = Figure(figsize=(10, 3.0), dpi=100, layout="constrained")
        self.ax2 = self.fig2.add_subplot(111)
        self.canvas2 = FigureCanvasTkAgg(self.fig2, master=body)
        self.canvas2.get_tk_widget().grid(row=1, column=0, sticky="ew")

        self.has_data = False
        self._placeholder(self.ax1, "Terminarz wykupów pojawi się po obliczeniu")
        self._placeholder(self.ax2, "Wartość portfela pojawi się po obliczeniu")
        self.canvas1.draw()
        self.canvas2.draw()

    @staticmethod
    def _placeholder(ax, text: str) -> None:
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.text(0.5, 0.5, text, ha="center", va="center", color=MUTED, fontsize=11)

    def show_result(self, result, deposit_years: int) -> None:
        rows = result.rows
        years = [r.year for r in rows]
        principal = [r.matured_principal for r in rows]
        interest = [max(0.0, r.matured_interest) for r in rows]
        deposits = [r.cumulative_deposits for r in rows]
        net = [r.net for r in rows]

        for ax in (self.ax1, self.ax2):
            ax.clear()
            ax.grid(axis="y", color=GRID, linewidth=0.7, linestyle="--")
            ax.set_axisbelow(True)

        # --- wykres 1: zapadalność transz -------------------------------
        ax = self.ax1
        phase_end = min(deposit_years, result.years)
        ax.axvspan(0.5, phase_end + 0.5, color="#eaf1f8", zorder=0)
        ax.axvspan(phase_end + 0.5, result.years + 0.5, color="#eaf6ee", zorder=0)
        ax.bar(years, principal, width=0.72, color=ACCENT, label="Kapitał (100 zł/szt.)", zorder=2)
        ax.bar(years, interest, width=0.72, bottom=principal, color=GREEN,
               label="Odsetki netto", zorder=2)
        ax.set_title("Ile kapitału i odsetek wraca w każdym roku", loc="left", fontsize=11,
                     fontweight="bold", pad=8)
        ax.set_xlabel("Rok inwestycji")
        ax.set_ylabel("Kwota")
        ax.yaxis.set_major_formatter(FuncFormatter(_zl))
        ax.xaxis.set_major_locator(MaxNLocator(integer=True))
        ax.set_xlim(0.3, result.years + 0.7)
        handles = [
            Patch(facecolor="#eaf1f8", edgecolor=GRID, label=f"Faza wpłat (1–{phase_end})"),
            Patch(facecolor="#eaf6ee", edgecolor=GRID, label="Faza wykupów"),
            Patch(facecolor=ACCENT, label="Kapitał (100 zł/szt.)"),
            Patch(facecolor=GREEN, label="Odsetki netto"),
        ]
        ax.legend(handles=handles, loc="upper left", ncols=4, fontsize=7)
        ymax = max([p + i for p, i in zip(principal, interest)] or [1])
        ax.set_ylim(0, ymax * 1.18 if ymax > 0 else 1)

        # --- wykres 2: wartość portfela vs wpłaty -----------------------
        ax = self.ax2
        ax.fill_between(years, deposits, net, color=GREEN, alpha=0.16, zorder=1,
                        label="Zysk netto")
        ax.fill_between(years, 0, deposits, color=ACCENT_LIGHT, alpha=0.13, zorder=1)
        wealth_label = "Wartość netto portfela" if result.reinvest else "Majątek netto (portfel + wypłaty)"
        ax.plot(years, net, color=ACCENT, linewidth=2.2, marker="o", markersize=3,
                label=wealth_label, zorder=3)
        ax.plot(years, deposits, color="#8a9bb0", linewidth=1.4, linestyle="--",
                label="Wpłacony kapitał", zorder=2)
        ax.set_title("Wartość oszczędności a wpłacony kapitał", loc="left", fontsize=11,
                     fontweight="bold", pad=8)
        ax.set_xlabel("Rok inwestycji")
        ax.set_ylabel("Kwota")
        ax.yaxis.set_major_formatter(FuncFormatter(_zl))
        ax.xaxis.set_major_locator(MaxNLocator(integer=True))
        ax.set_xlim(0, result.years + 0.3)
        ax.legend(loc="upper left", ncols=2, fontsize=8)

        self.fig1.set_constrained_layout(True)
        self.fig2.set_constrained_layout(True)
        self.canvas1.draw_idle()
        self.canvas2.draw_idle()
        self.has_data = True

        mode = "wykupy reinwestowane" if result.reinvest else "wykupy wypłacane na konto"
        self.subtitle.configure(
            text=(
                f"{result.years} lat, {mode}; słupki to transze zapadające w danym roku, "
                "druga linia pokazuje wartość netto portfela."
            )
        )
