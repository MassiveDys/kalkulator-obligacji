"""Kalkulator polskich obligacji skarbowych - interfejs graficzny."""

from __future__ import annotations

import csv
import sys
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

import customtkinter as ctk

from bonds import INFLATION_SCENARIOS, MARGIN_SCENARIOS, PROFILES, calculate
from charts import ChartsPanel

# --- paleta ---
BG = "#eef2f7"
CARD = "#ffffff"
TILE = "#f4f7fb"
ACCENT = "#1f4e79"
ACCENT_HOVER = "#2d6da3"
TEXT = "#122a42"
MUTED = "#68798b"
GREEN = "#1f9d55"
BORDER = "#e2e9f2"

FONT = "Segoe UI"


def fmt(value: float, decimals: int = 2) -> str:
    text = f"{value:,.{decimals}f}".replace(",", " ").replace(".", ",")
    return f"{text} zł"


def fmt_pct(value: float) -> str:
    return f"{value:.2f}".replace(".", ",") + " %"


def parse_number(text: str) -> float:
    cleaned = text.strip().replace(" ", "").replace("\u00a0", "").replace(",", ".")
    return float(cleaned)


class MetricTile(ctk.CTkFrame):
    def __init__(self, master, title: str, value: str = "—", accent: str = TEXT, **kwargs):
        super().__init__(master, fg_color=TILE, corner_radius=12, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.value_label = ctk.CTkLabel(
            self, text=value, font=ctk.CTkFont(FONT, 21, "bold"), text_color=accent
        )
        self.value_label.grid(row=0, column=0, padx=12, pady=(10, 0), sticky="ew")
        self.title_label = ctk.CTkLabel(
            self, text=title, font=ctk.CTkFont(FONT, 12), text_color=MUTED
        )
        self.title_label.grid(row=1, column=0, padx=12, pady=(1, 9), sticky="ew")

    def set(self, value: str, accent: str | None = None) -> None:
        self.value_label.configure(text=value)
        if accent:
            self.value_label.configure(text_color=accent)


class BondCalculatorApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        ctk.set_appearance_mode("light")
        self.title("Kalkulator obligacji skarbowych")
        self.geometry("1120x1000")
        self.minsize(1000, 800)
        self.configure(fg_color=BG)
        self._last_result = None
        self._icon_path = None
        self._profile_note = ""
        self._scenario_note = ""
        self._margin_options: dict[str, dict] = {}
        self._inflation_options: dict[str, dict] = {}

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.tabs = ctk.CTkTabview(
            self,
            fg_color=BG,
            segmented_button_fg_color="#e2ebf5",
            segmented_button_selected_color=ACCENT,
            segmented_button_selected_hover_color=ACCENT_HOVER,
            segmented_button_unselected_color="#e2ebf5",
            segmented_button_unselected_hover_color="#d3e1f0",
            text_color=TEXT,
            corner_radius=12,
        )
        self.tabs.grid(row=0, column=0, sticky="nsew", padx=16, pady=(8, 12))
        self.tab_calc = self.tabs.add("Obliczenia")
        self.tab_charts = self.tabs.add("Wykresy")
        self.tabs.set("Obliczenia")
        self.tab_calc.grid_columnconfigure(0, weight=1)
        self.tab_calc.grid_rowconfigure(3, weight=1)

        self._build_header(self.tab_calc)
        self._build_controls(self.tab_calc)
        self._build_summary(self.tab_calc)
        self._build_table(self.tab_calc)
        self._build_footer(self.tab_calc)

        self.charts = ChartsPanel(self.tab_charts)
        self.charts.grid(row=0, column=0, sticky="nsew", padx=4, pady=4)
        self.tab_charts.grid_rowconfigure(0, weight=1)
        self.tab_charts.grid_columnconfigure(0, weight=1)

        self._on_profile_change("EDO")
        self._fit_to_screen()
        self.after(150, self.calculate)

    def _fit_to_screen(self) -> None:
        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        width = min(1120, max(900, sw - 80))
        height = min(1010, max(660, sh - 70))
        self.minsize(min(1000, width), min(780, height))
        x = max(0, (sw - width) // 2)
        y = max(0, (sh - height) // 2 - 20)
        self.geometry(f"{width}x{height}+{x}+{y}")

    # ------------------------------------------------------------------ UI
    def _apply_icon(self) -> None:
        base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
        icon = Path(base) / "assets" / "icon.ico"
        if icon.exists():
            try:
                self.iconbitmap(str(icon))
            except tk.TclError:
                pass

    def _build_header(self, parent) -> None:
        header = ctk.CTkFrame(parent, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=26, pady=(12, 4))
        header.grid_columnconfigure(0, weight=1)
        self._apply_icon()
        ctk.CTkLabel(
            header,
            text="Kalkulator obligacji skarbowych",
            font=ctk.CTkFont(FONT, 24, "bold"),
            text_color=ACCENT,
            anchor="w",
        ).grid(row=0, column=0, sticky="ew")
        ctk.CTkLabel(
            header,
            text="Stałe miesięczne dopłaty  •  wybór rodzaju obligacji  •  podatek Belki / IKE  •  wykresy",
            font=ctk.CTkFont(FONT, 12),
            text_color=MUTED,
            anchor="w",
        ).grid(row=1, column=0, sticky="ew", pady=(2, 0))

    def _build_controls(self, parent) -> None:
        card = ctk.CTkFrame(parent, fg_color=CARD, corner_radius=14)
        card.grid(row=1, column=0, sticky="ew", padx=26, pady=8)
        card.grid_columnconfigure((0, 1, 2, 3), weight=1, uniform="ctrl")

        def label(parent, text, row, col):
            ctk.CTkLabel(
                parent, text=text, font=ctk.CTkFont(FONT, 12), text_color=MUTED, anchor="w"
            ).grid(row=row, column=col, padx=14, pady=(8, 2), sticky="ew")

        # wiersz 0 - obligacja
        label(card, "Rodzaj obligacji", 0, 0)
        self._label_to_code = {
            "EDO · 10 lat · inflacja": "EDO",
            "COI · 4 lata · inflacja": "COI",
            "TOS · 3 lata · stałe": "TOS",
            "DOR · 2 lata · NBP + marża": "DOR",
            "ROR · 1 rok · NBP": "ROR",
            "OTS · 3 miesiące · stałe": "OTS",
            "ROS · 6 lat · rodzinne": "ROS",
            "ROD · 12 lat · rodzinne": "ROD",
        }
        self.profile_menu = ctk.CTkOptionMenu(
            card,
            values=list(self._label_to_code),
            command=self._on_profile_change,
            fg_color="#e8eef7",
            button_color="#d5e1ef",
            button_hover_color="#c4d5e8",
            text_color=ACCENT,
            dropdown_fg_color=CARD,
            dropdown_text_color=TEXT,
            dropdown_hover_color="#e8eef7",
            font=ctk.CTkFont(FONT, 13, "bold"),
            dropdown_font=ctk.CTkFont(FONT, 12),
            corner_radius=8,
            height=36,
        )
        self.profile_menu.grid(row=1, column=0, padx=14, sticky="ew")
        self.profile_menu.set("EDO · 10 lat · inflacja")

        # wiersz 0 - kwoty
        label(card, "Miesięczna dopłata (zł)", 0, 1)
        self.deposit_entry = self._entry(card, 1, 1, "400")
        label(card, "Liczba lat dopłat", 0, 2)
        self.years_entry = self._entry(card, 1, 2, "10")
        label(card, "Horyzont / likwidacja (lata)", 0, 3)
        self.horizon_entry = self._entry(card, 1, 3, "20")

        # wiersz 2 - parametry stóp
        label(card, "Oprocentowanie 1. roku (%)", 2, 0)
        self.rate1_entry = self._entry(card, 3, 0, "5,35")
        label(card, "Marża ponad inflację / NBP (%)", 2, 1)
        self.margin_entry, self.margin_menu = self._scenario_cell(
            card, 3, 1, "2,00", "Scenariusz marży (opcjonalnie)", "margin"
        )
        label(card, "Założona średnia inflacja od 2. roku (%)", 2, 2)
        self.inflation_entry, self.inflation_menu = self._scenario_cell(
            card, 3, 2, "3,0", "Scenariusz inflacji (opcjonalnie)", "inflation"
        )
        label(card, "Stopa NBP (%)", 2, 3)
        self.nbp_entry = self._entry(card, 3, 3, "5,75")

        # wiersz 4 - IKE + przycisk
        bottom = ctk.CTkFrame(card, fg_color="transparent")
        bottom.grid(row=4, column=0, columnspan=4, sticky="ew", padx=14, pady=(10, 10))
        bottom.grid_columnconfigure(0, weight=1)

        self.ike_var = tk.BooleanVar(value=False)
        self.ike_check = ctk.CTkCheckBox(
            bottom,
            text="Konto IKE (bez podatku Belki)",
            variable=self.ike_var,
            font=ctk.CTkFont(FONT, 13),
            text_color=TEXT,
            fg_color=ACCENT,
            hover_color=ACCENT_HOVER,
            border_color="#9fb2c6",
            checkbox_width=20,
            checkbox_height=20,
            corner_radius=5,
        )
        self.ike_check.grid(row=0, column=0, sticky="w")

        self.mode_switch = ctk.CTkSegmentedButton(
            bottom,
            values=["Reinwestuj wykupy", "Wypłacaj na konto"],
            command=self._on_mode_change,
            font=ctk.CTkFont(FONT, 11),
            height=32,
            fg_color="#eef4fb",
            selected_color=ACCENT,
            selected_hover_color=ACCENT_HOVER,
            unselected_color="#eef4fb",
            unselected_hover_color="#dfeaf7",
            text_color=TEXT,
            corner_radius=8,
        )
        self.mode_switch.grid(row=0, column=1, padx=(10, 10))
        self.mode_switch.set("Wypłacaj na konto")

        self.calc_button = ctk.CTkButton(
            bottom,
            text="Oblicz",
            command=self.calculate,
            width=150,
            height=40,
            corner_radius=9,
            fg_color=ACCENT,
            hover_color=ACCENT_HOVER,
            font=ctk.CTkFont(FONT, 14, "bold"),
        )
        self.calc_button.grid(row=0, column=2, padx=(0, 0))

        self.profile_info = ctk.CTkLabel(
            card,
            text="",
            font=ctk.CTkFont(FONT, 12),
            text_color=MUTED,
            anchor="w",
        )
        self.profile_info.grid(row=5, column=0, columnspan=4, sticky="ew", padx=14, pady=(0, 8))

        self.deposit_entry.bind("<Return>", lambda _e: self.calculate())
        self.years_entry.bind("<Return>", lambda _e: self.calculate())
        self.horizon_entry.bind("<Return>", lambda _e: self.calculate())
        self.rate1_entry.bind("<Return>", lambda _e: self.calculate())
        self.margin_entry.bind("<Return>", lambda _e: self.calculate())
        self.inflation_entry.bind("<Return>", lambda _e: self.calculate())
        self.nbp_entry.bind("<Return>", lambda _e: self.calculate())

    def _entry(self, parent, row: int, col: int, value: str) -> ctk.CTkEntry:
        entry = ctk.CTkEntry(
            parent,
            height=36,
            corner_radius=8,
            border_color="#d7e0ea",
            fg_color="#fbfcfe",
            text_color=TEXT,
            font=ctk.CTkFont(FONT, 13),
            justify="right",
        )
        entry.grid(row=row, column=col, padx=14, sticky="ew")
        entry.insert(0, value)
        return entry

    def _scenario_cell(self, parent, row: int, col: int, value: str,
                       placeholder: str, kind: str) -> tuple[ctk.CTkEntry, ctk.CTkOptionMenu]:
        cell = ctk.CTkFrame(parent, fg_color="transparent")
        cell.grid(row=row, column=col, padx=14, sticky="ew")
        cell.grid_columnconfigure(0, weight=1)

        entry = ctk.CTkEntry(
            cell,
            height=34,
            corner_radius=8,
            border_color="#d7e0ea",
            fg_color="#fbfcfe",
            text_color=TEXT,
            font=ctk.CTkFont(FONT, 13),
            justify="right",
        )
        entry.grid(row=0, column=0, sticky="ew")
        entry.insert(0, value)
        entry.bind("<KeyRelease>", lambda _e: self._mark_custom(kind))

        menu = ctk.CTkOptionMenu(
            cell,
            values=[placeholder],
            command=lambda label: self._apply_scenario(kind, label),
            height=28,
            corner_radius=7,
            fg_color="#eef4fb",
            button_color="#dde8f4",
            button_hover_color="#cfdff0",
            text_color="#35587c",
            dropdown_fg_color=CARD,
            dropdown_text_color=TEXT,
            dropdown_hover_color="#e8eef7",
            font=ctk.CTkFont(FONT, 11),
            dropdown_font=ctk.CTkFont(FONT, 11),
            anchor="w",
        )
        menu.grid(row=1, column=0, sticky="ew", pady=(4, 0))
        menu.set(placeholder)
        return entry, menu

    # ------------------------------------------------------- scenariusze
    @staticmethod
    def _scenario_label(name: str, value: float) -> str:
        return f"{name} ({value:.2f}%)".replace(".", ",")

    def _rebuild_scenario_menus(self, profile) -> None:
        margin_placeholder = "Scenariusz marży (opcjonalnie)"
        margin_labels: list[str] = []
        self._margin_options = {}
        for item in MARGIN_SCENARIOS:
            value = profile.default_margin if item["value"] is None else item["value"]
            text = self._scenario_label(item["name"], value)
            margin_labels.append(text)
            self._margin_options[text] = {"value": value, "note": item["note"]}
        margin_labels.append("Własna wartość (wpisz powyżej)")

        inflation_placeholder = "Scenariusz inflacji (opcjonalnie)"
        inflation_labels: list[str] = []
        self._inflation_options = {}
        for item in INFLATION_SCENARIOS:
            text = self._scenario_label(item["name"], item["value"])
            inflation_labels.append(text)
            self._inflation_options[text] = {"value": item["value"], "note": item["note"]}
        inflation_labels.append("Własna wartość (wpisz powyżej)")

        self.margin_menu.configure(values=[margin_placeholder] + margin_labels)
        self.inflation_menu.configure(values=[inflation_placeholder] + inflation_labels)
        self.margin_menu.set(margin_placeholder)
        self.inflation_menu.set(inflation_placeholder)
        self._margin_placeholder = margin_placeholder
        self._inflation_placeholder = inflation_placeholder
        self._scenario_note = ""
        self._refresh_info()

    def _apply_scenario(self, kind: str, label: str) -> None:
        options = self._margin_options if kind == "margin" else self._inflation_options
        entry = self.margin_entry if kind == "margin" else self.inflation_entry
        placeholder = (
            self._margin_placeholder if kind == "margin" else self._inflation_placeholder
        )

        if label == placeholder:
            return
        if label.startswith("Własna wartość"):
            entry.focus_set()
            self._mark_custom(kind)
            return
        item = options.get(label)
        if item is None:
            return

        menu = self.margin_menu if kind == "margin" else self.inflation_menu
        menu.set(label)
        entry.configure(state="normal")
        entry.delete(0, "end")
        entry.insert(0, f"{item['value']:.2f}".replace(".", ","))
        self._scenario_note = (
            f"Scenariusz: {label} — {item['note']} Możesz wpisać własną wartość."
        )
        self._refresh_info()
        self.calculate()

    def _mark_custom(self, kind: str) -> None:
        menu = self.margin_menu if kind == "margin" else self.inflation_menu
        placeholder = (
            self._margin_placeholder if kind == "margin" else self._inflation_placeholder
        )
        menu.set(placeholder)
        self._scenario_note = ""
        self._refresh_info()

    def _refresh_info(self) -> None:
        parts = [self._profile_note] if self._profile_note else []
        if self._scenario_note:
            parts.append(self._scenario_note)
        self.profile_info.configure(text="  ".join(parts))

    def _build_summary(self, parent) -> None:
        card = ctk.CTkFrame(parent, fg_color=CARD, corner_radius=14)
        card.grid(row=2, column=0, sticky="ew", padx=26, pady=8)
        card.grid_columnconfigure((0, 1, 2), weight=1, uniform="tiles")

        self.tile_deposits = MetricTile(card, "Suma wpłat")
        self.tile_bonds = MetricTile(card, "Liczba obligacji (z wpłat)")
        self.tile_gross = MetricTile(card, "Wartość brutto na koniec")
        self.tile_net = MetricTile(card, "Wartość netto (na rękę)", accent=GREEN)
        self.tile_profit = MetricTile(card, "Zysk netto", accent=GREEN)
        self.tile_irr = MetricTile(card, "Średnia roczna stopa zwrotu netto")

        tiles = [
            self.tile_deposits, self.tile_bonds, self.tile_gross,
            self.tile_net, self.tile_profit, self.tile_irr,
        ]
        for index, tile in enumerate(tiles):
            tile.grid(
                row=index // 3, column=index % 3,
                padx=(14 if index % 3 == 0 else 6, 14 if index % 3 == 2 else 6),
                pady=(12 if index < 3 else 5, 12 if index >= 3 else 5),
                sticky="nsew",
            )
        card.grid_rowconfigure((0, 1), weight=1)

    def _build_table(self, parent) -> None:
        card = ctk.CTkFrame(parent, fg_color=CARD, corner_radius=14)
        card.grid(row=3, column=0, sticky="nsew", padx=26, pady=(8, 6))
        card.grid_columnconfigure(0, weight=1)
        card.grid_rowconfigure(1, weight=1)

        head = ctk.CTkFrame(card, fg_color="transparent")
        head.grid(row=0, column=0, sticky="ew", padx=16, pady=(12, 6))
        head.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(
            head,
            text="Przebieg rok po roku",
            font=ctk.CTkFont(FONT, 16, "bold"),
            text_color=TEXT,
            anchor="w",
        ).grid(row=0, column=0, sticky="w")
        self.export_button = ctk.CTkButton(
            head,
            text="Eksport CSV",
            command=self.export_csv,
            width=110,
            height=30,
            corner_radius=8,
            fg_color="#e8eef7",
            hover_color="#d5e1ef",
            text_color=ACCENT,
            font=ctk.CTkFont(FONT, 12, "bold"),
        )
        self.export_button.grid(row=0, column=1, sticky="e")

        table_frame = ctk.CTkFrame(card, fg_color="transparent")
        table_frame.grid(row=1, column=0, sticky="nsew", padx=16, pady=(0, 14))
        table_frame.grid_columnconfigure(0, weight=1)
        table_frame.grid_rowconfigure(0, weight=1)

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(
            "Bonds.Treeview",
            background=CARD,
            fieldbackground=CARD,
            foreground=TEXT,
            rowheight=27,
            borderwidth=0,
            font=(FONT, 10),
        )
        style.configure(
            "Bonds.Treeview.Heading",
            background="#eaf1f8",
            foreground=ACCENT,
            font=(FONT, 10, "bold"),
            relief="flat",
            padding=(6, 5),
        )
        style.map("Bonds.Treeview.Heading", background=[("active", "#dde8f4")])
        style.map("Bonds.Treeview", background=[("selected", "#cfe0f2")], foreground=[("selected", TEXT)])
        style.layout("Bonds.Treeview", [("Bonds.Treeview.treearea", {"sticky": "nswe"})])

        columns = ("rok", "wplaty", "skumulowane", "odsetki", "podatek", "brutto", "netto")
        self.tree = ttk.Treeview(
            table_frame, columns=columns, show="headings", style="Bonds.Treeview"
        )
        headers = {
            "rok": ("Rok", 55, "center"),
            "wplaty": ("Wpłaty w roku", 130, "e"),
            "skumulowane": ("Skumulowane wpłaty", 155, "e"),
            "odsetki": ("Naliczone odsetki", 135, "e"),
            "podatek": ("Podatek Belki", 115, "e"),
            "brutto": ("Wartość brutto", 140, "e"),
            "netto": ("Wartość netto", 140, "e"),
        }
        for col, (title, width, anchor) in headers.items():
            self.tree.heading(col, text=title)
            self.tree.column(col, width=width, anchor=anchor, stretch=True)
        self.tree.tag_configure("odd", background="#fafcfe")
        self.tree.tag_configure("even", background=CARD)
        self.tree.grid(row=0, column=0, sticky="nsew")

        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        scroll.grid(row=0, column=1, sticky="ns")

    def _build_footer(self, parent) -> None:
        ctk.CTkLabel(
            parent,
            text=(
                "Założenia: 1 obligacja = 100 zł; wykupy reinwestowane lub wypłacane; stopy roczne "
                "przeliczone miesięcznie; podatek Belki 19% (IKE 0%). Wyniki są szacunkowe."
            ),
            font=ctk.CTkFont(FONT, 10),
            text_color=MUTED,
            wraplength=1040,
            justify="left",
            anchor="w",
        ).grid(row=4, column=0, sticky="ew", padx=30, pady=(0, 12))

    # -------------------------------------------------------------- logika
    def _selected_code(self) -> str:
        return self._label_to_code[self.profile_menu.get()]

    def _on_profile_change(self, _value: str = "") -> None:
        code = self._selected_code()
        profile = PROFILES[code]
        years_text = f"{profile.term_years:g}".replace(".", ",")
        self._profile_note = (
            f"{profile.description}  Okres: {years_text} lat, "
            f"odsetki: {'kapitalizacja roczna' if profile.payout == 'kapitalizacja' else 'wypłata roczna'}."
        )
        self._set_entry(self.rate1_entry, f"{profile.default_rate1:.2f}".replace(".", ","))
        self._set_entry(self.margin_entry, f"{profile.default_margin:.2f}".replace(".", ","))

        kind = profile.kind
        margin_enabled = kind in ("inflacja", "nbp") and code != "ROR"
        inflation_enabled = kind == "inflacja"
        self._enable(self.rate1_entry, kind in ("inflacja", "stale"))
        self._enable(self.margin_entry, margin_enabled)
        self._enable(self.margin_menu, margin_enabled)
        self._enable(self.inflation_entry, inflation_enabled)
        self._enable(self.inflation_menu, inflation_enabled)
        self._enable(self.nbp_entry, kind == "nbp")
        self._enable(self.ike_check, True)

        self._rebuild_scenario_menus(profile)

    @staticmethod
    def _enable(widget, enabled: bool) -> None:
        if isinstance(widget, ctk.CTkEntry):
            widget.configure(state="normal" if enabled else "disabled",
                             fg_color="#fbfcfe" if enabled else "#f0f3f7")
        else:
            widget.configure(state="normal" if enabled else "disabled")

    @staticmethod
    def _set_entry(entry: ctk.CTkEntry, value: str) -> None:
        state = entry.cget("state")
        entry.configure(state="normal")
        entry.delete(0, "end")
        entry.insert(0, value)
        entry.configure(state=state)

    def _read_inputs(self):
        code = self._selected_code()
        profile = PROFILES[code]
        deposit = parse_number(self.deposit_entry.get())
        years = int(round(parse_number(self.years_entry.get())))
        horizon = int(round(parse_number(self.horizon_entry.get())))

        def optional(entry, fallback: float) -> float:
            if entry.cget("state") == "disabled":
                return fallback
            try:
                return parse_number(entry.get())
            except ValueError:
                return fallback

        rate1 = optional(self.rate1_entry, profile.default_rate1)
        margin = optional(self.margin_entry, profile.default_margin)
        inflation = optional(self.inflation_entry, 3.0)
        nbp = optional(self.nbp_entry, 5.75)

        if deposit < 100:
            raise ValueError("Miesięczna dopłata musi wynosić co najmniej 100 zł (1 obligacja).")
        if deposit > 10_000_000:
            raise ValueError("Miesięczna dopłata jest zbyt duża.")
        if years < 1 or years > 60:
            raise ValueError("Liczba lat dopłat musi być w zakresie 1–60.")
        if horizon < 1 or horizon > 60:
            raise ValueError("Horyzont inwestycji musi być w zakresie 1–60 lat.")
        if not -20 <= rate1 <= 100 or not -20 <= inflation <= 100 or not -20 <= nbp <= 100:
            raise ValueError("Stopy procentowe muszą być w zakresie -20% … 100%.")
        if not -20 <= margin <= 100:
            raise ValueError("Marża musi być w zakresie -20% … 100%.")

        return code, deposit, years, horizon, rate1, margin, inflation, nbp, self.ike_var.get()

    def _on_mode_change(self, _value: str = "") -> None:
        self.calculate()

    def calculate(self) -> None:
        try:
            code, deposit, years, horizon, rate1, margin, inflation, nbp, ike = self._read_inputs()
        except ValueError as exc:
            messagebox.showerror("Nieprawidłowe dane", str(exc), parent=self)
            return

        reinvest = self.mode_switch.get() == "Reinwestuj wykupy"
        try:
            result = calculate(
                code, deposit, years, horizon, rate1, margin, inflation, nbp, ike, reinvest
            )
        except Exception as exc:  # pragma: no cover - zabezpieczenie UI
            messagebox.showerror("Błąd obliczeń", str(exc), parent=self)
            return

        self._last_result = (result, code, ike)
        self.tile_deposits.set(fmt(result.total_deposits, 0))
        self.tile_bonds.set(f"{int(result.total_deposits // 100)}")
        self.tile_gross.set(fmt(result.gross))
        self.tile_net.set(fmt(result.net), GREEN)
        self.tile_profit.set(fmt(result.net_profit), GREEN)
        self.tile_irr.set(fmt_pct(result.irr * 100), GREEN)
        self.charts.show_result(result, years)

        self.tree.delete(*self.tree.get_children())
        for index, row in enumerate(result.rows):
            self.tree.insert(
                "",
                "end",
                values=(
                    row.year,
                    fmt(row.deposits, 0),
                    fmt(row.cumulative_deposits, 0),
                    fmt(row.interest),
                    fmt(row.tax),
                    fmt(row.gross),
                    fmt(row.net),
                ),
                tags=("odd" if index % 2 else "even",),
            )
        if result.rows:
            self.tree.yview_moveto(0.0)

    def export_csv(self) -> None:
        if not self._last_result:
            messagebox.showinfo("Eksport", "Najpierw wykonaj obliczenia.", parent=self)
            return
        result, code, ike = self._last_result
        path = filedialog.asksaveasfilename(
            parent=self,
            title="Zapisz wyniki",
            defaultextension=".csv",
            initialfile=f"obligacje-{code.lower()}.csv",
            filetypes=[("CSV", "*.csv"), ("Wszystkie pliki", "*.*")],
        )
        if not path:
            return
        try:
            with open(path, "w", newline="", encoding="utf-8-sig") as handle:
                writer = csv.writer(handle, delimiter=";")
                writer.writerow([f"Kalkulator obligacji - {code}", "IKE" if ike else "podatek Belki 19%"])
                writer.writerow(["Rok", "Wpłaty w roku", "Skumulowane wpłaty", "Odsetki",
                                 "Podatek", "Wartość brutto", "Wartość netto"])
                for row in result.rows:
                    writer.writerow([
                        row.year, f"{row.deposits:.2f}", f"{row.cumulative_deposits:.2f}",
                        f"{row.interest:.2f}", f"{row.tax:.2f}", f"{row.gross:.2f}",
                        f"{row.net:.2f}",
                    ])
                writer.writerow([])
                writer.writerow(["Suma wpłat", f"{result.total_deposits:.2f}"])
                writer.writerow(["Wartość brutto", f"{result.gross:.2f}"])
                writer.writerow(["Wartość netto", f"{result.net:.2f}"])
                writer.writerow(["Zysk netto", f"{result.net_profit:.2f}"])
                writer.writerow(["Stopa netto (rocznie)", f"{result.irr * 100:.2f}%"])
            messagebox.showinfo("Eksport", f"Zapisano plik:\n{path}", parent=self)
        except OSError as exc:
            messagebox.showerror("Eksport", f"Nie udało się zapisać pliku:\n{exc}", parent=self)


def _self_test(report_path: str) -> int:
    """Uruchamia aplikację, liczy wszystkie rodzaje obligacji i zapisuje raport."""
    import traceback

    lines: list[str] = []
    exit_code = 0
    app = BondCalculatorApp()
    try:
        app.update_idletasks()
        labels = {code: label for label, code in app._label_to_code.items()}
        for code in ["EDO", "COI", "TOS", "DOR", "ROR", "OTS", "ROS", "ROD"]:
            label = labels[code]
            app.profile_menu.set(label)
            app._on_profile_change(label)
            app.calculate()
            if app._last_result is None:
                raise RuntimeError(f"Brak wyniku dla {code}")
            result, _, _ = app._last_result
            if result.net <= 0 or not result.rows:
                raise RuntimeError(f"Nieprawidłowy wynik dla {code}")
            lines.append(
                f"{code}: wpłaty={result.total_deposits:.2f} brutto={result.gross:.2f} "
                f"netto={result.net:.2f} zysk={result.net_profit:.2f} "
                f"stopa={result.irr * 100:.2f}% wierszy={len(result.rows)}"
            )

        # scenariusz domyślny + IKE
        label = labels["EDO"]
        app.profile_menu.set(label)
        app._on_profile_change(label)
        app.ike_var.set(True)
        app.calculate()
        ike_result, _, _ = app._last_result
        lines.append(
            f"IKE EDO: netto={ike_result.net:.2f} podatek={ike_result.tax_paid + ike_result.tax_due:.2f}"
        )
        if (ike_result.tax_paid + ike_result.tax_due) > 0.005:
            raise RuntimeError("IKE nie powinno naliczać podatku")
        app.ike_var.set(False)
        app.calculate()
        base_result, _, _ = app._last_result

        # scenariusze marży i inflacji
        margin_label = next(
            lab for lab in app._margin_options if "Wysoka historyczna" in lab
        )
        inflation_label = next(
            lab for lab in app._inflation_options if "Podwyższona" in lab
        )
        app._apply_scenario("margin", margin_label)
        app._apply_scenario("inflation", inflation_label)
        if parse_number(app.margin_entry.get()) != 2.50:
            raise RuntimeError("Scenariusz marży nie uzupełnił pola")
        if parse_number(app.inflation_entry.get()) != 5.00:
            raise RuntimeError("Scenariusz inflacji nie uzupełnił pola")
        scenario_result, _, _ = app._last_result
        lines.append(
            f"Scenariusze: marża={app.margin_entry.get()}% inflacja={app.inflation_entry.get()}% "
            f"-> netto={scenario_result.net:.2f}"
        )
        if not (scenario_result.net > base_result.net):
            raise RuntimeError("Wyższa marża i inflacja powinny zmienić wynik")
        # powrót do wartości domyślnych i ręczna edycja
        app._apply_scenario("margin", app._margin_placeholder)
        app._set_entry(app.margin_entry, "1,80")
        app.calculate()

        # wariant wypłat na konto + wykresy
        app.mode_switch.set("Wypłacaj na konto")
        app.calculate()
        payout_result, _, _ = app._last_result
        if payout_result.paid_out <= 0:
            raise RuntimeError("Tryb wypłat nie zwrócił środków inwestorowi")
        if not app.charts.has_data:
            raise RuntimeError("Wykresy nie zostały odświeżone")
        lines.append(
            f"Wypłaty: wypłacono={payout_result.paid_out:.2f} "
            f"majątek={payout_result.net:.2f} wykupy_lat="
            f"{sum(1 for r in payout_result.rows if r.matured_principal > 0)}"
        )
        app.mode_switch.set("Reinwestuj wykupy")
        app.calculate()
        if not app.charts.has_data:
            raise RuntimeError("Wykresy nie działają w trybie reinwestycji")
        lines.append("OK: aplikacja uruchomiona, scenariusze, tryby wykupów i wykresy działają")
    except Exception:
        exit_code = 1
        lines.append("BŁĄD:\n" + traceback.format_exc())
    finally:
        try:
            Path(report_path).write_text("\n".join(lines), encoding="utf-8")
        except OSError:
            pass
        print("\n".join(lines))
        app.destroy()
    return exit_code


def main() -> None:
    if "--self-test" in sys.argv:
        index = sys.argv.index("--self-test")
        report = sys.argv[index + 1] if len(sys.argv) > index + 1 else "smoke-test.txt"
        raise SystemExit(_self_test(report))
    app = BondCalculatorApp()
    app.mainloop()


if __name__ == "__main__":
    main()
