// Align local content with the client's published offer, checked 2026-10-23.
const fs=require('node:fs'), path=require('node:path');
const sharp=require(process.env.SHARP_PATH || 'sharp');
const root=path.resolve(__dirname,'../docs');
const catalogFile=path.join(root,'style-a1/product-catalog.js');
const catalog=require(catalogFile);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const source='https://wielkiegryplanszowe.pl/';
const removed=['gra-obieg-zamkniety-wody','gra-kurs-na-planete','gra-w-krainie-danii','gra-krytyczne-myslenie','gra-team-building','gra-zrownowazony-rozwoj','gra-cyberbezpieczenstwo','gra-komunikacja-i-wspolpraca','gra-kreatywne-myslenie'];
const normalSet='Plansza, kostka XXL, sześć kamizelek dla graczy i szpilki montażowe.';
const material=catalog.get('gra-farmer').material;
const definitions=[
 ['chinczyk','Chińczyk','2023/09/CHINCZYK-1024x1024.jpg','Rozgrywka drużynowa na wielkiej planszy: uczestnicy sami pełnią rolę pionków.',[['Wiek','3+'],['Gracze','4–16'],['Czas','30–60 min']],'Plansza, kostka XXL, 16 szarf i szpilki do mocowania.'],
 ['droga-strachu','Droga strachu','2023/09/DROGA-STRACHU-1024x1024.jpg','Ruchowa trasa z zabawnymi zadaniami. Gracze pokonują kolejne pola, starając się dotrzeć do mety.',[['Wiek','3+'],['Gracze','2–6+'],['Czas','15–30 min']],normalSet],
 ['zabki','Żabki','2023/08/10-1024x1024.jpg','Przeprawa przez rzekę z kostką z figurami geometrycznymi. Dzieci poznają kolory i kształty podczas ruchowej zabawy.',[['Wiek','2+'],['Gracze','2–3'],['Czas','5 min']],'Plansza, wielka kostka z figurami geometrycznymi i szpilki montażowe.'],
 ['mega-twist','Mega twist','2023/09/MEGA-TWIST-1024x1024.jpg','Układajcie dłonie i stopy na kolorach wskazanych przez zegar. Większa grupa oznacza większe wyzwanie.',[['Wiek','3+'],['Gracze','2+'],['Czas','Dowolny']],'Plansza, zegar do losowania i szpilki montażowe.'],
 ['wielkie-warcaby','Wielkie warcaby','2023/08/11-1024x1024.jpg','Warcaby w wielkim formacie, w których gracze zastępują pionki. Planszę można wykorzystać także do partii szachów.',[['Format','Plansza wielkoformatowa'],['Zalecany rozmiar','4 × 4 lub 5 × 5 m'],['Minimalny rozmiar','3 × 3 m']],'Plansza i szpilki montażowe.'],
 ['przygoda-w-dzungli','Przygoda w Dżungli','2023/11/przygodawjungli-1024x1024.jpeg','Wyprawa przez dżunglę, w której uczestnicy wcielają się w poszukiwaczy przygód.',[['Wiek','3+'],['Gracze','2+'],['Czas','15–30 min']],'Plansza, kostka XXL, sześć kamizelek lub szarf oraz szpilki montażowe.']
];
async function main(){
 const backup=path.resolve(__dirname,'../work/client-offer-backup');
 if(fs.existsSync(backup))throw Error('Backup already exists: this migration must run only once');
 fs.mkdirSync(backup,{recursive:true});
 for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.html')||n==='sitemap.xml'))fs.copyFileSync(path.join(root,name),path.join(backup,name));
 fs.copyFileSync(catalogFile,path.join(backup,'product-catalog.js'));
 // Fetch genuine product artwork before changing the catalog. No generated
 // illustration is used as evidence that a product exists.
 const added=[];
 for(const [slug,name,image,description,facts,included] of definitions){
  const url=source+'wp-content/uploads/'+image;
  const response=await fetch(url);if(!response.ok)throw Error('Image download failed: '+url);
  const filename='assets/verified-'+slug+'.webp';
  await sharp(Buffer.from(await response.arrayBuffer())).resize({width:800,withoutEnlargement:true}).webp({quality:83}).toFile(path.join(root,filename));
  added.push({id:'gra-'+slug,url:'gra-'+slug+'.html',name,image:filename,kind:'board',format:'Gra wielkoformatowa',description,facts,included,material,source:source+'nasze-gry/'});
 }
 const response=await fetch(source+'wp-content/uploads/2026/10/niebezpieczna-siec-plansza-1024x1024.jpg');if(!response.ok)throw Error('Missing actual Niebezpieczna Sieć image');
 await sharp(Buffer.from(await response.arrayBuffer())).resize(800).webp({quality:83}).toFile(path.join(root,'assets/verified-niebezpieczna-siec.webp'));
 const retained=catalog.products.filter(p=>!removed.includes(p.id));
 const products=[...retained.filter(p=>p.kind==='board'),...added,...retained.filter(p=>p.kind!=='board')];
 const network=products.find(p=>p.id==='gra-niebezpieczna-siec');
 const oldNetworkImage=network.image;
 network.image='assets/verified-niebezpieczna-siec.webp';
 network.material='Materiał z czarnym spodem, przystosowany do użytkowania w plenerze. Rozmiary wskazane przy tej grze: 3 × 3, 4 × 4 lub 5 × 5 m.';
 // Preserve pricing calculations and the purchase-to-contact flow.
 const original=fs.readFileSync(catalogFile,'utf8');
 fs.writeFileSync(catalogFile,original.replace(/const products = [\s\S]*?;\s*const variants =/,`const products = ${JSON.stringify(products,null,2)};\n  const variants =`));
 const template=read('gra-farmer.html');
 for(const p of added){
  let html=template.replaceAll('gra-farmer',p.id).replaceAll('Farmer',esc(p.name)).replaceAll('assets/oferta-farmer.webp?v=2608f655fd15',p.image);
  html=html.replace(/<dl class="product-facts"[\s\S]*?<\/dl>/,`<dl class="product-facts">${p.facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`);
  html=html.replace(/<p class="product-description">[\s\S]*?<\/p>/,`<p class="product-description">${esc(p.description)}</p>`);
  html=html.replace(/<section class="product-included">[\s\S]*?<\/section>/,`<section class="product-included"><h2>W zestawie</h2><p>${esc(p.included)}</p></section>`);
  // The template's related collection can contain its original product.
  html=html.replace(/<section class="product-related"[\s\S]*?<\/section>/,'');
  write(p.url,html);
 }
 const arrow='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 16h21M18 7l9 9-9 9"/></svg>';
 const price='<div class="price-block"><strong>od 2460 zł brutto</strong><span>2000 zł netto · 3 × 3 m</span></div>';
 const card=p=>`<article class="catalog-card"><a href="${p.url}"><div class="catalog-image catalog-board"><img src="${p.image}" width="800" height="800" alt="Plansza gry: ${esc(p.name)}" loading="lazy" decoding="async"></div><div class="catalog-copy"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>${price}<span class="catalog-link"><span>Poznaj grę</span><span class="catalog-arrow" aria-hidden="true">${arrow}</span></span></div></a></article>`;
 const audienceCard=p=>`<article class="game-card"><a class="game-link" href="${p.url}"><div class="game-image"><img class="crop" src="${p.image}" width="800" height="800" alt="Plansza gry: ${esc(p.name)}" style="object-fit:contain;object-position:center;background:#f3f7fc" loading="lazy" decoding="async"><span class="age">${esc(p.facts[0][0]==='Wiek'?p.facts[0][1]:p.id==='gra-niebezpieczna-siec'?'Klasy 1–8':'Gra XXL')}</span></div><div class="game-copy"><p class="game-category">Gra wielkoformatowa</p><h3>${esc(p.name)}</h3><p class="game-description">${esc(p.description)}</p>${price}<span class="game-action">Zobacz grę →</span></div></a></article>`;
 const get=id=>products.find(p=>p.id==='gra-'+id);
 const groups=[['przygodowe','Przygoda i wspólna zabawa',['skarb-piratow','farmer','wyscig','przygoda-w-dzungli']],['dla-szkol','Nauka przez działanie',['niebezpieczna-siec','zostan-kierowca','segreguj-smieci','zabki']],['dla-firm','Ruch i rozgrywki zespołowe',['chinczyk','droga-strachu','mega-twist','wielkie-warcaby']]];
 let boards=read('wielkie-gry-planszowe.html');
 boards=boards.replace(/<section class="catalog-section"[\s\S]*?<\/section>/g,block=>{
  const group=groups.find(g=>block.includes('id="'+g[0]+'"'));if(!group)return block;
  return `<section class="catalog-section" id="${group[0]}" aria-labelledby="title-${group[0]}"><div class="catalog-section-heading"><h2 id="title-${group[0]}">${group[1]}</h2><span>${group[2].length} propozycje</span></div><div class="catalog-grid">${group[2].map(id=>card(get(id))).join('')}</div></section>`;
 });
 write('wielkie-gry-planszowe.html',boards);
 for(const [file,ids] of [['szkoly.html',['niebezpieczna-siec','zostan-kierowca','segreguj-smieci','zabki','farmer','droga-strachu']],['firmy.html',['chinczyk','mega-twist','wielkie-warcaby','droga-strachu','skarb-piratow','przygoda-w-dzungli']]]){
  let h=read(file);
  h=h.replace(/<div class="school-filter-bar"[\s\S]*?<div class="games-grid">/,'<div class="games-grid">');
  h=h.replace(/<script[^>]+src="style-a1\/ui\/filters\.js[^>]*><\/script>/,'');
  // Replace exactly the catalog's direct product cards, preserving the following custom-order banner.
  const start=h.indexOf('<div class="games-grid">');const end=h.indexOf('</article></div>',start);
  if(start<0||end<0)throw Error('Missing audience grid: '+file);
  h=h.slice(0,start)+'<div class="games-grid">'+ids.map(id=>audienceCard(get(id))).join('')+'</div>'+h.slice(end+'</article></div>'.length);
  h=h.replace('Wybierz grę dla swojej klasy','Wybierz grę dla swojej grupy').replace('Znajdź temat i poziom odpowiedni dla Twoich uczniów.','Gry edukacyjne i ruchowe z katalogu producenta. Wiek uczestników sprawdź przy wybranym tytule.').replace('Wybierz temat wspólnej gry','Gotowe gry do wspólnej rozgrywki');
  h=h.replace('Przy każdej grze znajdziesz oznaczenie klas. Możesz też zawęzić listę do klas 1–3, 4–6 lub 7–8. Jeśli potrzebujesz pomocy w wyborze, napisz nam o swojej grupie.','Niebezpieczna Sieć jest przeznaczona dla klas 1–8. Pozostałe gry mają oznaczenia wieku podane przez producenta. Napisz o wieku i liczbie uczestników, a pomożemy wybrać grę.');
  write(file,h);
 }
 let contact=read('kontakt.html');
 const choices=products.map((p,i)=>`<label class="contact-product" for="contact-product-${i}"><input id="contact-product-${i}" type="radio" name="gra" value="${esc(p.name)}" data-format="${esc(p.format)}" data-product-url="${p.url}" data-product-group="${p.kind==='board'?'plansze':p.kind==='memory'?'memory':p.kind==='puzzle'?'puzzle':'custom'}"><img src="${p.image}" width="160" height="100" alt="" loading="lazy" decoding="async"><span><strong>${esc(p.name)}</strong><small>${esc(p.format)}</small></span></label>`).join('\n');
 contact=contact.replace(/<div class="contact-product-grid">[\s\S]*?<\/div>/,`<div class="contact-product-grid">${choices}</div>`).replace(/>20 produktów</g,'>17 produktów<');
 write('kontakt.html',contact);
 // Remove references to unconfirmed ready-made products from related cards,
 // search indexes and metadata across all retained public pages.
 const removedProducts=catalog.products.filter(p=>removed.includes(p.id));
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!removed.some(id=>f===id+'.html'))){
  let h=read(file);
  h=h.replace(/<article class="(?:catalog-card|game-card)"[^>]*>[\s\S]*?<\/article>/g,block=>removed.some(id=>block.includes('href="'+id+'.html"'))?'':block);
  h=h.replace(/<script type="application\/json" id="search-data">([\s\S]*?)<\/script>/g,(whole,json)=>{try{return whole.replace(json,JSON.stringify(JSON.parse(json).filter(item=>!removed.some(id=>item.href===id+'.html'))));}catch{return whole;}});
  h=h.replaceAll(oldNetworkImage,network.image);
  h=h.replace(/product-catalog\.js\?v=[^" ]+/g,'product-catalog.js?v=verified-20261023');
  if(file==='gra-niebezpieczna-siec.html')h=h.replace(catalog.get('gra-farmer').material,network.material);
  write(file,h);
 }
 for(const p of removedProducts){
  write(p.url,`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=gry-na-zamowienie.html"><title>Gry na zamówienie | Wielkie Gry Planszowe</title><link rel="canonical" href="gry-na-zamowienie.html"></head><body><p>Przejdź do <a href="gry-na-zamowienie.html">gier na indywidualne zamówienie</a> lub <a href="wielkie-gry-planszowe.html">katalogu gotowych gier</a>.</p></body></html>`);
 }
 let sitemap=read('sitemap.xml');for(const p of removedProducts)sitemap=sitemap.replace(new RegExp('<url><loc>[^<]*/'+p.url.replace('.','\\.')+'</loc>[\\s\\S]*?</url>','g'),'');
 for(const p of added)sitemap=sitemap.replace('</urlset>',`<url><loc>https://dzabrys.github.io/Staz2/${p.url}</loc></url></urlset>`);
 write('sitemap.xml',sitemap);
 const audit={checked:'2026-10-23',sources:[source,source+'nasze-gry/',source+'oferta/',source+'realizacje-indywidualne/'],confirmed:products.map(p=>({id:p.id,name:p.name,kind:p.kind})),removed:removedProducts.map(p=>({id:p.id,name:p.name,reason:'Nie potwierdzono jako gotowego produktu na stronie klienta.'})),added:added.map(p=>p.name),notes:['Puzzle, memory, kółko i krzyżyk oraz tor do kapsli są potwierdzone.','Integracja i edukacja są zastosowaniami gier, nie osobnymi potwierdzonymi produktami.','Nie przeniesiono obcych treści szablonowych o regulacji brwi ze strony źródłowej.']};
 fs.writeFileSync(path.resolve(__dirname,'../work/client-offer-audit.json'),JSON.stringify(audit,null,2));
 console.log(JSON.stringify({confirmed:products.length,boards:products.filter(p=>p.kind==='board').length,added:added.map(p=>p.name),removed:removedProducts.map(p=>p.name)},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
