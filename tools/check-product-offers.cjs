const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = require('../docs/style-a1/product-catalog.js');
for (const file of fs.readdirSync(path.join(root,'docs')).filter(file=>file.endsWith('.html'))) {
  const html = read('docs/'+file);
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url=match[1];
    if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) continue;
    const target=decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\/WGP(?=\/)/, '');
    assert(fs.existsSync(path.join(root,'docs',target)),`Missing asset/link ${url} in ${file}`);
  }
}
assert.equal(catalog.products.length, 17);
assert.equal(new Set(catalog.products.map(p => p.id)).size, 17);
const board = catalog.get('gra-skarb-piratow');
assert.deepEqual(catalog.options(board).map(v => [v.id, v.net, v.gross]), [
  ['3x3',2000,2460], ['4x4',2400,2952], ['5x5',3000,3690], ['6x6',4000,4920], ['other',null,null],
]);
const memory = catalog.get('gra-wielkie-memory'), puzzle = catalog.get('gra-wielkie-puzzle');
assert.equal(catalog.variant(memory, '24-30x30').gross, 1205.40);
assert.equal(catalog.variant(puzzle, '150x225').gross, 2214);
assert.equal(catalog.variant(memory, '4x4').id, '24-30x30', 'A board size cannot be applied to memory');
assert.equal(catalog.get('nieistniejąca-gra'), undefined);
const js = read('docs/style-a1/ui/contact-designs.js');
const helperStart = js.indexOf('    const selectedProduct =');
const helperEnd = js.indexOf('    const formatField =');
const valueStart = js.indexOf('    const value = name => {');
const valueEnd = js.indexOf('    const showStep', valueStart);
const mailStart = js.indexOf('    function emailSubject()');
const mailEnd = js.indexOf('    const prepareManual', mailStart);
const fields = {name:'Jan',nazwisko:'Testowy',organizacja:'Test',email:'test@example.com',message:'Proszę o potwierdzenie.',format:'BŁĘDNY FORMAT',cena:'1',liczba_egzemplarzy:'2'};
const radios = catalog.products.map(p => ({value:p.name,checked:false,dataset:{format:'BŁĘDNE DANE'}}));
const variantField = {value:''};
const sandbox = {products:radios,window:{WGPCatalog:catalog},form:{querySelector:()=>variantField,elements:{namedItem:name=>({value:fields[name]||''})}},sourceTopic:''};
vm.createContext(sandbox);
vm.runInContext(js.slice(helperStart,helperEnd)+js.slice(valueStart,valueEnd)+js.slice(mailStart,mailEnd)+'\nthis.composeMail=compose;',sandbox);
let tested = 0;
for (const product of catalog.products) {
  const html = read('docs/'+product.url);
  assert(html.includes(`data-product-offer="${product.id}"`));
  assert(html.includes('data-product-contact'));
  assert(!html.includes('Cena poglądowa'));
  assert(!html.includes('1 490 zł'));
  assert(html.includes(product.description));
  assert(html.indexOf('product-catalog.js') < html.indexOf('product-offer.js'));
  for (const variant of catalog.options(product)) {
    assert(html.includes(`name="product-variant" value="${variant.id}"`));
    if (variant.gross != null) assert.equal(variant.gross, Math.round(variant.net*1.23*100)/100);
    const url = new URL(catalog.contactURL(product,variant,2), 'http://127.0.0.1:4176/');
    assert.equal(catalog.get(url.searchParams.get('produkt')), product);
    assert.equal(catalog.variant(product,url.searchParams.get('wariant')), variant);
    assert(!url.searchParams.has('cena'), 'Prices must come from catalog data, never URL values');
    radios.forEach(r => {r.checked=r.value===product.name;});
    variantField.value=variant.id;
    const message = sandbox.composeMail();
    assert(message.body.includes('Produkt: '+product.name));
    assert(message.body.includes('Format gry: '+product.format));
    assert(message.body.includes('Rozmiar / wariant: '+variant.label));
    assert(message.body.includes(product.description));
    assert(message.body.includes(product.included));
    assert(message.body.includes(catalog.money(variant.gross)));
    assert(message.body.includes(catalog.money(catalog.totals(variant,2).gross)));
    assert(!message.body.includes('BŁĘDN'));
    tested++;
  }
  assert.deepEqual([...html.matchAll(/name="product-variant" value="([^"]+)"/g)].map(m=>m[1]), catalog.options(product).map(v=>v.id));
}
radios.forEach(r => {r.checked=false;});
const general=sandbox.composeMail();
assert(!general.body.includes('Format gry:'));
assert(!general.body.includes('Cena za zestaw:'));
assert(!general.body.includes('OPIS I ZAWARTOŚĆ PRODUKTU'));
assert.equal(catalog.get('gra-niebezpieczna-siec').facts[0][1],'1–8');
const contact=read('docs/kontakt.html');
assert(contact.indexOf('product-catalog.js')<contact.indexOf('ui/contact-designs.js'));
assert(contact.includes('<details class="contact-privacy">'));
assert(!contact.includes('name="dodatki"'));
assert(!read('docs/oferta.html').includes('<footer'));
const backupFile='work/offer-backup/docs/style-a1/ui/contact-designs.js';
if (fs.existsSync(path.join(root,backupFile))) {
  // Display-only local-mode copy may change; CAPTCHA verification must stay intact.
  const captcha = text => text.slice(text.indexOf("    const recipient ="), text.indexOf('    function emailSubject()'))
    .replace(/^        mode\.(?:hidden|textContent) = .*;\r?\n/gm, '');
  assert.equal(captcha(js),captcha(read(backupFile)));
  for (const product of catalog.products) {
    const backup='work/offer-backup/docs/'+product.url;
    if (!fs.existsSync(path.join(root,backup))) continue;
    const before=read(backup),after=read('docs/'+product.url);
    // Preserve navigation structure while allowing the custom-games illustration to change.
    const header = text => text.match(/<header\b[\s\S]*?<\/header>/)[0]
      .replace(/(<a\b[^>]*href="(?:\/WGP\/)?gry-na-zamowienie\.html"[^>]*>)<svg\b[\s\S]*?<\/svg>/, '$1<svg data-custom-game-icon></svg>');
    assert.equal(header(after),header(before));
    const footer = text => text.match(/<footer\b[\s\S]*?<\/footer>/)[0]
      .replace('Dokumenty przykładowe · dane firmy do uzupełnienia', 'Wielkie Gry Planszowe · Olsztyn');
    assert.equal(footer(after),footer(before));
  }
}
console.log(`PASS: ${catalog.products.length} products, ${tested} valid product/variant combinations, net/gross prices, quantities, mail descriptions, invalid variant fallback and general enquiry. Existing headers, footers and CAPTCHA preserved.`);
