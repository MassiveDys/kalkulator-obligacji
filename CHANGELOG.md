# CHANGELOG — kalkulator-obligacji

## [1.7.0] — 2026-10-28
- Dodano zakładkę **Ranking / „Co wybrać?”**: jedna wpłata, wybrany okres (lata + miesiące) i porównanie wszystkich serii obligacji.
- Ranking uwzględnia wykup naturalny, wcześniejszy wykup z oficjalną opłatą (podatek Belki po prowizji) oraz rolowanie kapitału i kuponów w tę samą serię; końcówka bez pełnego cyklu zostaje w gotówce.
- Dodano kartę rekomendacji (zwycięzca), tabelę rankingową (wartość netto, zysk, stopa roczna, tryb, opłata, podatek), poziomy wykres zysku netto i krótkie wnioski.
- Dodano przełączniki IKE, obligacji rodzinnych ROS/ROD, pola inflacji i stopy NBP oraz szybkie okresy (6 mies., 1, 2, 3, 5 lat).
- Nowy moduł `web/ranking.js`, funkcja `rankBonds` w `web/bonds.js` (horyzont w miesiącach, wykup końcowy), nowy typ wykresu kategorii w `charts.js`.
- Ranking zapisuje się w permalinku URL i `localStorage` (klucz `rk`).
- Testy: 39/39 silnika (`node tools/test-web.mjs`) i 38/38 testów DOM; publikacja na GitHub Pages.

## [1.6.0] — 2026-10-28
- Dodano zakładkę **Porównanie A/B**: dwa niezależne warianty (typ obligacji, tryb wpłat, kwota, horyzont, IKE, wcześniejszy wykup), wspólna inflacja i stopa NBP, tabela różnic w złotych i na wykresie.
- Dodano zakładkę **Portfel**: do 8 pozycji z różnymi seriami i datami zakupu (drabina), reinwestycja wykupów w tę samą serię, harmonogram wykupów, wartość netto, IRR, tabela roczna i dwa wykresy. Presety „drabina 4-letnia” i „czysty EDO”.
- Dodano zakładkę **Rentier**: symulacja stałej wypłaty miesięcznej z kapitału — ile lat wystarczy, łączne wypłaty, pozostały kapitał, podatek; wcześniejszy wykup z opłatą, gdy brakuje gotówki.
- Dodano **wartości realne** w kalkulatorze: kafelki wartości netto i zysku w dzisiejszych złotówkach (dyskonto inflacją, wpłaty osobno).
- Dodano **permalink stanu**: wszystkie parametry (także modułów) zapisują się w URL i `localStorage`; przyciski „Kopiuj link” i „Reset”.
- Dodano **PWA/offline**: manifest, ikony SVG i service worker cache-first; aplikację można zainstalować, działa bez internetu.
- Nowy wspólny moduł `ui.js` (formatowanie, stan, zakładki, schowek) i przepisane `charts.js` na rejestr wykresów liniowych/słupkowych.
- Testy: 23/23 silnika (`node tools/test-web.mjs`) i 30/30 testów DOM (jsdom) — bez błędów w konsoli.

## [1.5.0] — 2026-10-28
- Dodano opcję „Wcześniejszy wykup (przed terminem)” — wypłata na koniec horyzontu przed zapadalnością obligacji.
- Dodano opłaty za przedterminowy wykup wg listów emisyjnych (emisje od 1.09.2024): EDO/ROD 3 zł, COI/ROS 2 zł, TOS 1 zł, DOR 0,70 zł, ROR 0,50 zł, OTS 0 zł (bez odsetek).
- Opłata jest potrącana z odsetek, nie przekracza ich wysokości; kapitał 100 zł/szt. pozostaje chroniony; podatek Belki liczony od odsetek po opłacie.
- Dodano wiersz podsumowania z kwotą opłaty, kolumnę „Opłata wykupu” i znacznik „wykup” w tabeli oraz pozycję w eksporcie CSV.
- Wykresy pokazują zakończenie inwestycji w roku wcześniejszego wykupu.
- Zaktualizowano dokumentację i opublikowano na GitHub Pages.

## [1.4.0] — 2026-10-28
- Dodano tryb „Wpłata jednorazowa”: kwota początkowa (np. 10 000 zł) i horyzont, zakup obligacji w miesiącu 0; pola dopłat miesięcznych ukrywane, lata dopłat nieaktywne.
- Dodano benchmarki na wykresie wartości: S&P 500 (~10,2% rocznie) i WIG20 (~7,5% rocznie) przy identycznym planie wpłat.
- Dodano przełączniki widoczności benchmarków oraz opcję podatku Belki 19% od ich zysku.
- Dodano linię „Tryb wpłat” w eksporcie CSV i aktualizację opisów/legend.
- Zaktualizowano dokumentację i opublikowano zmiany na GitHub Pages.

## [1.3.0] — 2026-10-28
- Dodano wersję web (`web/`) w czystym HTML/CSS/JS: pełny port silnika `bonds.py`, 8 typów obligacji, scenariusze marży i inflacji, IKE, tryby wykupów, kafelki, tabela i eksport CSV.
- Dodano wykresy canvas bez zależności: drabina zapadalności oraz wartość oszczędności na tle wpłat.
- Dodano responsywny układ (320–1440 px) i obsługę klawiatury w formularzu.
- Opublikowano na GitHub Pages: https://massivedys.github.io/kalkulator-obligacji/ (workflow `.github/workflows/pages.yml`, źródło `web/`).
- Dodano `.gitignore` (buildy i cache poza repozytorium).

## [1.2.0] — 2026-10-28
- Dodano zakładkę „Wykresy” (matplotlib): terminarz zapadalności transz oraz wartość oszczędności vs wpłaty.
- Dodano tryb wykupów: „Reinwestuj wykupy” / „Wypłacaj na konto” (domyślnie wypłaty, zgodnie ze zrzutem referencyjnym).
- Wykresy odświeżają się po każdym obliczeniu i zmianie parametrów.
- Rozszerzono smoke test o tryb wypłat i sprawdzenie wykresów.
- Przebudowano EXE (39,19 MB) — matplotlib zwiększa rozmiar i czas startu.

## [1.1.0] — 2026-10-28
- Dodano rozwijane scenariusze marży (aktualna oferta MF, wysoka, średnia, niska 2018–2021).
- Dodano rozwijane scenariusze inflacji (cel NBP, bazowa, średnia 15 lat, podwyższona, wysoka).
- Wybór scenariusza uzupełnia pole liczbowe i przelicza wynik; własna wartość nadal możliwa.
- Dodano podpowiedź z opisem wybranego scenariusza.
- Przebudowano `builds\kalkulator-obligacji.exe` (18,16 MB) i rozszerzono smoke test.

## [1.0.0] — 2026-10-28
- Dodano aplikację GUI (CustomTkinter) z wyborem 8 typów obligacji i edycją parametrów.
- Dodano model miesięcznych dopłat, reinwestycji i horyzontu likwidacji.
- Dodano podatek Belki 19% oraz tryb IKE.
- Dodano kafelki podsumowania, tabelę roczną i eksport CSV.
- Zbudowano samodzielny plik `builds\kalkulator-obligacji.exe` (onefile, bez konsoli).
- Dodano tryb `--self-test` (raport `builds\smoke-test.txt`).
