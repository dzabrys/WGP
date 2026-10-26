/* Run against an isolated local CMS only. Exercises rendered/public behavior. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const base=process.env.CMS_TEST_URL||'http://127.0.0.1:4183';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Use an isolated local CMS.');
const account=JSON.parse(fs.readFileSync(process.env.CMS_TEST_ACCOUNT||'work/cms-sqlite-test/account.json','utf8'));
let csrf='',cookie='',checks=0,original;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
async function request(path,data){const r=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const set=r.headers.getSetCookie();if(set.length)cookie=set.map(x=>x.split(';')[0]).join('; ');const text=await r.text();let value;try{value=JSON.parse(text);}catch{}if(value?.csrf)csrf=value.csrf;return{status:r.status,text,value,dom:()=>new JSDOM(text).window.document};}
const api=(name,data)=>request('/panel/api/'+name,data);
async function save(state){const current=(await api('state')).value;const r=await api('save',{state,revision:current.revision});assert.equal(r.status,200,r.text);return r.value.revision;}
async function publish(){const r=await api('state');const p=await api('publish',{revision:r.value.revision});assert.equal(p.status,200,p.text);}
(async()=>{
 await api('boot');assert.equal((await api('login',account)).status,200);
 original=structuredClone((await api('state')).value.state);const state=structuredClone(original);
 check(state.categories.length===4,'existing categories migrate without changing content');
 state.categories.push({id:'gry-kontrolne',name:'Gry kontrolne <script>x</script>',description:'Opis kategorii.',catalog:'boards'},{id:'inne-kontrolne',name:'Inne kontrolne',description:'',catalog:'custom'});
 const members=state.products.slice(0,3);members.forEach(p=>p.category='gry-kontrolne');
 const [moved]=state.products.splice(2,1);state.products.unshift(moved);const expected=state.products.filter(p=>p.category==='gry-kontrolne').map(p=>p.url);
 const custom=state.products.find(p=>p.category==='customowe');custom.category='inne-kontrolne';
 state.appearance.featured=state.products.filter(p=>p.visible).slice(0,5).map(p=>p.id);
 await save(state);
 let r=await request('/index.html?preview=1');let d=r.dom();
 check(d.querySelectorAll('[data-product-slide]').length===5,'five games render in draft carousel');
 check(d.querySelectorAll('.carousel-dots [data-slide]').length===5,'carousel creates one control per game');
 check(d.querySelectorAll('[data-product-slide]:not([hidden])').length===1,'only the first slide starts visible');
 check(d.querySelector('#carousel-status').textContent.includes('z 5'),'accessible carousel count follows actual length');
 r=await request('/wielkie-gry-planszowe.html?preview=1');d=r.dom();
 check(d.querySelector('#gry-kontrolne h2').textContent==='Gry kontrolne <script>x</script>'&&!d.querySelector('#gry-kontrolne script'),'new category heading is escaped safely');
 check(d.querySelector('#gry-kontrolne').textContent.includes('Opis kategorii.'),'category description renders');
 check(JSON.stringify([...d.querySelectorAll('#gry-kontrolne .catalog-card>a')].map(a=>a.getAttribute('href').split('?')[0]))===JSON.stringify(expected),'product order follows chosen order inside category');
 check(d.querySelector('.catalog-topics a[href="#gry-kontrolne"]'),'category navigation includes new category');
 check(!d.querySelector('#inne-kontrolne'),'custom category stays outside board catalog');
 d=(await request('/inne.html?preview=1')).dom();check(d.querySelector('#inne-kontrolne .catalog-card'),'custom category appears on other-games page');
 const publicBefore=(await request('/index.html')).dom();check(publicBefore.querySelectorAll('[data-product-slide]').length===original.appearance.featured.length,'draft changes do not alter public carousel');
 await publish();d=(await request('/index.html')).dom();check(d.querySelectorAll('[data-product-slide]').length===5,'five-slide carousel publishes successfully');
 check((await api('export')).value.draft.categories.some(c=>c.id==='gry-kontrolne'),'categories are included in content backups');
 const victim=state.products[0];state.products=state.products.filter(p=>p.id!==victim.id);state.appearance.featured=state.appearance.featured.filter(id=>id!==victim.id);await save(state);
 check((await request('/'+victim.url)).status===200,'deletion stays private until publication');
 await publish();check((await request('/'+victim.url)).status===404,'deleted original product cannot reappear from its static template');
 d=(await request('/wielkie-gry-planszowe.html')).dom();check(![...d.querySelectorAll('.catalog-card>a')].some(a=>a.getAttribute('href')===victim.url),'deleted product leaves public category cards');
 const code=await request('/cms-catalog.js');check(!code.text.includes('"id":"'+victim.id+'"'),'deleted product leaves contact catalog');
 check((await request('/index.html')).dom().querySelectorAll('[data-product-slide]').length===4,'deleting a featured product reduces carousel length');
 check((await api('state')).value.state.deletedProducts.includes(victim.id),'deleted URL is retained for GitHub file removal');
 let invalid=structuredClone(state);invalid.products[0].category='nie-istnieje';let current=(await api('state')).value;check((await api('save',{state:invalid,revision:current.revision})).status===400,'unknown categories are rejected');
 invalid=structuredClone(state);invalid.appearance.featured=[state.products[0].id,state.products[0].id];check((await api('save',{state:invalid,revision:current.revision})).status===400,'duplicate carousel entries are rejected');
 const empty=structuredClone(state);empty.products=[];empty.appearance.featured=[];await save(empty);
 d=(await request('/index.html?preview=1')).dom();check(d.querySelectorAll('[data-product-slide]').length===0&&d.querySelector('.carousel-toolbar').hasAttribute('hidden'),'empty catalog renders without broken carousel controls');
 d=(await request('/wielkie-gry-planszowe.html?preview=1')).dom();check(d.querySelectorAll('.catalog-card').length===0,'empty catalog removes all original template cards');
 console.log(checks+' catalog-management checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(original){await save(original);await publish();console.log('Isolated catalog restored.');}});
