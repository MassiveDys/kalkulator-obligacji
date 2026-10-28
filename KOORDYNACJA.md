# KOORDYNACJA PROJEKTU: kalkulator-obligacji

## Cel
Aplikacja desktopowa (.exe) dla Windows: Kalkulator Polskich Obligacji Skarbowych.
Wzorowana na załączonym zrzucie ekranu (nowoczesny interfejs GUI).

## Główne wymagania
1. **Parametry wpłat i horyzontu**:
   - Miesięczna dopłata (zł) - np. 400 zł
   - Liczba lat dopłat - np. 10 lat
   - Horyzont inwestycji / moment likwidacji - np. 20 lat (umożliwia pełne przejście cyklu zapadalności dla wszystkich transz obligacji)
2. **Wybór rodzaju obligacji skarbowych**:
   - EDO (10-letnie, indeksowane inflacją, roczna kapitalizacja)
   - COI (4-letnie, indeksowane inflacją, roczna wypłata odsetek)
   - TOS (3-letnie, stałe oprocentowanie)
   - DOR (2-letnie, stopa NBP + marża)
   - ROR (1-roczne, stopa NBP)
   - OTS (3-miesięczne, stałe)
   - Rodzinne: ROS (6-letnie) i ROD (12-letnie)
   - Możliwość edycji parametrów (oprocentowanie 1. roku, marża, założona średnia inflacja)
3. **Podatki**:
   - Opcja IKE (brak podatku Belki 19%) / zwykłe konto (podatek Belki 19% pobierany przy zapadalności/wypłacie)
4. **Prezentacja wyników**:
   - Kafelki podsumowujące (Suma wpłat, Liczba obligacji, Wartość brutto na koniec, Wartość netto, Zysk netto, Średnia stopa netto / rok)
   - Szczegółowa tabela przebiegu rok po roku (wpłaty w danym roku, naliczone odsetki, wartość portfela na koniec roku)
5. **Format**:
   - Samodzielny plik .exe dla Windows (Python + CustomTkinter / Tkinter + PyInstaller).

## Podział zadań i zależności
- **Zadanie 1 [Coderexe]**: Napisanie kodu źródłowego kalkulatora w src/ z GUI (np. CustomTkinter), implementacja logiki obliczeniowej, obsługa wyboru obligacji i horyzontu (lata wpłat vs lata do likwidacji), zbudowanie pliku .exe w uilds/kalkulator-obligacji.exe.
  - Status: Gotowe (zbudowano kalkulator-obligacji.exe, 18,16 MB)
- **Zadanie 2 [Codertest]**: Testy QA gotowego pliku .exe (uruchomienie, obliczenia, weryfikacja scenariusza 10 lat wpłat / 20 lat likwidacji, IKE, raport PASS/FAIL).
  - Status: Gotowe (Testy QA zakończone z wynikiem PASS 9/9, RAPORT-TESTOW.md)


## Usprawnienia v1.1: Presety i scenariusze historyczne
- **Wymaganie użytkownika**:
  1. Marża ponad inflację: menu rozwijane z realnymi scenariuszami na podstawie danych historycznych/ofert MF + zachowanie wpisywania ręcznego.
  2. Założona średnia inflacja: menu rozwijane z realnymi scenariuszami na podstawie danych historycznych (cel NBP 2,5%, średnia historyczna ~3,5%, podwyższona 5,0%, wysoka 8,0%) + zachowanie wpisywania ręcznego.
- **Zadanie [Coderexe]**: Aktualizacja GUI i logiki w src/, dodanie podpowiedzi/scenariuszy w comboboxach lub obok pól tekstowych, przebudowa uilds/kalkulator-obligacji.exe.

- **Status v1.1 [Coderexe]**: Gotowe — wdrożono presety i przebudowano EXE.
- **Zadanie v1.1 [Codertest]**: Testy regresyjne i weryfikacja nowych list scenariuszy oraz dynamicznego przeliczania.


## Usprawnienia v1.2: Wykresy przepływów i zapadalności
- **Wymaganie użytkownika**:
  Wykres pokazujący mechanizm zapadania i powrotu obligacji: np. przy 10 latach wpłat, po 10 latach pierwsze comiesięczne transze obligacji wracają do inwestora (kapitał + odsetki), i tak co miesiąc/rok aż do 20. roku po rozpoczęciu wpłat (ostatnia transza).
- **Zadanie [Coderexe]**: Wdrożenie wykresu (np. matplotlib wkomponowany w okno aplikacji lub dedykowana zakładka 'Wykres'), prezentującego harmonogram powrotu środków (wypłaty kapitału i zysków) oraz krzywą wartości majątku w czasie (faza akumulacji 0-10 lat vs faza powrotu/wypłat 10-20 lat), następnie rebuild .exe.

- **Status v1.2 [Coderexe]**: Gotowe — wdrożono zakładkę z wykresami matplotlib, tryb wypłat vs reinwestycji, przebudowano EXE (39,19 MB).
- **Zadanie v1.2 [Codertest]**: Testy funkcjonalne nowej zakładki z wykresami, odświeżania po zmianie parametrów oraz przełącznika trybu wykupów.


## Zadanie: Wersja Webowa i publikacja na GitHub Pages
- **Wymagania użytkownika**:
  1. Stworzenie wersji webowej programu kalkulator obligacji.
  2. Publikacja na GitHub Pages tak, aby użytkownik otrzymał gotowy link do wysłania komuś innemu.
- **Zadanie [Coderweb]**:
  - Implementacja wersji przeglądarkowej w D:\openbot\projects\kalkulator-obligacji\web\ (czysty HTML/CSS/JS, wykresy np. Chart.js lub Canvas/SVG, pełna logika finansowa z src/bonds.py).
  - Publikacja repozytorium na GitHub i konfiguracja GitHub Pages.
  - Zwrócenie działającego publicznego linku URL do strony.
