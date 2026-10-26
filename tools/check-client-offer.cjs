const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../docs'),catalog=require(path.join(root,'style-a1/product-catalog.js'));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const expected=['Niebezpieczna Sieć','Skarb piratów','Zostań kierowcą','Segreguj śmieci','Farmer','Wyścig','Chińczyk','Droga strachu','Żabki','Mega twist','Wielkie warcaby','Przygoda w Dżungli','Wielkie puzzle','Wielkie memory','Kółko i krzyżyk','Tor do gry w kapsle','Gra autorska'];
assert.deepEqual(catalog.products.map(p=>p.name).sort(),expected.sort());
assert.equal(catalog.products.filter(p=>p.kind==='board').length,12);
const boards=read('wielkie-gry-planszowe.html'),others=read('inne.html'),contact=read('kontakt.html'),sitemap=read('sitemap.xml');
assert.equal((boards.match(/class="catalog-card"/g)||[]).length,12);
assert.equal((others.match(/class="catalog-card"/g)||[]).length,5);
assert.equal((contact.match(/class="contact-product"/g)||[]).length,17);
for(const product of catalog.products){
 const page=read(product.url);
 assert(page.includes(`<h1 id="product-title">${product.name}</h1>`),product.name);
 assert(page.includes(`data-product-offer="${product.id}"`),product.name);
 assert(/href="style-a1\/product-warm-accents\.css\?v=[^"\s]+"/.test(page),`${product.name}: shared design`);
 assert(page.includes('product-selection.js?v=shared-1'),`${product.name}: row selection`);
 assert.equal((page.match(/class="product-bottom-row"/g)||[]).length,1,`${product.name}: return button`);
 assert(page.indexOf('class="product-facts"')>page.indexOf('class="product-information"') && page.indexOf('class="product-facts"')<page.indexOf('class="product-included"'),`${product.name}: facts below description`);
 assert((boards+others).includes(`href="${product.url}"`));
 assert(contact.includes(`value="${product.name}"`));
 assert(fs.existsSync(path.join(root,product.image.split('?')[0])));
 for(const option of catalog.options(product)){
  assert(page.includes(`name="product-variant" value="${option.id}"`),`${product.name}: ${option.id}`);
  const next=catalog.contactURL(product,option,2),params=new URL(next,'http://localhost/').searchParams;
  assert.equal(catalog.get(params.get('produkt')).id,product.id);
  assert.equal(catalog.variant(product,params.get('wariant')).id,option.id);
  assert.equal(params.get('liczba'),'2');
 }
}
assert.equal(catalog.options(catalog.get('gra-wielkie-memory'))[0].gross,1205.4);
assert.equal(catalog.options(catalog.get('gra-wielkie-puzzle'))[0].gross,2214);
assert(!catalog.options(catalog.get('gra-niebezpieczna-siec')).some(v=>v.id==='6x6'));
for(const name of ['obieg-zamkniety-wody','kurs-na-planete','w-krainie-danii','krytyczne-myslenie','team-building','zrownowazony-rozwoj','cyberbezpieczenstwo','komunikacja-i-wspolpraca','kreatywne-myslenie']){
 const url='gra-'+name+'.html';assert(!sitemap.includes(url));assert(!(boards+others+contact).includes(url));assert(read(url).includes('noindex,follow'));
}
const formats=read('gry-na-zamowienie.html');assert.equal((formats.match(/class="proposal-format"/g)||[]).length,5);assert(!formats.match(/<article class="proposal-format">[\s\S]*?gra-tor-do-gry-w-kapsle/));assert(boards.includes('id="cennik"'));
console.log('PASS: 17 confirmed products, 12 boards, matching catalog/contact/detail pages, available variants and price totals, five format cards, removed products excluded from navigation and sitemap.');
