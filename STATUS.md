# STATUS - kalkulator-obligacji

- **Stan:** wersja web gotowa i publiczna na GitHub Pages
- **Ostatnia zmiana:** 2026-10-28
- **Następny krok:** zbierać uwagi użytkownika; poprawki wprowadzać w `web/`, commit i push (Pages przebuduje się automatycznie)

## Publiczny link
https://massivedys.github.io/kalkulator-obligacji/

## Wersja web (`web/`)
- `index.html`, `style.css`, `app.js`, `bonds.js`, `charts.js` — czysty HTML/CSS/JS, zero frameworków, CDN i zależności
- port 1:1 silnika z `src/bonds.py`: 8 typów obligacji, łańcuch wykupów, podatek Belki / IKE, dwa tryby wykupu, XIRR
- interfejs: kafelki, tabela rok po roku, eksport CSV, zakładka Wykresy (canvas: drabina zapadalności + wartość majątku), opisy scenariuszy pod polami, walidacja jak w desktopie
- responsywny: 320–1440 px; na telefonie jedna kolumna, kafelki 2×3, tabela przewijana z przyklejoną kolumną „Rok”
- publikacja: GitHub Actions (`.github/workflows/pages.yml`) wdraża katalog `web/` na Pages po każdym pushu na `main`

## Testy
- 12 scenariuszy silnika porównanych z Pythonem (`bonds.py`): wyniki identyczne (różnice < 1e-5)
- wersja publiczna: 20/20 asercji w przeglądarce (8 profili, IKE, tryby, scenariusze, walidacja, CSV, wykresy, przełączanie zakładek), 0 błędów konsoli, zasoby 200
- sprawdzone szerokości: 320, 390, 1440 px — bez poziomego przewijania

## Co działa (desktop)
- samodzielny `builds/kalkulator-obligacji.exe` (v1.2) z wykresami i pełnymi testami PASS
- źródła w `src/` (CustomTkinter + matplotlib), test dymny `--self-test`

## Ograniczenia
- wyniki szacunkowe, zgodnie z założeniami modelu (stałe stopy, brak prowizji)
- `builds/` nie trafia do repozytorium (plik EXE jest za duży); w repo są źródła i wersja web
- scenariusze marży i inflacji są orientacyjne, nie stanowią prognozy
