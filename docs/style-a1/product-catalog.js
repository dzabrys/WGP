/* Product names, descriptions and prices shared by the offer and contact form.
 * Sources: https://wielkiegryplanszowe.pl/nasze-gry/ and /oferta/ (checked 2026-10-23).
 * Prices are per set. An individual quote has no invented numeric price.
 */
((factory) => {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  else window.WGPCatalog = catalog;
})(() => {
  const products = [
  {
    "id": "gra-skarb-piratow",
    "url": "gra-skarb-piratow.html",
    "name": "Skarb piratów",
    "image": "assets/oferta-skarb-piratow.webp?v=aef9618745db",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Zostań piratem i przemierzaj Wyspę Skarbów! Zawodnicy wcielają się w rolę piratów poszukujących skarbu. W trakcie poszukiwań na graczy czeka wiele przeszkód (pól specjalnych) utrudniających szybkie dotarcie do skarbu. Wygrywa ten, który jako pierwszy dotrze do skrzyni ze skarbem.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2+"
      ],
      [
        "Czas",
        "15–30 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania."
  },
  {
    "id": "gra-zostan-kierowca",
    "url": "gra-zostan-kierowca.html",
    "name": "Zostań kierowcą",
    "image": "assets/oferta-zostan-kierowca.webp?v=3e185f9dd963",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Poznaj zasady ruchu drogowego! Edukacyjna gra „Zostań kierowcą” ma na celu zapoznanie graczy z podstawowymi zasadami ruchu drogowego, znakami drogowymi oraz niebezpiecznymi sytuacjami, które mogą wydarzyć się na drodze. Gracze wcielają się w rolę kierowców, których zadaniem jest bezpieczne dotarcie do mety.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2–6+"
      ],
      [
        "Czas",
        "15–30 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania."
  },
  {
    "id": "gra-segreguj-smieci",
    "url": "gra-segreguj-smieci.html",
    "name": "Segreguj śmieci",
    "image": "assets/oferta-segreguj-smieci.webp?v=401c3922e3d1",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Edukacyjna gra ucząca segregowania odpadów! Gracze poruszają się po planszy, na której umieszczone są pola z pytaniami dotyczącymi segregacji odpadów oraz dobrymi i złymi nawykami segregowania śmieci. Wygrywa gracz, który pierwszy dotrze do mety.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2–6+"
      ],
      [
        "Czas",
        "20–30 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania."
  },
  {
    "id": "gra-farmer",
    "url": "gra-farmer.html",
    "name": "Farmer",
    "image": "assets/oferta-farmer.webp?v=2608f655fd15",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Poznaj życie na wsi! Gracze poruszając się po planszy spotykają na swej drodze zwierzęta, które mają dla nich różne zadania. Wygrywa ten który jako pierwszy dotrze do mety.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2–6+"
      ],
      [
        "Czas",
        "15–30 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania."
  },
  {
    "id": "gra-wyscig",
    "url": "gra-wyscig.html",
    "name": "Wyścig",
    "image": "assets/oferta-wyscig.webp?v=ed2427098923",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Zostań kierowcą wyścigowym! Gracze wcielają się w rolę kierowców wyścigowych, którzy ścigając się natrafiają na liczne niespodzianki rozmieszczone na polach specjalnych toru wyścigowego. Wygrywa ten, który jako pierwszy dotrze do mety.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2–6+"
      ],
      [
        "Czas",
        "10–20 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania."
  },
  {
    "id": "gra-niebezpieczna-siec",
    "url": "gra-niebezpieczna-siec.html",
    "name": "Niebezpieczna Sieć",
    "image": "assets/verified-niebezpieczna-siec.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Złap zasady, zanim sieć wciągnie Ciebie! Połącz halloweenową zabawę z nauką bezpieczeństwa w internecie! W tej wielkoformatowej grze uczestnicy stają się żywymi pionkami i próbują wydostać się z cyfrowej pajęczyny. Przemierzając spiralną trasę, odpowiadają na pytania o fałszywe profile, podejrzane linki, ochronę danych i dezinformację. Poprawna odpowiedź pozwala rzucić kostką i ruszyć dalej, a kolorowe portale mogą przybliżyć graczy do wyjścia lub cofnąć ich w głąb sieci. Wygrywa gracz lub drużyna, która pierwsza dotrze do METY! Zabawa, która uczy i wspiera realizację nowej podstawy programowej. Gra rozwija kompetencje cyfrowe, krytyczne myślenie, współpracę i sprawczość. Wspiera realizację wybranych celów nowej podstawy programowej związanych z budowaniem odporności na zagrożenia cyfrowe. Uczestnicy uczą się chronić prywatność, sprawdzać wiarygodność informacji i szukać pomocy w niepokojących sytuacjach. To propozycja na lekcje, zajęcia profilaktyczne oraz wydarzenia halloweenowe w szkołach, bibliotekach i domach kultury.",
    "facts": [
      [
        "Klasy",
        "1–8"
      ],
      [
        "Drużyny",
        "2–6 lub gra indywidualna"
      ],
      [
        "Czas",
        "Zależny od liczby uczestników"
      ]
    ],
    "included": "Plansza z 30 polami i trzema parami portali, kostka XXL, sześć szarf, dziesięć szpilek, instrukcja z 50 pytaniami i odpowiedziami oraz zaświadczenie o celach edukacyjnych.",
    "material": "Materiał z czarnym spodem, przystosowany do użytkowania w plenerze. Rozmiary wskazane przy tej grze: 3 × 3, 4 × 4 lub 5 × 5 m."
  },
  {
    "id": "gra-chinczyk",
    "url": "gra-chinczyk.html",
    "name": "Chińczyk",
    "image": "assets/verified-chinczyk.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Doskonała gra drużynowa! Plansza do gry w Chińczyka. W wielkiej wersji tej gry to gracze są pionkami na planszy.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "4–16"
      ],
      [
        "Czas",
        "30–60 min"
      ]
    ],
    "included": "Plansza, kostka XXL, 16 szarf i szpilki do mocowania.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania.",
    "source": "https://wielkiegryplanszowe.pl/nasze-gry/"
  },
  {
    "id": "gra-droga-strachu",
    "url": "gra-droga-strachu.html",
    "name": "Droga strachu",
    "image": "assets/verified-droga-strachu.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Pełna humoru gra ruchowa! Podstawową zasadą jest jak najszybsze dotarcie do mety. Gracze mają do pokonania pola z zadaniami typu: „MASZERUJ JAK ROBOT”, „SKACZ JAK ŻABA”, „ZRÓB NAJSTRASZNIEJSZĄ MINĘ”itp. Doskonała zabawa gwarantowana!",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2–6+"
      ],
      [
        "Czas",
        "15–30 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania.",
    "source": "https://wielkiegryplanszowe.pl/nasze-gry/"
  },
  {
    "id": "gra-zabki",
    "url": "gra-zabki.html",
    "name": "Żabki",
    "image": "assets/verified-zabki.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Pełna humoru gra ruchowa! Zadaniem graczy jest jak najszybsze dostanie się na drugi brzeg rzeki. Rozgrywka odbywa się przy pomocy kostki z figurami geometrycznymi. Dzieci poprzez zabawę poznają figury geometryczne, kolory, a także poprawiają sprawność fizyczną.",
    "facts": [
      [
        "Wiek",
        "2+"
      ],
      [
        "Gracze",
        "2–3"
      ],
      [
        "Czas",
        "5 min"
      ]
    ],
    "included": "Plansza, wielka kostka z figurami geometrycznymi i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania.",
    "source": "https://wielkiegryplanszowe.pl/nasze-gry/"
  },
  {
    "id": "gra-mega-twist",
    "url": "gra-mega-twist.html",
    "name": "Mega twist",
    "image": "assets/verified-mega-twist.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Doskonała gra ruchowa! Zadaniem uczestników jest umieszczenie dłoni lub stopy na wskazanym przez „zegar” kolorze pola. Gra przeznaczona dla graczy w każdym wieku. Poziom trudności wzrasta wraz ze wzrostem ilości graczy.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2+"
      ],
      [
        "Czas",
        "Dowolny"
      ]
    ],
    "included": "Plansza, zegar do losowania i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania.",
    "source": "https://wielkiegryplanszowe.pl/nasze-gry/"
  },
  {
    "id": "gra-wielkie-warcaby",
    "url": "gra-wielkie-warcaby.html",
    "name": "Wielkie warcaby",
    "image": "assets/verified-wielkie-warcaby.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Rozegraj partię gigantycznych warcabów! Gracze wcielają się w pionki na szachownicy. Bardziej wprawieni gracze mogą rozegrać na planszy partię szachów. Ta gra stanowi doskonałą rozrywkę dla większej grupy graczy.",
    "facts": [
      [
        "Format",
        "Plansza wielkoformatowa"
      ],
      [
        "Zalecany rozmiar",
        "4 × 4 lub 5 × 5 m"
      ],
      [
        "Minimalny rozmiar",
        "3 × 3 m"
      ]
    ],
    "included": "Plansza i szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania.",
    "source": "https://wielkiegryplanszowe.pl/nasze-gry/"
  },
  {
    "id": "gra-przygoda-w-dzungli",
    "url": "gra-przygoda-w-dzungli.html",
    "name": "Przygoda w Dżungli",
    "image": "assets/verified-przygoda-w-dzungli.webp",
    "kind": "board",
    "format": "Gra wielkoformatowa",
    "description": "Przeżyj niezapomnianą przygodę w Dżungli! Zawodnicy wcielają się w rolę poszukiwaczy przygód i przemierzają Dżunglę.",
    "facts": [
      [
        "Wiek",
        "3+"
      ],
      [
        "Gracze",
        "2+"
      ],
      [
        "Czas",
        "15–30 min"
      ]
    ],
    "included": "Plansza, kostka XXL, sześć kamizelek lub szarf oraz szpilki montażowe.",
    "material": "Wzmocniony materiał banerowy, metalowe oczka i nadruk zabezpieczony lakierem. Planszę można złożyć do przechowywania.",
    "source": "https://wielkiegryplanszowe.pl/nasze-gry/"
  },
  {
    "id": "gra-wielkie-puzzle",
    "url": "gra-wielkie-puzzle.html",
    "name": "Wielkie puzzle",
    "image": "assets/oferta-puzzle.svg?v=8ec85d98abee",
    "kind": "puzzle",
    "format": "Wielkie puzzle",
    "description": "Wielkoformatowe puzzle z Twoją grafiką. Układanka ma wymiar 150 × 225 cm i jednostronny nadruk.",
    "facts": [
      [
        "Wymiary",
        "150 × 225 cm"
      ],
      [
        "Grafika",
        "Indywidualna"
      ],
      [
        "Nadruk",
        "Jednostronny"
      ]
    ],
    "included": "Puzzle z wybraną grafiką, nadruk jednostronny.",
    "material": "Grafikę i szczegóły wykonania ustalamy przy zamówieniu."
  },
  {
    "id": "gra-wielkie-memory",
    "url": "gra-wielkie-memory.html",
    "name": "Wielkie memory",
    "image": "assets/oferta-memory.svg?v=f76c6372954e",
    "kind": "memory",
    "format": "Wielkie memory",
    "description": "Memory z wybranymi przez Ciebie zdjęciami: 24 karty w rozmiarze 30 × 30 cm, z nadrukiem po obu stronach.",
    "facts": [
      [
        "Karty",
        "24 sztuki"
      ],
      [
        "Wymiar karty",
        "30 × 30 cm"
      ],
      [
        "Nadruk",
        "Dwustronny"
      ]
    ],
    "included": "24 karty z indywidualną grafiką i obustronnym nadrukiem.",
    "material": "Grafikę i szczegóły wykonania ustalamy przy zamówieniu."
  },
  {
    "id": "gra-kolko-i-krzyzyk",
    "url": "gra-kolko-i-krzyzyk.html",
    "name": "Kółko i krzyżyk",
    "image": "assets/oferta-kolko-i-krzyzyk.svg?v=7b0a6b3fce4f",
    "kind": "custom",
    "format": "Kółko i krzyżyk",
    "description": "Prosta rozgrywka, którą łatwo zaprosić do wspólnej zabawy. Porozmawiajmy o formacie i wyglądzie dopasowanym do Twojego pomysłu.",
    "facts": [
      [
        "Realizacja",
        "Na zamówienie"
      ],
      [
        "Projekt",
        "Indywidualny"
      ]
    ],
    "included": "Zawartość zestawu dopasujemy w indywidualnej wycenie.",
    "material": "Grafikę i szczegóły wykonania ustalamy przy zamówieniu."
  },
  {
    "id": "gra-tor-do-gry-w-kapsle",
    "url": "gra-tor-do-gry-w-kapsle.html",
    "name": "Tor do gry w kapsle",
    "image": "assets/oferta-kapsle.svg?v=9d9746245f8c",
    "kind": "custom",
    "format": "Tor do gry w kapsle",
    "description": "Zaplanuj własny tor do gry w kapsle. Motyw i przebieg trasy dobierzemy do przestrzeni oraz charakteru wydarzenia.",
    "facts": [
      [
        "Realizacja",
        "Na zamówienie"
      ],
      [
        "Projekt",
        "Indywidualny"
      ]
    ],
    "included": "Zawartość zestawu dopasujemy w indywidualnej wycenie.",
    "material": "Grafikę i szczegóły wykonania ustalamy przy zamówieniu."
  },
  {
    "id": "gra-gra-autorska",
    "url": "gra-gra-autorska.html",
    "name": "Gra autorska",
    "image": "assets/stock-design-1536.webp",
    "kind": "custom",
    "format": "Projekt indywidualny",
    "description": "Masz temat, który chcesz zamienić w grę? Zaczynamy od rozmowy o uczestnikach i celu, a następnie łączymy pomysł, zasady oraz projekt graficzny.",
    "facts": [
      [
        "Realizacja",
        "Na zamówienie"
      ],
      [
        "Projekt",
        "Indywidualny"
      ]
    ],
    "included": "Zawartość zestawu dopasujemy w indywidualnej wycenie.",
    "material": "Grafikę i szczegóły wykonania ustalamy przy zamówieniu."
  }
];
  const variants = {
    board: [
      {id:'3x3',label:'3 × 3 m',net:2000,gross:2460},
      {id:'4x4',label:'4 × 4 m',net:2400,gross:2952},
      {id:'5x5',label:'5 × 5 m',net:3000,gross:3690},
      {id:'6x6',label:'6 × 6 m',net:4000,gross:4920},
      {id:'other',label:'Inny rozmiar',net:null,gross:null}
    ],
    memory:[{id:'24-30x30',label:'24 karty · 30 × 30 cm',net:980,gross:1205.40},{id:'other',label:'Inny wariant memory',net:null,gross:null}],
    puzzle:[{id:'150x225',label:'150 × 225 cm',net:1800,gross:2214},{id:'other',label:'Inny rozmiar puzzli',net:null,gross:null}],
    custom:[{id:'custom',label:'Projekt indywidualny',net:null,gross:null}]
  };
  const money = amount => amount == null ? 'Wycena indywidualna' : new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',minimumFractionDigits:Number.isInteger(amount)?0:2,maximumFractionDigits:2}).format(amount);
  const normalize = text => String(text).trim().toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  const get = key => products.find(p => p.id===key || p.url===key || normalize(p.name)===normalize(key));
  const options = product => product ? variants[product.kind].filter(v => product.id !== 'gra-niebezpieczna-siec' || v.id !== '6x6') : [];
  const variant = (product,id) => options(product).find(v=>v.id===id) || options(product)[0];
  const totals = (choice,quantity) => ({net:choice?.net == null ? null : choice.net*quantity,gross:choice?.gross == null ? null : Math.round(choice.gross*quantity*100)/100});
  const contactURL = (product,choice,quantity=1) => {
    const params=new URLSearchParams({produkt:product.id,wariant:choice.id,liczba:String(quantity),zamiar:'zakup'});
    return 'kontakt.html?'+params+'#formularz-kontaktowy';
  };
  return {products,get,options,variant,money,totals,contactURL};
});
