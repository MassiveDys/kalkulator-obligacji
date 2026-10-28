# STATUS - kalkulator-obligacji

- **Stan:** wersja web gotowa i publiczna (wpłata jednorazowa, benchmarki, wcześniejszy wykup)
- **Ostatnia zmiana:** 2026-10-28
- **Następny krok:** zbierać uwagi; zmiany w `web/`, commit i push — Pages przebuduje się automatycznie

## Publiczny link
https://massivedys.github.io/kalkulator-obligacji/

## Wersja web (`web/`)
- `index.html`, `style.css`, `app.js`, `bonds.js`, `charts.js` — czysty HTML/CSS/JS, bez frameworków, CDN i zależności
- tryb wpłat: **dopłaty comiesięczne** albo **wpłata jednorazowa**
- **wcześniejszy wykup**: checkbox; wypłata następuje na koniec horyzontu, opłata wg typu obligacji, potrącana z odsetek do ich wysokości (kapitał 100 zł/szt. chroniony); OTS bez opłaty, ale bez odsetek
- opłaty (emisje od 1.09.2024): EDO/ROD 3,00 zł, COI/ROS 2,00 zł, TOS 1,00 zł, DOR 0,70 zł, ROR 0,50 zł, OTS 0 zł
- podatek Belki od odsetek po opłacie; IKE bez podatku; opłata zawsze widoczna w podsumowaniu, tabeli (kolumna + znacznik „wykup”) i CSV
- wykresy canvas: drabina zapadalności, wartość majątku + benchmarki S&P 500 (~10,2%) i WIG20 (~7,5%), z przełącznikami
- responsywność 320–1440 px
- publikacja: GitHub Actions (`.github/workflows/pages.yml`) wdraża `web/` po pushu na `main`

## Testy (2026-10-28)
- 12 scenariuszy miesięcznych porównanych z Pythonem (`bonds.py`): identyczne (różnice < 1e-5)
- 34/34 asercji w przeglądarce: 8 profili, wpłata jednorazowa, wcześniejszy wykup (EDO 5/10 lat), IKE, limit opłaty do odsetek, OTS, tabele, CSV, benchmarki, wykresy
- 0 błędów konsoli; szerokości 320, 390 i 1200 px bez poziomego przewijania
- oficjalne stawki opłat potwierdzone w słowniczku obligacjeskarbowe.pl

## Co działa (desktop)
- samodzielny `builds/kalkulator-obligacji.exe` (v1.2) z wykresami i testami PASS
- źródła w `src/` (CustomTkinter + matplotlib), test dymny `--self-test`

## Ograniczenia
- wyniki szacunkowe według modelu (stałe stopy, bez prowizji i inflacji poza modelem)
- model nie odwzorowuje dziennych zasad naliczania odsetek przy wykupie w trakcie okresu odsetkowego; wypłata następuje na koniec roku
- „opłata nie większa niż odsetki” liczona per obligacja; przy zerowych odsetkach opłata wynosi 0
- benchmarki to stałe średnie stopy zwrotu, nie prognoza
