# WGP: panel, baza i przeniesienie do nazwa.pl

Stan przygotowania: 26.10.2026. Rozszerzenie obecnej strony, z zachowaniem jej szablonów. Publiczne GitHub Pages nadal publikuje wersję statyczną z `docs`; nowy panel działa przez PHP i wymaga hostingu obsługującego backend.

Aktualny wariant przejściowy: [panel w Codespaces, publikowanie na GitHub i migracja całych danych](CHMURA.md). Do przeniesienia istniejącej instalacji używać `transfer-import` **przed tworzeniem kont**, zamiast punktu 6 poniżej. Paczka z panelu zachowuje również konta, historię, statystyki i obrazy. Po przeniesieniu ustawić `publication_target=server`; konfiguracji proxy Codespaces ani tokenu GitHub nie przenosimy.

## Co działa w panelu

- Import 17 produktów i 13 głównych stron z obecnej witryny.
- Dodawanie i powielanie produktów, zmiana nazwy, opisów, zdjęcia, parametrów i wariantów cenowych.
- Wybór działu katalogu i list „Szkoły” / „Firmy”, ukrywanie produktu.
- Automatyczna strona nowego produktu i przekazywanie jego wariantów do formularza kontaktowego.
- Edycja tekstów i zdjęć głównych stron, tytułów i opisów wyszukiwarki, wspólnych danych kontaktowych.
- Zmiana głównych kolorów, tła, kroju pisma, zaokrągleń i trzech produktów w karuzeli. To edycja określonych ustawień, nie dowolny kreator układu „przeciągnij i upuść”.
- Biblioteka istniejących obrazów, przesyłanie JPG/PNG/WebP, przygotowanie pliku WebP do 2000 px.
- Szkic → podgląd → publikacja. Wersja sprzed każdej publikacji zapisywana w historii; przywracanie trafia najpierw do szkicu.
- Eksport/import kopii treści; osobne konta administratora, redaktora i osoby z samym podglądem.
- Prawdziwe liczniki wyświetleń podstron, źródeł odesłań i typów urządzeń. Statystyki dotyczą tej instalacji, nie historycznego ruchu GitHub.

Licznik wyświetleń nie rozpoznaje różnych osób. Odświeżenie jest kolejnym wyświetleniem. Nie zapisuje IP, identyfikatora odwiedzającego ani ciasteczka analitycznego. Podgląd szkicu, rozpoznane roboty i wizyty z ciasteczkiem panelu są pomijane. Zestawienia bazują na danych żądania, więc blokady, roboty i brak informacji o źródle mogą wpływać na ich dokładność. Dane zbiorcze można czyścić po 90 dniach poleceniem `cleanup`.

Lista odebranych zapytań oraz zaawansowana analityka Matomo nie są częścią tego etapu. Dotychczasowy formularz nadal przygotowuje wiadomość do poczty lub schowka. Nie nazywamy kliknięcia „wysłanym e-mailem”.

## Z oferty CloudHosting Start wykorzystamy

| Funkcja | Zastosowanie |
|---|---|
| PHP 8.3 i MariaDB 11.4 / 10.11 | Panel, katalog, szkice, publikacje, konta, statystyki. |
| 100 GB przestrzeni | Wspólne miejsce na WWW, zdjęcia, bazy i pocztę; nie oddzielna baza 100 GB. Rozmiar bazy rezerwuje się w panelu dostawcy. |
| 8 GB RAM | Parametr usługi. Nie oznacza dowolnego przydziału całej pamięci jednemu skryptowi; obowiązują ustawienia i limity PHP. |
| SSH | Wgranie, uruchomienie instalatora i późniejsze aktualizacje. |
| mod_rewrite / `.htaccess` | Obsługa dotychczasowych adresów `.html` przez PHP oraz nowych stron produktów. |
| SSL | HTTPS strony i bezpieczne sesje panelu. Certyfikat i jego zakres trzeba sprawdzić w swoim zamówieniu. |
| CRON | Opcjonalne codzienne usuwanie starych liczników; panel nie wymaga stale uruchomionego procesu. |
| Statystyki hostingu | Dodatkowa kontrola zasobów i ruchu, niezależnie od panelu WGP. |
| Kopia zapasowa danych | Odtwarzanie całej bazy i zdjęć. Sprawdzić aktywację, zakres, retencję oraz cenę tej usługi w wybranym zamówieniu. |

Serwer aplikacyjny Node.js nie jest potrzebny do tej implementacji. Node służy tylko lokalnie do budowania paczki; nie trzeba uruchamiać go na koncie hostingowym.

