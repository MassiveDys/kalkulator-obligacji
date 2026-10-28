# STATUS - kalkulator-obligacji

- **Stan:** gotowe (Wersja Web: wszystkie moduły + nowy ranking „Co wybrać?” opublikowane na GitHub Pages)
- **Ostatnia zmiana:** 2026-10-28
- **Następny krok:** Zbieranie opinii użytkownika po wdrożeniu rankingu (domyślnie 100 000 zł / 2 lata)

## Co działa
- Samodzielna aplikacja .exe dla Windows (builds/kalkulator-obligacji.exe, v1.2)
- Wersja Web na GitHub Pages: https://massivedys.github.io/kalkulator-obligacji/
  - Opcja wcześniejszego (przedterminowego) wykupu obligacji przed końcem zapadalności (np. EDO 10L po 5 latach)
  - Oficjalne stawki prowizji (od 1.09.2024: EDO 3 zł, ROD 3 zł, COI 2 zł, ROS 2 zł, TOS 1 zł, DOR 0,70 zł, ROR 0,50 zł)
  - Ochrona kapitału (nominał nie spada poniżej 100 zł/szt., prowizja ograniczona do odsetek)
  - Prawidłowe naliczanie podatku Belki (19% od zysku po odliczeniu opłaty) oraz wariant IKE (0% podatku)
  - Wpłata jednorazowa i dopłaty comiesięczne
  - Wykresy powrotu środków i benchmarki z S&P 500 / WIG20
  - **Ranking „Co wybrać?”** — jedna wpłata i okres (lata + miesiące), wszystkie serie: wykup naturalny, wcześniejszy wykup z opłatą lub rolowanie; karta zwycięzcy, tabela, wykres zysku netto, wnioski; przełączniki IKE i ROS/ROD
  - **Porównanie A/B** — dwa warianty obok siebie, tabela różnic w złotych i wykres wartości netto
  - **Portfel / drabina** — do 8 pozycji (seria + kwota + miesiąc startu), reinwestycja w tę samą serię, harmonogram wykupów, IRR
  - **Tryb rentierski** — stała wypłata miesięczna, ile lat wystarczy kapitału, wypłaty realne, podatek
  - **Wartości realne** — wartość netto i zysk w dzisiejszych złotówkach (dyskonto inflacją)
  - **Permalink stanu** — parametry wszystkich modułów (w tym rankingu) w URL i `localStorage`
  - **PWA/offline** — instalacja na telefonie, cache-first service worker (cache v6)
  - Weryfikacja: 39/39 testów silnika (`node tools/test-web.mjs`), 38/38 testów DOM (jsdom), 0 błędów w konsoli, HTTP 200

## Otwarte problemy
- Brak
