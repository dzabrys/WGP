# Edytor wizualny WGP

W panelu wybierz **Treści strony**. Zamiast listy pól zobaczysz stronę i narzędzia po prawej.

1. Wybierz stronę z listy u góry (także stronę dowolnego produktu).
2. Kliknij nagłówek lub tekst, aby zmienić go w narzędziach. Dwuklik pozwala pisać bezpośrednio na stronie. Enter kończy edycję, Shift+Enter dodaje wiersz, Escape ją anuluje. W polu tekstowym można również rozdzielać napis na wiersze.
3. Kliknij zdjęcie i wybierz inne z biblioteki albo prześlij własne.
4. Kliknij **Cały blok**, aby zaznaczyć większy fragment. Złap uchwyt **⠿**, przeciągnij i upuść w miejscu widocznym w podglądzie. Sąsiednie elementy robią miejsce już podczas ruchu; Escape anuluje przeciąganie. Możesz też użyć strzałek lub opcji **Przenieś do innego bloku**.
5. W **Wygląd i odstępy** zmienisz szerokość, wyrównanie, kolory, rozmiary i układ kolumn. **Telefon** pozwala ustawić osobne wartości dla małych ekranów; **Tablet** i **Komputer** pokazują pozostałe widoki.
6. **Dodaj element** dodaje sekcję, nagłówek, tekst, zdjęcie albo przycisk do zaznaczonego bloku. Bez zaznaczenia dodaje go na końcu treści strony.
7. **Cofnij / Ponów** działają podczas edycji bieżącej strony. Ukryte elementy znajdziesz w **Wszystkie elementy strony**. Możesz ponownie zaznaczyć taki blok i wyłączyć ukrycie.
8. **Podgląd** automatycznie zapisze edycję do podglądu. **Opublikuj zmiany** zapisuje i publikuje na dotychczasowej stronie. W historii zachowuje się wersja sprzed publikacji.

Nagłówek witryny i stopka też są widoczne i możliwe do edycji. Tytuł i opis w wyszukiwarce oraz wspólne dane kontaktowe są w zwijanych ustawieniach. Dane produktu (w tym ceny) nadal zmieniamy w **Produkty**; zaznaczenie jego karty daje skrót do edycji.

Przesuwanie używa normalnego układu strony, nie stałych współrzędnych ekranu. Blok może zmienić kolejność lub trafić do innego zgodnego kontenera. Główne obszary nagłówka, treści i stopki pozostają oddzielne. Kontrole formularza nie są swobodnie przebudowywane. Strona w edytorze ma wyłączone linki i skrypty publiczne, aby kliknięcie wybierało element. Gotową nawigację, karuzelę i formularz sprawdzamy w zwykłym podglądzie.

## Wybieranie i układ

- W **Wszystkie elementy strony** wpisz fragment tekstu, aby znaleźć go także wewnątrz zwiniętego pytania lub ukrytej sekcji. Edytor pokazuje taki element na czas edycji. Zaznaczenie innej części strony przywraca jego docelową widoczność.
- Zdjęcia w kartach oraz kolumny strony produktu przenoszą się ze swoim blokiem. Przyciski i krótkie fragmenty tekstu można nadal edytować osobno.
- Kolejność bloków jest wspólna dla urządzeń. Rozmiary i odstępy ustawione w widoku **Telefon** dotyczą tylko telefonu. Zmiana kolejności zachowuje rozpiętość kart i zdjęć w siatce.
- Strzałka przy pojedynczym ustawieniu usuwa tylko tę zmianę. Przywrócenie ustawień telefonu zachowuje wygląd komputera.
- **Większy podgląd** daje więcej miejsca na pracę; Escape zamyka go. Przełączenie urządzenia zachowuje zaznaczony element w widoku.

## Zapis i migracja

- Dane edytora są w `visual.pages` istniejącego dokumentu JSON: teksty, ścieżki zdjęć, style komputera i telefonu, nowe bloki oraz kolejność. Nie ma dodatkowej bazy ani zewnętrznej płatnej usługi.
- Modele są walidowane po stronie PHP. Nie zapisujemy dowolnego HTML, skryptów ani niekontrolowanego CSS. Tekst jest escapowany, zdjęcia pochodzą z biblioteki, adresy mają dozwolone schematy.
- Te same modele są stosowane przy renderowaniu PHP i eksporcie HTML do GitHub Pages. Nowe zdjęcia użyte przez edytor są dołączane do publikacji.
- Historia, kopia treści i **Pobierz dane do przeniesienia** zachowują modele. Standardowa migracja opisana w `CHMURA.md` przenosi je razem z kontami, obrazami i pozostałymi dokumentami.
- Przetestowano rzeczywisty eksport prywatnej paczki z SQLite i import do MariaDB 11.4.8: identyczne dokumenty, układ, zdjęcia, konta i historia; zmieniona strona renderuje się w nowej bazie.
- Paczka kodu z `tools/build-nazwa-package.cjs` zawiera kod PHP oraz zasoby panelu i edytora. Na nazwa.pl nadal wystarczy PHP + MariaDB; nie jest wymagany serwer Node ani osobny serwer aplikacyjny.

Inspiracja: [komponenty i model projektu GrapesJS](https://grapesjs.com/docs/modules/Components.html), [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API). Interakcja WGP korzysta z Pointer Events, aby ten sam uchwyt obsługiwał mysz i dotyk; dane pozostają w obecnym CMS.
