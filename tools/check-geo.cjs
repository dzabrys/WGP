const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {products,meta,base,enhance}=require('./geo.cjs');
const sitemap=fs.readFileSync(path.join(root,'docs/sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
let pages=0,offers=0,faq=0;
const baselineRoot=process.env.GEO_BASELINE_DIR;
const compareGit=process.env.GEO_COMPARE_GIT==='1' && !baselineRoot && cp.spawnSync('git',['rev-parse','--is-inside-work-tree'],{cwd:root,encoding:'utf8'}).stdout?.trim()==='true';
for(const file of fs.readdirSync(path.join(root,'docs')).filter(f=>f.endsWith('.html'))){
  const s=fs.readFileSync(path.join(root,'docs',file),'utf8').replace(/\r\n/g,'\n');
  const original=baselineRoot?fs.readFileSync(path.join(baselineRoot,file),'utf8').replace(/\r\n/g,'\n'):compareGit?cp.execFileSync('git',['show','HEAD:docs/'+file],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024}).replace(/\r\n/g,'\n'):null;
  if(original!==null){assert.equal(s.split('</head>')[1],original.split('</head>')[1],file+': body changed');
  assert.deepEqual(s.match(/<style\b[^>]*>.*?<\/style>/gs),original.match(/<style\b[^>]*>.*?<\/style>/gs),file+': CSS changed');}
  const url=base+(file==='index.html'?'':file);
  if(/noindex/i.test(meta(s,'robots'))){assert(!urls.includes(url),file+': noindex in sitemap');if(original!==null)assert.equal(s,original,file+': excluded page changed');continue;}
  pages++;assert(urls.includes(url));assert.equal(enhance(s,file),s,file+': not idempotent');
  assert.equal((s.match(/rel="canonical"/g)||[]).length,1);
  assert(s.includes(`rel="canonical" href="${url}"`));
  assert.equal(meta(s,'og:url'),url);assert.equal(meta(s,'twitter:title'),meta(s,'og:title'));
  const scripts=[...s.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];assert.equal(scripts.length,1);
  const graph=JSON.parse(scripts[0][1])['@graph'];assert(graph.length>=3);
  assert(!/&(?:#\d+|#x[\da-f]+|oacute|amp|quot);/i.test(scripts[0][1]),file+': encoded HTML in JSON');
  const ids=new Set(graph.map(n=>n['@id']));assert.equal(ids.size,graph.length);
  for(const n of graph){for(const k of ['mainEntityOfPage','isPartOf','publisher','breadcrumb','mainEntity'])if(n[k]&&!Array.isArray(n[k])&&n[k]['@id'])assert(ids.has(n[k]['@id']),file+': dangling '+k);}
  for(const m of s.matchAll(/\b(?:href|src)="([^"]+)"/g)){const u=m[1].split(/[?#]/)[0];if(!u||/^(?:[a-z]+:|\/\/)/i.test(u))continue;const target=path.join(root,'docs',decodeURIComponent(u.replace(/^\/WGP\//,'')));assert(fs.existsSync(target),file+': missing '+u);}
  const p=products.find(p=>p.url===file);if(p){const n=graph.find(n=>n['@type']==='Product');assert.equal(n.name,p.name);const priced=p.variants.filter(v=>Number.isFinite(v.gross)&&v.gross>0);assert.equal((n.offers||[]).length,priced.length);for(let i=0;i<priced.length;i++){assert.equal(n.offers[i].price,priced[i].gross.toFixed(2));assert.equal(n.offers[i].priceCurrency,'PLN');assert(!n.offers[i].availability);offers++;}assert(fs.existsSync(path.join(root,'docs',p.image.split('?')[0])));}
  for(const n of graph)if(n['@type']==='FAQPage')faq+=n.mainEntity.length;
}
assert.equal(urls.length,pages);assert.equal(new Set(urls).size,urls.length);
console.log(JSON.stringify({result:'PASS',indexedPages:pages,products:products.length,pricedVariants:offers,visibleFAQAnswers:faq,bodyAndCSSUnchanged:(baselineRoot||compareGit)?true:'not compared; set GEO_BASELINE_DIR or GEO_COMPARE_GIT=1',metadataIdempotent:true},null,2));
