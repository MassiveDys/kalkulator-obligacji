# STATUS - kalkulator-obligacji

- **Stan:** gotowe (Wersja Web: wszystkie 3 kierunki rozwoju wdrożone i opublikowane na GitHub Pages)
- **Ostatnia zmiana:** 2026-10-28
- **Następny krok:** Zbieranie opinii użytkownika po wdrożeniu (porównywarka A/B, portfel/drabina, rentier, wartości realne, permalink, offline)

## Co działa
- Samodzielna aplikacja .exe dla Windows (builds/kalkulator-obligacji.exe, v1.2)
- Wersja Web na GitHub Pages: https://massivedys.github.io/kalkulator-obligacji/
  - Opcja wcześniejszego (przedterminowego) wykupu obligacji przed końcem zapadalności (np. EDO 10L po 5 latach)
  - Oficjalne stawki prowizji (od 1.09.2024: EDO 3 zł, ROD 3 zł, COI 2 zł, ROS 2 zł, TOS 1 zł, DOR 0,70 zł, ROR 0,50 zł)
  - Ochrona kapitału (nominał nie spada poniżej 100 zł/szt., prowizja ograniczona do odsetek)
  - Prawidłowe naliczanie podatku Belki (19% od zysku po odliczeniu opłaty) oraz wariant IKE (0% podatku)
  - Wpłata jednorazowa i dopłaty comiesięczne
  - Wykresy powrotu środków i benchmarki z S&P 500 / WIG20
  - **Porównanie A/B** — dwa warianty obok siebie, tabela różnic w złotych i wykres wartości netto
  - **Portfel / drabina** — do 8 pozycji (seria + kwota + miesiąc startu), reinwestycja w tę samą serię, harmonogram wykupów, IRR
  - **Tryb rentierski** — stała wypłata miesięczna, ile lat wystarczy kapitału, wypłaty realne, podatek
  - **Wartości realne** — wartość netto i zysk w dzisiejszych złotówkach (dyskonto inflacją)
  - **Permalink stanu** — parametry w URL i `localStorage`, „Kopiuj link” / „Reset”
  - **PWA/offline** — instalacja na telefonie, cache-first service worker
  - Weryfikacja: 23/23 testy silnika (`node tools/test-web.mjs`), 30/30 testów DOM (jsdom), 0 błędów w konsoli, HTTP 200

## Otwarte problemy
- Brak
