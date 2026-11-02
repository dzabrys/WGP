/* Build metadata from the published HTML and public CMS catalog. Never rewrite the body. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const base = 'https://dzabrys.github.io/WGP/';
const entities = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',oacute:'ó',Oacute:'Ó',ndash:'–',mdash:'—',times:'×',middot:'·',rsaquo:'›',larr:'←',rarr:'→',bdquo:'„',rdquo:'”'};
const decode = s => String(s || '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):entities[e]??m);
const text = s => decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const escape = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const abs = s => new URL(s,base).href;
const context = {window:{}, URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(root,'docs/cms-catalog.js'),'utf8'),context);
const products = context.window.WGPCatalog.products.filter(p=>p.visible);
const byFile = new Map(products.map(p=>[p.url,p]));
const attr = (s,n) => decode((s.match(new RegExp('\\b'+n+'="([^"]*)"','i'))||[])[1]||'');
const meta = (s,n) => attr((s.match(new RegExp('<meta\\b[^>]*(?:name|property)="'+n+'"[^>]*>','i'))||[])[0]||'','content');
const clean = v => typeof v==='string'?decode(v):Array.isArray(v)?v.map(clean):v && typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,clean(v)])):v;
function enhance(s,file){
  if(/noindex/i.test(meta(s,'robots')))return s;
  const url=abs(file==='index.html'?'':file), p=byFile.get(file);
  let title=text((s.match(/<title>(.*?)<\/title>/s)||[])[1]);
  if(file==='szkoly.html')title='Edukacyjne gry wielkoformatowe dla szkół | Wielkie Gry Planszowe';
  const description=meta(s,'description');
  const old=[...s.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].flatMap(m=>{let v=clean(JSON.parse(m[1]));return Array.isArray(v)?v:v['@graph']||[v];});
  const org=old.find(n=>n['@type']==='Organization')||{name:'Wielkie Gry Planszowe',email:'biuro@wielkiegryplanszowe.pl',telephone:'+48 600 894 644',address:{'@type':'PostalAddress',streetAddress:'ul. Lubelska 37D',postalCode:'10-408',addressLocality:'Olsztyn',addressCountry:'PL'}};
  org['@type']='Organization';org['@id']=base+'#organization';org.url=base;delete org['@context'];
  const graph=[org,{'@type':'WebSite','@id':base+'#website',url:base,name:'Wielkie Gry Planszowe',inLanguage:'pl-PL',publisher:{'@id':org['@id']}}];
  const page={'@type':file==='kontakt.html'?'ContactPage':['oferta.html','wielkie-gry-planszowe.html','inne.html','szkoly.html','firmy.html'].includes(file)?'CollectionPage':'WebPage','@id':url+'#webpage',url,name:title,description,inLanguage:'pl-PL',isPartOf:{'@id':base+'#website'},publisher:{'@id':org['@id']}};
  graph.push(page);
  const crumb=old.find(n=>n['@type']==='BreadcrumbList');
  if(crumb){delete crumb['@context'];crumb['@id']=url+'#breadcrumb';graph.push(crumb);page.breadcrumb={'@id':crumb['@id']};}
  if(p){
    const node={'@type':'Product','@id':url+'#product',url,name:p.name,description:p.description,image:abs(p.image),category:p.format,brand:{'@type':'Brand',name:'Wielkie Gry Planszowe'},mainEntityOfPage:{'@id':page['@id']}};
    // Use facts actually present in the page; edited CMS catalog facts can differ.
    const facts=[...s.matchAll(/<dt\b[^>]*>(.*?)<\/dt>\s*<dd\b[^>]*>(.*?)<\/dd>/gs)].map(m=>({'@type':'PropertyValue',name:text(m[1]),value:text(m[2])}));
    if(facts.length)node.additionalProperty=facts;
    const offers=p.variants.filter(v=>Number.isFinite(v.gross)&&v.gross>0).map(v=>({'@type':'Offer',url,name:p.name+' — '+v.label,price:v.gross.toFixed(2),priceCurrency:'PLN',seller:{'@id':org['@id']}}));
    if(offers.length)node.offers=offers;
    graph.push(node);page.mainEntity={'@id':node['@id']};
    if(!crumb){const items=[['Strona główna',base],['Oferta',abs('oferta.html')],[p.kind==='board'?'Wielkie gry planszowe':'Inne',abs(p.kind==='board'?'wielkie-gry-planszowe.html':'inne.html')],[p.name,url]];graph.push({'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:items.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))});page.breadcrumb={'@id':url+'#breadcrumb'};}
  } else {
    const links=new Set([...s.split('</head>')[1].matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>{try{return path.posix.basename(new URL(decode(m[1]),url).pathname);}catch{return '';}}));
    const listed=products.filter(p=>links.has(p.url));
    if(listed.length){const id=url+'#catalog';graph.push({'@type':'ItemList','@id':id,name:title,numberOfItems:listed.length,itemListElement:listed.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:abs(p.url)}))});page.mainEntity={'@id':id};}
  }
  const faq=[...s.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>(.*?)<\/summary>(.*?)<\/details>/gs)].map(m=>({q:text(m[1]),a:text(m[2])})).filter(x=>x.q&&x.a);
  if(faq.length)graph.push({'@type':'FAQPage','@id':url+'#faq',inLanguage:'pl-PL',mainEntity:faq.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))});
  let head=s.split('</head>')[0];
  const image=p?abs(p.image):meta(s,'og:image');
  const tags=[['name','robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'],['property','og:title',title],['property','og:description',description],['property','og:url',url],['property','og:image',image],['property','og:image:alt',p?p.name:'Wielkie Gry Planszowe'],['name','twitter:card','summary_large_image'],['name','twitter:title',title],['name','twitter:description',description],['name','twitter:image',image]];
  head=head.replace(/<title>.*?<\/title>/s,'<title>'+escape(title)+'</title>').replace(/<script[^>]*type="application\/ld\+json"[^>]*>.*?<\/script>/gs,'');
  for(const [kind,key,val] of tags){head=head.replace(new RegExp('<meta\\b[^>]*'+kind+'="'+key+'"[^>]*>','gi'),'');if(val)head+=`<meta ${kind}="${key}" content="${escape(val)}">`;}
  head=head.replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'')+`<link rel="canonical" href="${url}">`;
  head=head.replace(/<link\b[^>]*rel="sitemap"[^>]*>/gi,'')+`<link rel="sitemap" type="application/xml" href="${base}sitemap.xml">`;
  graph.sort((a,b)=>a['@id'].localeCompare(b['@id']));
  head+='<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':graph}, (key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value).replace(/</g,'\\u003c')+'</script>';
  return head+'</head>'+s.split('</head>').slice(1).join('</head>');
}
if (require.main === module) {
let count=0;const indexed=[];
for(const file of fs.readdirSync(path.join(root,'docs')).filter(f=>f.endsWith('.html'))){const dest=path.join(root,'docs',file),before=fs.readFileSync(dest,'utf8'),after=enhance(before,file);if(!/noindex/i.test(meta(after,'robots')))indexed.push(abs(file==='index.html'?'':file));if(after!==before){fs.writeFileSync(dest,after);count++;}}
fs.writeFileSync(path.join(root,'docs/sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+indexed.map(url=>'  <url><loc>'+escape(url)+'</loc></url>').join('\n')+'\n</urlset>\n');
const llms='# Wielkie Gry Planszowe\n\n> Gry wielkoformatowe dla szkół, firm i instytucji oraz gry na zamówienie.\n\n'+
'Serwis: '+base+'\nJęzyk: polski.\nKontakt: biuro@wielkiegryplanszowe.pl; +48 600 894 644; ul. Lubelska 37D, 10-408 Olsztyn.\n\n'+
'## Strony główne\n'+['oferta','szkoly','firmy','gry-na-zamowienie','wielkie-gry-planszowe','inne','kontakt'].map(f=>`- [${f}](${abs(f+'.html')})`).join('\n')+
'\n\n## Produkty\n'+products.map(p=>`- [${p.name}](${abs(p.url)}): ${p.shortDescription||p.description}`).join('\n')+
'\n\n## Ceny i zamawianie\nCeny i warianty są podane na stronach produktów. Kwoty brutto są w PLN, za jeden zestaw. Warianty bez ceny wymagają indywidualnej wyceny. Formularz kontaktowy przygotowuje wiadomość, a wysyłkę zatwierdza użytkownik w swojej poczcie. Szczegóły realizacji potwierdza firma.\n\n## Źródła\n- [Mapa witryny]('+base+'sitemap.xml)\n';
fs.writeFileSync(path.join(root,'docs/llms.txt'),llms);
console.log(`GEO: ${count} changed pages; ${indexed.length} indexable URLs; ${products.length} products.`);
}
module.exports={enhance,products,meta,base};
