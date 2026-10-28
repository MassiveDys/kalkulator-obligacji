# CHANGELOG — kalkulator-obligacji

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