Źródła dostawcy: [oferta](https://www.nazwa.pl/hosting/), [dodanie bazy i rezerwacja miejsca](https://www.nazwa.pl/pomoc/baza-wiedzy/dodawanie-bazy-danych-na-serwerze/), [ustawienia PHP i serwera](https://www.nazwa.pl/pomoc/baza-wiedzy/ustawienia-serwera/), [mod_rewrite](https://www.nazwa.pl/pomoc/baza-wiedzy/mod_rewrite/), [SSL](https://www.nazwa.pl/pomoc/baza-wiedzy/czym-jest-certyfikat-ssl-i-jak-go-uruchomic/), [CRON](https://www.nazwa.pl/pomoc/baza-wiedzy/harmonogramy-zadan-cron/), [statystyki](https://www.nazwa.pl/pomoc/baza-wiedzy/statystyki-odwiedzin-www/), [zarządzanie i kopie bazy](https://www.nazwa.pl/pomoc/baza-wiedzy/zarzadzanie-baza-danych/).

## Wymagania PHP

PHP 8.3+, PDO MySQL, mbstring, DOM/libxml, GD z WebP, fileinfo, OpenSSL, cURL i sesje. Warto ustawić `upload_max_filesize=6M`, `post_max_size=7M` i co najmniej 256 MB pamięci PHP. Aplikacja ogranicza pojedynczy obraz do 5 MB / 24 mln pikseli, a zapis treści do 2 MB. Katalog danych musi być zapisywalny dla użytkownika PHP i niedostępny przez WWW.

Lokalnie sprawdzono PHP 8.3.36 i prawdziwą MariaDB 11.4.8. Podgląd użytkownika używa SQLite, obsługiwanej przez tę samą warstwę PDO. Wdrożenie w nazwa.pl nadal wymaga testu konkretnego konta, w tym reguł `.htaccess`, HTTPS, dostępu do bazy i zapisu plików. Test lokalny nie jest dowodem ukończonej instalacji u dostawcy.

## Układ paczki

```text
wgp/
  public/                  <- tylko na ten katalog kierujemy domenę
    index.php
    .htaccess
    assets/
    style-a1/
    panel/
  private/                 <- poza publicznym katalogiem domeny
    config.example.php
    config.php             <- tworzymy dopiero na serwerze, zawiera sekrety
    templates/             <- szablony dotychczasowej strony
    data/                  <- sesje i przesłane obrazy
  app/                     <- kod PHP i początkowy import treści
  bin/console.php
  manifest.json
```

Paczka nie zawiera haseł, lokalnych baz ani kont testowych. Budowanie: `node tools/build-nazwa-package.cjs`. Narzędzie tworzy nowy katalog w `work` i nie nadpisuje poprzedniej paczki. Gotowego katalogu nie należy udostępniać w całości przez WWW — domena ma wskazywać wyłącznie `public`.

## Kolejność przeniesienia

1. **Zabezpieczyć obecną witrynę.** Zrobić kopię plików WordPressa, obecnej bazy i ustawień domeny; zachować możliwość powrotu. Nie usuwać jej w trakcie testów.
2. **Przygotować osobny katalog WGP i adres testowy.** Najpierw instalacja bez kierowania głównej domeny na nowe pliki. Docelowo katalog domeny: `wgp/public`; w CloudHosting Panel ustawienie `DOCUMENT_ROOT` ma odpowiadać katalogowi domeny.
3. **Utworzyć bazę MariaDB.** CloudHosting Panel → BAZY DANYCH → Dodaj bazę danych. Zanotować rzeczywisty host, pełną nazwę bazy i użytkownika z panelu. Do początkowego katalogu nie trzeba rezerwować 100 GB. Nadać użytkownikowi prawa do tej bazy.
4. **Wgrać paczkę** przez kanał dostępu udostępniony na koncie, zachowując strukturę i plik `.htaccess`. Sprawdzić wyłączone indeksowanie katalogów.
5. **Skonfigurować PHP i połączenie.** Skopiować `private/config.example.php` do `private/config.php`; wpisać docelowy adres HTTPS, DSN MariaDB, dane dostępu i losowy sekret co najmniej 64 znaki hex. Przykładowe wartości DSN są nazwami do zastąpienia, nie gotowymi danymi konta. Hasła pozostają poza Git i katalogiem publicznym.
6. **Zainstalować bazę i pierwsze konto przez SSH.** Uruchomić `php bin/console.php init`, podając JSON z `email`, `name`, `password` na standardowym wejściu. Hasło nie powinno występować w argumentach komendy ani historii powłoki. Instalator nie nadpisze istniejącego konta. Najbezpieczniej podać dane przez tymczasowy plik o uprawnieniach 600 poza WWW, odczytać go przez stdin i usunąć po instalacji. Jeśli SSH używa innej wersji PHP niż WWW, wskazać właściwą ścieżkę interpretera zgodnie z panelem dostawcy.
7. **Włączyć SSL i sprawdzić logowanie.** Tryb produkcyjny wymaga HTTPS i zgodności hosta z `base_url`. Właściwy adres testowy trzeba też ustawić w konfiguracji, zanim otworzymy panel.
8. **CAPTCHA formularza.** W konfiguracji wpisać `turnstile_sitekey` i `turnstile_secret` dla widgetu, w którym dozwolona jest właściwa domena. Nowy backend PHP weryfikuje token po stronie serwera, host i akcję `contact`. Brak kluczy w produkcji blokuje potwierdzenie zamiast przepuszczać formularz. Klucze testowe działają wyłącznie w lokalnym trybie rozwojowym. Na GitHub dotychczasowy Worker działa osobno i nie jest tu zmieniany.
9. **Sprawdzić scenariusze:** dodać produkt, zapisać szkic, obejrzeć go, opublikować, wybrać wariant w kontakcie, wrócić do poprzedniej publikacji, przesłać zdjęcie, sprawdzić konto redaktora i konto tylko do podglądu. Potwierdzić poprawność strony głównej, szkół, firm, całej oferty, stopki oraz urządzeń mobilnych.
10. **Przygotować przekierowania ze starych adresów WordPressa.** Przykładowe mapowanie do weryfikacji: `/nasze-gry/` → `/wielkie-gry-planszowe.html`, `/realizacje-indywidualne/` → `/gry-na-zamowienie.html`, `/kontakt/` → `/kontakt.html`, `/oferta/` → `/oferta.html`. Najpierw porównać pełną listę starych podstron. Nie przekierowywać wszystkich adresów w ciemno na stronę główną.
11. **Przełączyć domenę dopiero po testach.** Jeśli pozostaje na tym samym serwerze, może wystarczyć zmiana przypisanego katalogu. Jeśli zmieniamy serwer, przygotować DNS zgodnie z rzeczywistym kontem. Zachować rekordy poczty MX/SPF/DKIM/DMARC.
12. **Po przełączeniu:** sprawdzić kanoniczny adres www/bez www, HTTPS, 404, mapę witryny, formularz, kopie bazy i plików. Aplikacja generuje `sitemap.xml` i `robots.txt` dla skonfigurowanej domeny. Panel i podglądy szkicu są wyłączone z indeksowania.

Opcjonalny CRON raz dziennie: `php /rzeczywista/sciezka/wgp/bin/console.php cleanup`. Pełną ścieżkę należy odczytać z konta. To krótkie zadanie porządkowe; nie wymaga serwera aplikacyjnego ani demona.

## Codzienna obsługa

### Jeśli przed przeniesieniem zmienialiśmy coś lokalnie

Z lokalnego panelu pobrać aktualną kopię treści. Nową instalację na MariaDB utworzyć instalatorem, następnie wczytać tę kopię w „Historia i kopie”. Przenieść również pliki z lokalnego katalogu `work/cms-local/data/media` do serwerowego `private/data/media`, zachowując ich nazwy. Sam eksport JSON nie zawiera obrazów. Po sprawdzeniu szkicu opublikować go w nowym środowisku. Konta produkcyjne utworzyć osobno; lokalnych sesji i kont testowych nie przenosimy. Jeśli istotne są już zebrane statystyki i dziennik pracy, przeniesienie tych tabel wymaga dodatkowego eksportu danych, nie samej kopii treści.

### Praca w panelu

1. Otworzyć `/panel/` i zalogować się na własne konto.
2. Wybrać skrót „Dodaj produkt”, „Zmień treść” lub „Odśwież wygląd”.
3. Zapisać szkic (`Ctrl+S` / `Cmd+S`), obejrzeć podgląd, opublikować.
4. `Alt+N` otwiera dodanie produktu. „Powiel” pozwala zacząć od podobnej gry.

Redaktor przygotowuje szkic; administrator publikuje i nadaje dostępy. Osoba z samym podglądem sprawdza statystyki. Zmiany haseł przez CLI unieważniają wcześniejsze sesje. Odzyskanie dostępu: `php bin/console.php reset-password`, dane przekazane przez stdin jak podczas instalacji.

## Kopie i aktualizacje

Eksport z panelu zawiera treści, nie całą instalację. Pełna kopia obejmuje **bazę MariaDB**, **private/data/media**, **private/config.php**, szablony i kod. Kopie z hasłami przechowywać w chronionym miejscu. Utrzymanie hostingu, aktualizacje i własny kod panelu nie są objęte bezpłatnym wsparciem producenta CRM — to własne rozszerzenie WGP.

Przed podmianą szablonów po późniejszych zmianach projektu trzeba porównać mapowanie edytowanych fragmentów w `app/seed.json`. Nie regenerować importu po to, by nadpisać treści pracowników. Zmiany struktury szablonów wymagają kontrolowanej migracji, ponieważ edytor korzysta z ustalonej mapy elementów strony.
