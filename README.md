# Kalkulator polskich obligacji skarbowych

Kalkulator polskich obligacji skarbowych w wersji desktop (.exe) i web. Pozwala
porównać typy obligacji, ustawić własne oprocentowanie i sprawdzić wpływ podatku
Belki oraz konta IKE.

## Wersja web (online)

**https://massivedys.github.io/kalkulator-obligacji/** — bez instalacji, działa też na telefonie.

Źródło: katalog `web/`; każdy push na `main` uruchamia GitHub Actions i wdraża stronę na Pages.
Lokalnie:

```powershell
cd D:\openbot\projects\kalkulator-obligacji\web
python -m http.server 8766
# http://127.0.0.1:8766/
```

## Funkcje

- 8 typów obligacji: EDO, COI, TOS, DOR, ROR, OTS, ROS, ROD — parametry można edytować.
- Miesięczna dopłata, liczba lat dopłat oraz niezależny horyzont (moment likwidacji).
- Reinwestycja środków z wykupów do końca horyzontu (pełny cykl obligacji).
- Tryb wykupów: „Reinwestuj wykupy” albo „Wypłacaj na konto” (domyślnie wypłaty).
- Zakładka **Wykresy**: terminarz zapadalności transz (kapitał + odsetki netto) oraz
  wartość oszczędności na tle wpłaconego kapitału.
- Czytelne GUI w stylu kart: kafelki podsumowania, tabela roczna, eksport CSV.
- Rozwijane scenariusze dla marży i inflacji z możliwością wpisania własnej wartości:
  - marża: aktualna oferta MF dla wybranego typu, wysoka 2,50%, średnia 1,50%, niska 1,00% (2018–2021);
  - inflacja: cel NBP 2,50%, bazowa 3,00%, średnia 15 lat 3,60%, podwyższona 5,00%, wysoka 8,00%.
- Checkbox IKE — po zaznaczeniu nie nalicza podatku Belki (19%).
- Wersja web: tryb **wpłaty jednorazowej** (np. 10 000 zł na 10 lat) obok dopłat miesięcznych.
- Wersja web: na wykresie wartości porównanie z **S&P 500 (~10,2% rocznie)** i **WIG20 (~7,5% rocznie)**
  przy identycznym planie wpłat; przełączniki widoczności i opcjonalny podatek Belki 19%.
