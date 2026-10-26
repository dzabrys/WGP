# WGP — Wielkie Gry Planszowe

Publiczna strona: https://dzabrys.github.io/WGP/

Repozytorium: https://github.com/dzabrys/WGP

## Panel w chmurze i publikowanie

Instrukcja: [hosting/CHMURA.md](hosting/CHMURA.md). Panel PHP można uruchomić w prywatnym GitHub Codespaces; „Opublikuj” aktualizuje publiczną wersję z `docs`. Oryginalne szablony edytora znajdują się w `hosting/templates`, a aktualną ofertę i katalog `cms-catalog.js` generuje baza CMS. Starszy `style-a1/product-catalog.js` jest zachowany dla zgodności; nie jest źródłem późniejszych zmian z panelu.

Migracja na nazwa.pl korzysta z paczki kodu i prywatnej paczki danych pobranej z panelu. Zachowuje produkty, zdjęcia, konta, historię i statystyki. Hasła, ich skróty, tokeny oraz prywatne paczki danych nigdy nie są dodawane do repozytorium.

## Panel zarządzania na nazwa.pl

W `hosting/` znajduje się rozszerzenie PHP z bazą MariaDB: katalog produktów, edycja treści i zdjęć, ustawienia wyglądu, statystyki wyświetleń, konta pracowników, szkice, publikacje i historia. Osobny lokalny podgląd działa na `http://127.0.0.1:4180/panel/`. Pełna instrukcja przygotowania konta i migracji: [hosting/WDROZENIE.md](hosting/WDROZENIE.md).

Paczka wdrożeniowa: `node tools/build-nazwa-package.cjs`. Wersja GitHub Pages z `docs` pozostaje statyczna; panel wymaga PHP i bazy. Konfiguracja z hasłami, sesje i przesłane obrazy mają pozostać w prywatnym katalogu poza publicznym katalogiem domeny. Instalator: `php hosting/bin/console.php init` z danymi konta przez stdin i konfiguracją wskazaną przez `WGP_CONFIG`; produkcyjna paczka używa `private/config.php`.

GitHub Pages publikuje cały katalog `docs` z gałęzi `main`, zgodnie z wersją lokalną na porcie 4176.

## Skalowanie dużych ekranów

Rozdzielczość 1920 × 1080 pozostaje punktem odniesienia. Wymiary elementów i typografia używają jednostek `rem` przy bazie 16 px. Arkusz `desktop-scale.css` zwiększa tę bazę dopiero powyżej 1920 px szerokości: przy 2560 px wynosi ona 21,33 px, dzięki czemu treść, odstępy i przyciski rosną proporcjonalnie o jedną trzecią. Skala jest ograniczona do dwukrotnej przy 3840 px i szerszych ekranach. Progi układów mobilnych pozostają w pikselach; nie stosujemy CSS `zoom` ani transformacji całej strony. Wymiary pozycjonowanych okienek formularza uwzględniają tę samą bazę.

## Potwierdzona oferta klienta — 23.10.2026

Lokalny katalog porównano z `/nasze-gry/`, `/oferta/` i `/realizacje-indywidualne/` na wielkiegryplanszowe.pl. Aktualna lista w `docs/style-a1/product-catalog.js` zawiera 12 gotowych plansz oraz 5 innych formatów/projektów. Formularz i strony szczegółów korzystają z tej samej listy. `npm run check:offer` sprawdza jej spójność, warianty i ceny. Dodatkowy test treści wiadomości: `node work/check-verified-contact.cjs`.

Porównanie zapisano w `work/client-offer-audit.json`; kopia poprzedniej wersji jest w `work/client-offer-backup/`. Jednorazowa migracja `tools/align-client-offer.cjs` odmawia ponownego uruchomienia przy istniejącej kopii. Starszy `work/install-product-offers.cjs` nie stanowi już aktualnego źródła listy produktów i nie należy go używać do odtwarzania katalogu. Bieżąca oferta jest publikowana razem z całym katalogiem `docs` w serwisie WGP.

## Informacje robocze o dokumentach

