/* Exercise the actual panel UI with an in-memory API; never alters a real CMS. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const seed=JSON.parse(fs.readFileSync('hosting/app/seed.json','utf8'));
seed.categories=[['przygodowe','Przygoda i wspólna zabawa','boards'],['dla-szkol','Nauka przez działanie','boards'],['dla-firm','Ruch i rozgrywki zespołowe','boards'],['customowe','Na Twoje zamówienie','custom']].map(([id,name,catalog])=>({id,name,catalog,description:''}));seed.deletedProducts=[];
const html=fs.readFileSync('hosting/public/panel/index.html','utf8'),script=fs.readFileSync('hosting/public/panel/panel.js','utf8');
let checks=0;const check=(value,label)=>{assert(value,label);checks++;console.log('PASS '+label);};
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0));};
async function app(role='admin',initial=seed){
 const dom=new JSDOM(html,{url:'http://127.0.0.1:4191/panel/#products',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.structuredClone=structuredClone;w.AbortSignal=AbortSignal;w.confirm=()=>true;w.open=()=>{};Object.defineProperty(w.crypto,'randomUUID',{value:crypto.randomUUID});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let state=structuredClone(initial),revision=1,saves=0,publishes=0,calls=[],windows=[],failure=null;w.open=(url)=>{const tab={opener:null,location:{href:""},close(){this.closed=true;}};tab.location.href=url;windows.push(tab);return tab;};
 w.fetch=async(url,options)=>{const action=url.split('/panel/api/')[1].split('?')[0];calls.push(action);if(failure===action)throw TypeError('Failed to fetch');let value;
 if(action==='boot')value={user:{id:'test-user',name:'Test',role},csrf:'test-csrf',siteUrl:'https://dzabrys.github.io/WGP',publicationTarget:'GitHub'};
 else if(action==='state')value={state:structuredClone(state),revision,hasChanges:false,deliveryPending:false};
 else if(action==='stats')value={daily:[],pages:[],devices:[],sources:[],activity:[]};
 else if(action==='save'){state=JSON.parse(options.body).state;saves++;revision++;value={revision};}
 else if(action==='publish'){assert.equal(JSON.parse(options.body).revision,revision);publishes++;value={target:'github'};}else if(action==='media')value={items:[{url:'assets/oferta-farmer.webp',name:'Farmer'}]};else throw Error('Unexpected API call '+action);
 return{ok:true,status:200,json:async()=>({ok:true,...value})};};
 w.eval(script);await settle();const d=w.document;
 return{w,d,dom,rows:()=>[...d.querySelectorAll('#product-rows .product-cell strong')].map(n=>n.textContent),click:async selector=>{const e=d.querySelector(selector);assert(e,'Missing '+selector);e.click();await settle();},fault:action=>failure=action,saved:()=>({state,saves,publishes,calls,windows}),input:(selector,value,event='input')=>{const e=d.querySelector(selector);assert(e,'Missing '+selector);e.value=value;e.dispatchEvent(new w.Event(event,{bubbles:true}));}};
}
(async()=>{
 const a=await app();try{
 check(a.rows().length===4&&a.rows().includes('Skarb piratów')&&!a.rows().includes('Wielkie puzzle'),'initial view contains one board category only');
 await a.click('[data-action="select-catalog"][data-catalog="custom"]');
 check(a.rows().length===5&&a.rows().includes('Wielkie puzzle')&&!a.rows().includes('Skarb piratów'),'other-games view excludes board products');
 check(a.d.querySelectorAll('[data-action="select-category"]').length===1,'category controls belong to selected catalog');
 a.input('#product-search','memory');check(JSON.stringify(a.rows())===JSON.stringify(['Wielkie memory']),'search is scoped to chosen category');
 await a.click('[data-action="select-catalog"][data-catalog="boards"]');
 check(a.d.querySelector('#product-search').value===''&&a.rows().length===4,'catalog switching resets search and selects its first category');
 await a.click('[data-action="select-category"][data-category="dla-szkol"]');
 check(a.rows().length===4&&a.rows().includes('Zostań kierowcą')&&!a.rows().includes('Farmer'),'category switching shows that category only');
 check(a.saved().saves===0&&!a.d.querySelector('#save-button')&&a.d.querySelector('#publish-button').disabled,'filtering does not modify content or save to the API');
 await a.click('[data-action="select-category"][data-category="przygodowe"]');
 await a.click('[data-action="move-product"][data-id="gra-skarb-piratow"][data-offset="1"]');
 check(a.rows()[0]==='Farmer'&&a.rows()[1]==='Skarb piratów','arrows move within category across interleaved global records');
 await a.click('a[href="#products/gra-farmer"]');
 check(a.d.querySelectorAll('.product-order li').length===4&&a.d.querySelectorAll('.product-order img').length===4,'editor shows names, miniatures and numbers in the selected category');
 a.input('[name="product.category"]','dla-szkol','change');await settle();
 check(a.d.querySelectorAll('.product-order li').length===5,'changing category refreshes visible product ordering');
 for(let i=0;i<4;i++){const up=a.d.querySelector('[data-action="move-product"][data-id="gra-farmer"][data-offset="-1"]');if(!up.disabled)await a.click('[data-action="move-product"][data-id="gra-farmer"][data-offset="-1"]');}
 await a.click('[data-action="back-products"]');
 check(a.d.querySelector('[data-category="dla-szkol"]').getAttribute('aria-pressed')==='true'&&a.rows()[0]==='Farmer','back returns to edited category with the selected order');
 check(!a.d.querySelector('#publish-button').disabled,'unsaved changes can be published directly');await a.click('#publish-button');await a.click('[data-action="confirm-publish"]');check(a.saved().saves===1&&a.saved().publishes===1,'one publication saves changes then publishes with the new revision');
 check(a.saved().state.products.filter(p=>p.category==='customowe').length===5,'editing one category preserves products in the other catalog');
 await a.click('[data-action="select-catalog"][data-catalog="custom"]');
 await a.click('a[href="#products/new"]');
 check(a.d.querySelector('[name="product.category"]').value==='customowe','new product inherits selected catalog and category');
 a.input('[name="product.kind"]','board','change');await settle();a.input('[name="variant-preset.0"]','4 × 4 m','change');await settle();
 check(a.d.querySelector('[name="variant.0.label"]').value==='4 × 4 m','ready-made dimensions can be chosen without typing');
 check(a.d.querySelector('[name="variant.0.net"]').value==='2000','choosing a dimension preserves explicitly entered prices');
 await a.click('[data-action="preview-product"]');check(a.saved().windows.at(-1).location.href.includes('?preview=1')&&a.saved().saves===2,'new product preview saves automatically and opens a tab');
 await a.click('[data-action="product-image"]');await a.click('[data-action="choose-image"]');
 check(a.d.querySelector('.image-editor img').getAttribute('src')==='/assets/oferta-farmer.webp','library selection updates the product image');
 check(!a.d.querySelector('#save-button')&&!a.d.querySelector('#publish-button').disabled,'image changes enable publication without a manual save step');
 }finally{a.dom.window.close();}
 const readonly=await app('viewer');try{await readonly.click('[data-action="select-catalog"][data-catalog="custom"]');check(readonly.rows().length===5&&!readonly.d.querySelector('[data-action="delete-product"]')&&!readonly.d.querySelector('[data-action="move-product"]'),'viewer can browse separate catalogs without edit controls');}finally{readonly.dom.window.close();}
 const emptySeed=structuredClone(seed);emptySeed.categories=emptySeed.categories.filter(c=>c.catalog==='boards');emptySeed.products=emptySeed.products.filter(p=>p.category!=='customowe');const empty=await app('admin',emptySeed);try{await empty.click('[data-action="select-catalog"][data-catalog="custom"]');check(empty.rows().length===0&&[...empty.d.querySelectorAll('.heading-actions button')].some(b=>b.disabled),'empty catalog does not leak products from another catalog');await empty.click('[data-action="add-category"]');check(empty.d.querySelector('#category-form').elements.catalog.value==='custom','new-category form inherits selected empty catalog');}finally{empty.dom.window.close();}
 const failureTest=await app();try{await failureTest.click('a[href="#products/gra-skarb-piratow"]');failureTest.input('[name="product.name"]','Zmiana do zachowania');failureTest.fault('save');await failureTest.click('#publish-button');await failureTest.click('[data-action="confirm-publish"]');check(failureTest.saved().publishes===0&&!failureTest.d.querySelector('#publish-button').disabled&&failureTest.d.querySelector('[name="product.name"]').value==='Zmiana do zachowania','failed save never publishes old content or loses unsaved changes');check(failureTest.d.querySelector('#toast').textContent.includes('Utracono połączenie'),'network failure has a useful Polish explanation');failureTest.d.querySelector('#confirm-dialog').close();failureTest.fault('media');await failureTest.click('[data-action="product-image"]');check(failureTest.d.querySelector('#media-dialog').open&&failureTest.d.querySelector('#media-message').textContent.includes('Utracono połączenie'),'library errors remain visible inside an open dialog');failureTest.fault(null);await failureTest.click('[data-action="close-media"]');await failureTest.click('[data-action="product-image"]');check(failureTest.d.querySelectorAll('[data-action="choose-image"]').length===1,'library can be retried after a failed request');}finally{failureTest.dom.window.close();}
 console.log(checks+' panel catalog-view checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
