# CHANGELOG — kalkulator-obligacji

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