Dokumenty serwisu znajdują się na `/polityka-prywatnosci.html`, `/polityka-cookies.html`, `/regulamin.html`, `/dane-firmy.html` i `/dostepnosc.html`. Dane kontaktowe zweryfikowano w witrynie klienta. Niepotwierdzone dane rejestrowe oraz proponowane okresy przechowywania i terminy odpowiedzi usunięto z widoku strony; notatki pozostają lokalnie poza publikowanym katalogiem. Strony dokumentów zachowują `noindex` i nie są dodane do mapy witryny.

Serwer lokalny może korzystać ze zmiennych `PORT` (domyślnie 4175) oraz `LOCAL_ENV_FILE` (ścieżka do prywatnego pliku konfiguracji; domyślnie `.env.local`). Podgląd uruchomiono na porcie 4176. Na localhost formularz używa lokalnego API CAPTCHA; poza localhost zachowuje adres backendu z metatagu. Odbiorcę wiadomości w tym podglądzie zmieniono na adres biura.

Nagłówki bezpieczeństwa i obsługa 404 zostały dodane do serwera lokalnego; nie skonfiguruje to nagłówków na GitHub Pages. Przed docelowym wdrożeniem należy przenieść ustawienia do konfiguracji wybranego hostingu, uwzględnić prefiks ścieżki w stronie 404 i wykonać testy przeglądarkowe, w tym CAPTCHA i dostępność. Pełny audyt dostępności oraz weryfikacja mechanizmów cookies w przeglądarce nie zostały wykonane.

Nowa wersja strony, oddzielona od Staz1. Aktualne strony bez numeru 1, obrazy WebP, formularz krok po kroku i wspólna stopka.

GitHub Pages: folder docs, gałąź main.

Lokalnie: npm start. Opcjonalne klucze Turnstile w .env.local (nigdy w Git). GitHub Pages jest hostingiem statycznym; prawdziwa weryfikacja Turnstile wymaga osobnego backendu.

## CAPTCHA po publikacji

GitHub Pages udostępnia statyczne pliki z `docs/`. Weryfikację Turnstile obsługuje osobny Worker: `backend/worker.mjs`.

W prywatnym pliku konfiguracyjnym poza repozytorium ustaw `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (szablon Edit Cloudflare Workers), `TURNSTILE_SITEKEY` i `TURNSTILE_SECRET_KEY`. Nie zapisuj sekretów w kodzie ani w katalogu docs.

Dodaj `dzabrys.github.io` do dozwolonych hostname widgetu Turnstile. Następnie wykonaj `node tools/deploy-captcha.cjs <ścieżka-do-prywatnego-pliku-env>`. Skrypt wdroży Worker, ustawi sekret i wpisze publiczny adres backendu do kontakt.html. Zacommituj zmieniony kontakt.html i wypchnij do main.

Testy backendu: `node backend/worker.test.mjs`. Limit prób jest lokalny dla instancji Workera; nie stanowi globalnego limitu otrzymanych e-maili. Strona przygotowuje wiadomość w poczcie użytkownika, a użytkownik sam potwierdza wysłanie.


Strona: https://dzabrys.github.io/WGP/
Backend CAPTCHA: https://staz2-captcha.dzabrys-staz2.workers.dev/
Kod i sekret zostały wdrożone do Cloudflare; sekret pozostaje poza repozytorium.

## Optymalizacja strony głównej

Po `npm install` uruchom `npm run optimize:home` po zmianie HTML strony głównej, jej stylów lub klas dodawanych przez JavaScript. Skrypt zachowuje kolejność siedmiu źródłowych arkuszy CSS, usuwa reguły wymagające klas nieobecnych na tej stronie i w skryptach, osadza kompletny CSS w HTML oraz generuje warianty AVIF/WebP głównego zdjęcia. Mobilny kadr zachowuje ustawienie `object-position:70% center`. Wspólne źródłowe arkusze pozostają dostępne dla pozostałych podstron.

`npm run check:home` sprawdza odnośniki, zasoby, ścieżki fontów w osadzonym CSS, rozmiary srcset oraz kolejność odczytów i animacji. Nie zastępuje wizualnego sprawdzenia strony ani ponownego testu PageSpeed na telefonie. Nagłówkiem Cache-Control zarządza GitHub Pages.
