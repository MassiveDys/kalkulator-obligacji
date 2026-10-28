# STATUS - kalkulator-obligacji

- **Stan:** wersja web gotowa i publiczna (wpłata jednorazowa + benchmarki S&P 500 / WIG20)
- **Ostatnia zmiana:** 2026-10-28
- **Następny krok:** zbierać uwagi; zmiany w `web/`, commit i push — Pages przebuduje się automatycznie

## Publiczny link
https://massivedys.github.io/kalkulator-obligacji/

## Wersja web (`web/`)
- `index.html`, `style.css`, `app.js`, `bonds.js`, `charts.js` — czysty HTML/CSS/JS, bez frameworków, CDN i zależności
- tryb wpłat: **dopłaty comiesięczne** albo **wpłata jednorazowa** (kwota + horyzont; kupno obligacji w miesiącu 0)
- 8 typów obligacji, scenariusze marży i inflacji, IKE, dwa tryby wykupu, kafelki, tabela, eksport CSV
- wykresy canvas: drabina zapadalności oraz wartość majątku z porównaniem do S&P 500 (~10,2% rocznie) i WIG20 (~7,5% rocznie); identyczny plan wpłat, przełączniki widoczności i podatek Belki 19% dla benchmarków
- responsywność 320–1440 px; tabela z przyklejoną kolumną „Rok”
- publikacja: GitHub Actions (`.github/workflows/pages.yml`) wdraża `web/` po pushu na `main`

## Testy (2026-10-28)
- 12 scenariuszy silnika miesięcznego porównanych z Pythonem (`bonds.py`): identyczne (różnice < 1e-5)
- benchmarki sprawdzone wzorami analitycznymi (renta miesięczna, procent składany, podatek)
- przeglądarka lokalna: 31/31 asercji (8 profili, wpłata jednorazowa, IKE, reinwestycja, walidacja, CSV, benchmarki i ich ukrywanie, podatek), 0 błędów konsoli
- szerokości 320, 390 i 1440 px — bez poziomego przewijania

## Co działa (desktop)
- samodzielny `builds/kalkulator-obligacji.exe` (v1.2) z wykresami i testami PASS
- źródła w `src/` (CustomTkinter + matplotlib), test dymny `--self-test`

## Ograniczenia
- wyniki szacunkowe według modelu (stałe stopy, bez prowizji i inflacji poza modelem)
- benchmarki to stałe średnie stopy zwrotu, nie prognoza; nie odwzorowują zmienności rynku
- `builds/` poza repozytorium (duży EXE); w repo są źródła i wersja web