- Wersja web: **wcześniejszy wykup** — checkbox, wypłata na koniec horyzontu przed zapadalnością;
  opłata wg typu (EDO/ROD 3 zł, COI/ROS 2 zł, TOS 1 zł, DOR 0,70 zł, ROR 0,50 zł, OTS 0 zł) jest
  potrącana z odsetek, maks. do ich wysokości; podatek Belki liczony od odsetek po opłacie.
  Stawki potwierdzone w [słowniczku obligacjeskarbowe.pl](https://www.obligacjeskarbowe.pl/slowniczek/).
- Wersja web: zakładka **Porównanie** — dwa warianty A/B obok siebie, tabela różnic (netto, zysk,
  stopa zwrotu, podatki) i wykres wartości netto w czasie.
- Wersja web: zakładka **Portfel** — drabina do 8 pozycji z różnymi seriami i miesiącami zakupu,
  reinwestycja wykupów w tę samą serię, terminarz wykupów, IRR i wykresy.
- Wersja web: zakładka **Rentier** — stała wypłata miesięczna, „na ile lat wystarczy kapitał”,
  łączne wypłaty, pozostały kapitał i podatek; wcześniejszy wykup z opłatą przy braku gotówki.
- Wersja web: **wartości realne** (po inflacji) — wartość netto i zysk w dzisiejszych złotówkach.
- Wersja web: **permalink** — cały scenariusz w URL (`?d=…`) i w `localStorage`; „Kopiuj link” i „Reset”.
- Wersja web: **PWA/offline** — manifest, ikony i service worker; instalacja na telefonie, praca bez sieci.

## Uruchomienie

Gotowy plik: `builds\kalkulator-obligacji.exe` (nie wymaga Pythona).

Ze źródeł:

```powershell
D:\openbot\tools\venv-bond\Scripts\python.exe src\app.py
```

## Build

```powershell
D:\openbot\tools\venv-bond\Scripts\pyinstaller.exe --noconfirm --clean --onefile `
  --windowed --name kalkulator-obligacji --icon assets\icon.ico `
  --add-data "assets\icon.ico;assets" --distpath builds `
  --workpath D:\openbot\build\kalkulator-obligacji `
  --specpath D:\openbot\build\kalkulator-obligacji src\app.py
```

Test dymny (zapisuje raport i kończy z kodem 0):

```powershell
builds\kalkulator-obligacji.exe --self-test builds\smoke-test.txt
```

## Założenia obliczeń
- 1 obligacja = 100 zł; kupowane są pełne obligacje, reszta zostaje w gotówce.
- Odsetki naliczane miesięcznie według stopy efektywnej z rocznej (kapitalizacja
  roczna dla EDO/TOS/ROS/ROD/OTS, wypłata odsetek dla COI/DOR/ROR).
- Po wykupie transzy środki są reinwestowane w ten sam typ obligacji.
- Dla EDO/COI/ROS/ROD od 2. roku: inflacja + marża; dla DOR/ROR: stopa NBP + marża;
  TOS/OTS: stała stopa z pola „Oprocentowanie 1. roku”.
- Podatek Belki 19% pobierany przy wypłacie odsetek lub wykupie; IKE = 0%.
- Wartość brutto = portfel przed podatkiem (z doliczonymi już zapłaconymi podatkami),
  netto = po podatku. Stopa zwrotu netto to XIRR (uwzględnia rozłożenie wpłat w czasie).
- Wyniki są szacunkowe; nie uwzględniają prowizji, inflacji poza modelem ani zmian stóp.
- Wartości scenariuszy marży i inflacji są orientacyjne — to punkty wyjścia, nie prognoza.
- Benchmarki (S&P 500 ~10,2%, WIG20 ~7,5% rocznie): stała stopa, miesięczne przeliczenie,
  zyski reinwestowane, opcjonalny podatek Belki 19%; bez kosztów, inflacji i zmienności rynku.
- Wcześniejszy wykup: opłata per obligacja potrącana z odsetek, nie więcej niż odsetki; kapitał
  100 zł/szt. jest zwracany. OTS: bez opłaty, ale odsetki za niezakończony okres przepadają.

## Struktura

- `web/` — wersja web (HTML/CSS/JS), źródło publikacji na GitHub Pages
  - `index.html`, `style.css` — układ i style (5 zakładek: Obliczenia, Porównanie, Portfel, Rentier, Wykresy)
  - `bonds.js` — silnik: `calculate` (pojedyncza seria), `simulate` (portfel/drabina/rentier), dyskonto inflacyjne
  - `app.js`, `compare.js`, `portfolio.js`, `rentier.js` — moduły interfejsu
  - `ui.js` — formatowanie, stan w URL, zakładki, schowek, PWA
  - `charts.js` — wykresy canvas (rejestr wykresów liniowych i słupkowych)
  - `manifest.webmanifest`, `sw.js`, ikony SVG — tryb offline/PWA (przy każdej publikacji podnieś numer `CACHE` w `sw.js`)
- `.github/workflows/pages.yml` — automatyczne wdrożenie `web/` na Pages
- `src/bonds.py` — silnik obliczeniowy wersji desktop
- `src/app.py` — GUI (CustomTkinter) i tryb `--self-test`
- `builds/` — plik .exe i raport testu (poza repozytorium)
- `assets/` — ikona i zrzut referencyjny

Testy wersji web:

```powershell
node tools\test-web.mjs
```

Repozytorium: https://github.com/MassiveDys/kalkulator-obligacji
