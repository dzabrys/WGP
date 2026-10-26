# WGP: praca w chmurze i późniejsze przeniesienie

## Dwa adresy

- Publiczna strona: https://dzabrys.github.io/WGP/.
- Prywatny panel: adres portu 4180 konkretnego GitHub Codespace, zakończony `/panel/`.

GitHub Pages nie wykonuje PHP. Panel uruchamiamy tymczasowo w Codespaces, a jego przycisk „Opublikuj” wysyła wyrenderowane HTML, katalog i przesłane zdjęcia do `docs` w repozytorium `dzabrys/WGP`. GitHub Pages następnie aktualizuje stronę. Szkic i podgląd nie zmieniają publicznej witryny. Link „Otwórz stronę WGP” prowadzi do publicznej wersji.

Panel wymaga e-maila i hasła; nie ma obejścia logowania. Dodatkowo port Codespaces pozostaje prywatny, więc do otwarcia potrzebne jest konto GitHub właściciela. To rozwiązanie tymczasowe dla właściciela, a nie współdzielony hosting dla całego zespołu. Uśpiony Codespace trzeba uruchomić na https://github.com/codespaces. Limity i ewentualne koszty obliczeń oraz przechowywania zależą od konta GitHub.

### Pierwsze uruchomienie

1. Utworzyć Codespace z głównej gałęzi repozytorium WGP. Konfiguracja `.devcontainer` instaluje PHP z potrzebnymi rozszerzeniami i przygotowuje prywatną bazę SQLite.
2. Przenieść **prywatnie** paczkę „Pobierz dane do przeniesienia” z lokalnego panelu. Nie dodawać jej do repozytorium. W terminalu Codespaces wykonać `php hosting/bin/console.php transfer-import /prywatna/sciezka/dane.zip`. Nie uruchamiać `init`, jeśli importujemy konta.
3. Uruchomić `php hosting/bin/cloud.php start`. Port 4180 pozostawić jako **Private**. Na wejściu do panelu użyć tego samego konta przeniesionego w paczce.
4. Publikowanie korzysta z udostępnionego przez Codespaces `GITHUB_TOKEN`, ograniczonego do tego repozytorium. Tokenu nie wpisuje się do kodu ani ustawień przeglądarki. Lokalne uruchomienie może otrzymać `WGP_GITHUB_TOKEN` przez środowisko procesu.
5. Po kliknięciu „Opublikuj” poczekać na zakończenie budowy GitHub Pages. W razie błędu treści pozostają zapisane, a panel pozwala ponowić wysyłkę. Publikacja nigdy nie wymusza nadpisania historii Git.

Statystyki panelu dotyczą tylko instalacji PHP. Publicznych wyświetleń GitHub Pages nie doliczamy do tego licznika. Pełne statystyki zaczną zbierać się dla publicznej strony po przeniesieniu na nazwa.pl.

## Przeniesienie na nazwa.pl — jedna paczka kodu i jedna paczka danych

Szczegóły ustawień konta: [WDROZENIE.md](WDROZENIE.md).

1. Przed migracją na chwilę zakończyć edycję w panelu w chmurze. Z „Historia i kopie” pobrać **Pobierz dane do przeniesienia**. Zawiera szkic, opublikowaną treść, wszystkie przesłane zdjęcia, konta z chronionymi skrótami haseł, historię i statystyki. Nie zawiera aktywnych sesji ani tokenów i kluczy usług.
2. Zbudować aktualną paczkę kodu: `node tools/build-nazwa-package.cjs`. Wgrać ją na nazwa.pl, domenę testową skierować wyłącznie na katalog `public`.
3. Utworzyć MariaDB i prywatny `config.php` na podstawie przykładu. Ustawić produkcyjny adres HTTPS, dane MariaDB, nowy losowy sekret i klucze CAPTCHA. **`publication_target` pozostawić `server`**; usunąć ustawienia GitHub, `public_url` i `codespaces_proxy`. Odtąd publikacja aktualizuje stronę bezpośrednio na nazwa.pl.
4. Przesłać prywatną paczkę danych poza katalog WWW i wykonać przez SSH: `php bin/console.php transfer-import /prywatna/sciezka/dane.zip`. Import działa wyłącznie do instalacji bez kont; nie nadpisze istniejącego panelu. Nie uruchamiać wcześniej `init`. Ten sam login i hasło będą działać po migracji; trzeba zalogować się ponownie.
5. Sprawdzić zdjęcia, produkty i warianty, podgląd i publikację, formularz, CAPTCHA, konta oraz telefon. Dotychczasową witrynę i pocztę zachować do zakończenia testów.
6. Przełączyć domenę dopiero po sprawdzeniu kopii i możliwości powrotu. Rekordów poczty nie zmieniać przy podmianie samej strony. Po potwierdzeniu działania zatrzymać stary panel w Codespaces, aby nie prowadzić edycji dwóch niezależnych baz.

Kod i dane przenosi się osobno: aktualizacja kodu nie nadpisuje bazy. Prywatna paczka danych nie może trafić do publicznego GitHuba ani publicznego katalogu domeny. Oryginalne szablony CMS są w `hosting/templates`; `docs` jest publikowaną wersją statyczną, nie źródłem szablonów edytora.
