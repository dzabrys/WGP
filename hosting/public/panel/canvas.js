/* Editing canvas: trusted same-origin document, with all public site scripts removed. */
(()=>{'use strict';
const origin=location.origin,file=document.body.dataset.wgpCanvas;
const baseline=document.body.innerHTML;let model={changes:{},added:[],order:{}},selected=null,drag=null,editingText=false,settling=false,landing=null,suppressClick=false;
const q=id=>document.querySelector('[data-wgp-node="'+id+'"]');
const id=n=>n?.dataset?.wgpNode;
const send=(kind,data={})=>parent.postMessage({kind:'wgp:'+kind,file,...data},origin);
const children=n=>Array.from(n?.children||[]).filter(x=>id(x));
const componentSelector='.product-media-column,.product-purchase-column,.product-visual,.product-heading,.product-copy,.audience,.game-card,.catalog-card,.hero-carousel,.steps>li,.feature,.brand,.game-facts>div';
function moveUnit(n){if(n?.matches('a.button,button'))return n;const unit=n?.closest(componentSelector);if(unit&&(n.dataset.wgpContainer==='1'||n.tagName==='IMG'))return unit.closest('.product-media-column,.product-purchase-column')||unit;return n;}
function visualChildren(p){
 const layout=getComputedStyle(p),items=children(p).map(node=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node),shift=moves.has(node)?(style.translate||'0 0').split(/\s+/).map(parseFloat):[0,0];return{node,rect:{left:box.left-(shift[0]||0),top:box.top-(shift[1]||0),width:box.width,height:box.height},style};}).filter(item=>item.style.display!=='none'&&!['absolute','fixed'].includes(item.style.position)&&item.rect.width>0&&item.rect.height>0);
 const horizontal=layout.display.includes('flex')&&layout.flexDirection.startsWith('row')&&layout.flexWrap!=='wrap',rtl=layout.direction==='rtl';
 items.sort((a,b)=>{if(horizontal)return rtl?b.rect.left-a.rect.left:a.rect.left-b.rect.left;const sameRow=Math.abs(a.rect.top-b.rect.top)<Math.max(3,Math.min(a.rect.height,b.rect.height)*.35);return sameRow?(rtl?b.rect.left-a.rect.left:a.rect.left-b.rect.left):a.rect.top-b.rect.top;});
 return items.map(item=>item.node);
}
function canonicalize(p){
 const layout=getComputedStyle(p);if(!/grid|flex/.test(layout.display))return;
 const ordered=visualChildren(p),visible=new Set(ordered),current=children(p).filter(n=>visible.has(n));if(current.every((n,i)=>n===ordered[i]))return;
 let index=0;const list=children(p).map(n=>visible.has(n)?ordered[index++]:n);p.dataset.wgpArranged='1';let anchor=null;
 for(const n of list.reverse()){if(n.dataset.wgpMovable==='1'){p.insertBefore(n,anchor);anchor=n;}else if(n.parentElement===p)anchor=n;}
 window.WGPVisualLayout?.refresh();
}
const textTags=new Set(['H1','H2','H3','H4','P','SPAN','STRONG','EM','SMALL','A','BUTTON','SUMMARY','LABEL','LI','DT','DD','FIGCAPTION']);
const peek=new Map();let peekKey=null;
function clearPeek(){for(const [n,old]of peek){if(old.style===null)n.removeAttribute('style');else n.setAttribute('style',old.style);if(old.open!==undefined)n.open=old.open;}peek.clear();}
function revealNode(n){
 if(!n)return;for(let p=n;p&&p!==document.body;p=p.parentElement){const style=getComputedStyle(p),closed=p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope>summary')?.contains(n);
  if(style.display==='none'||style.visibility==='hidden'||closed){peek.set(p,{style:p.getAttribute('style'),open:p.tagName==='DETAILS'?p.open:undefined});if(style.display==='none')p.style.setProperty('display','block','important');if(style.visibility==='hidden')p.style.setProperty('visibility','visible','important');if(closed)p.open=true;}
 }
}
function textNode(n){return textTags.has(n.tagName)&&[...n.querySelectorAll('*')].every(child=>['BR','SPAN','STRONG','EM','SMALL','B','I'].includes(child.tagName));}
function descriptor(n){const style=getComputedStyle(n),hex=value=>{const rgb=value.match(/\d+/g);return rgb?.length>=3?'#'+rgb.slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join(''):'#ffffff';};const unit=moveUnit(n),siblings=visualChildren(unit.parentElement),index=siblings.indexOf(unit);return{moveParent:id(unit.parentElement),visible:n.getClientRects().length>0&&style.display!=='none',decorative:n.getAttribute('aria-hidden')==='true',canUp:index>0,canDown:index>=0&&index<siblings.length-1,computed:{fontSize:Math.round(parseFloat(style.fontSize)),color:hex(style.color),backgroundColor:style.backgroundColor==='transparent'||/rgba\([^)]*,\s*0\s*\)/.test(style.backgroundColor)?null:hex(style.backgroundColor),fontWeight:style.fontWeight,padding:Math.round(parseFloat(style.paddingTop)||0),marginTop:Math.round(parseFloat(style.marginTop)||0),marginBottom:Math.round(parseFloat(style.marginBottom)||0),borderRadius:Math.round(parseFloat(style.borderRadius)||0),gap:Math.round(parseFloat(style.gap)||0)},id:id(n),tag:n.tagName.toLowerCase(),parent:id(n.parentElement)||null,root:n.dataset.wgpRoot,container:n.dataset.wgpContainer==='1',movable:unit.dataset.wgpMovable==='1',type:n.tagName==='IMG'?'image':textNode(n)?'text':'object',text:textNode(n)?(window.WGPVisualLayout?.readText(n)??n.textContent):'',image:n.tagName==='IMG'?n.getAttribute('src'):'',link:n.tagName==='A'?n.getAttribute('href'):null,label:((n.tagName==='IMG'?n.alt:'')||n.querySelector('h1,h2,h3')?.innerText||n.querySelector('h1,h2,h3')?.textContent||n.innerText||n.textContent||n.tagName).trim().replace(/\s+/g,' ').slice(0,75),product:n.closest('[data-wgp-key^="product-"]')?.dataset.wgpKey?.slice(8)||null,hidden:n.dataset.wgpHidden==='1'};}
function manifest(){return Array.from(document.querySelectorAll('[data-wgp-node]')).map(descriptor);}
function css(style){return Object.entries(style||{}).map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+v+(['padding','marginTop','marginBottom','gap','fontSize','borderRadius','maxWidth'].includes(k)?'px':'')+'!important;').join('');}
function applyChange(n,c){if(c.text!==undefined||c.style||c.mobile)n.dataset.wgpEdited='1';if(c.text!==undefined&&textNode(n)){if(window.WGPVisualLayout)window.WGPVisualLayout[c.textFormat==='lines'?'setLines':'setText'](n,c.text);else n.textContent=c.text;}if(c.image!==undefined&&n.tagName==='IMG'){n.src='/'+c.image;n.removeAttribute('srcset');if(n.parentElement.tagName==='PICTURE')n.parentElement.querySelectorAll('source').forEach(s=>s.remove());}if(c.link!==undefined&&n.tagName==='A')n.setAttribute('href',c.link);if(c.hidden){n.dataset.wgpHidden='1';if(n.parentElement?.dataset.wgpContainer==='1')n.parentElement.dataset.wgpHideFlow='1';}}
function compatible(n,p){if(!n||!p||n===p||n.contains(p)||p.tagName==='A'||p.dataset.wgpContainer!=='1'||n.dataset.wgpRoot!==p.dataset.wgpRoot)return false;if(['UL','OL'].includes(p.tagName)&&n.tagName!=='LI')return false;if((n.tagName==='A'||n.querySelector('a'))&&p.closest('a'))return false;return true;}
function sync(next){
 if(drag)finishDrag(true,false);
 if(landing){const active=landing;active.notify=false;active.animation.cancel();active.done();}
 clearPeek();
 const oldScroll=[scrollX,scrollY];model=next||{changes:{},added:[],order:{}};document.body.innerHTML=baseline;
 let remaining=[...(model.added||[])];for(let i=0;remaining.length&&i<30;i++){const later=[];for(const node of remaining){const p=q(node.parent);if(!p){later.push(node);continue;}const n=document.createElement(node.tag);n.dataset.wgpNode=node.id;n.dataset.wgpRoot=p.dataset.wgpRoot;n.dataset.wgpContainer=['section','div','a'].includes(node.tag)?'1':'0';n.dataset.wgpMovable='1';if(node.tag==='img'){n.alt='';n.style.maxWidth='100%';}p.append(n);applyChange(n,node.content||{});}remaining=later;}
 const originalOrders=new Map([...document.querySelectorAll('[data-wgp-container="1"]')].map(p=>[p,children(p).map(id).join('|')])),originalParents=new Map([...document.querySelectorAll('[data-wgp-node]')].map(n=>[n,n.parentElement]));
 for(const [p,list]of Object.entries(model.order||{})){
  const target=q(p);if(!target)continue;let anchor=null;
  // Replay around fixed siblings (for example a form) without relocating those siblings.
  for(const key of [...list].reverse()){const n=q(key);if(!n)continue;if(n.dataset.wgpMovable==='1'&&compatible(n,target)){target.insertBefore(n,anchor);anchor=n;}else if(n.parentElement===target)anchor=n;}
 }
 for(const key of model.flow||[]){const p=q(key);if(p?.dataset.wgpContainer==='1')p.dataset.wgpFlow='1';}
 for(const [p,original]of originalOrders){if(children(p).map(id).join('|')!==original)p.dataset.wgpArranged='1';else p.removeAttribute('data-wgp-arranged');}
 for(const [n,p]of originalParents)if(n.parentElement!==p)n.dataset.wgpTransferred='1';
 let styles='';const changes={};for(const node of model.added||[])changes[node.id]=node.content||{};for(const [key,c]of Object.entries(model.changes||{}))changes[key]={...changes[key],...c,style:{...(changes[key]?.style||{}),...(c.style||{})},mobile:{...(changes[key]?.mobile||{}),...(c.mobile||{})}};
 for(const [key,c]of Object.entries(changes)){const n=q(key);if(!n)continue;applyChange(n,c);if(c.style?.fontSize!==undefined)n.dataset.wgpFontCustom='1';if(c.style?.width!==undefined)n.dataset.wgpWidthCustom='1';if(c.mobile?.width!==undefined)n.dataset.wgpMobileWidthCustom='1';if(c.style?.color!==undefined)n.dataset.wgpColorCustom='1';if(c.mobile?.color!==undefined)n.dataset.wgpMobileColorCustom='1';if(c.mobile?.fontSize!==undefined)n.dataset.wgpMobileFontCustom='1';for(const [scope,device]of [['style','desktop'],['mobile','mobile']])if(c[scope]?.gridTemplateColumns!==undefined||c[scope]?.flexDirection!==undefined||['grid','flex'].includes(c[scope]?.display))n.setAttribute('data-wgp-layout-'+device,'1');const selector='[data-wgp-node="'+key+'"]';if(c.style)styles+=selector+'{'+css(c.style)+'}';if(c.mobile)styles+='@media(max-width:760px){'+selector+'{'+css(c.mobile)+'}}';}
 const style=document.createElement('style');style.id='wgp-live-model';style.textContent=styles;document.head.querySelector('#wgp-live-model')?.remove();document.head.append(style);
 window.WGPVisualLayout?.refresh();buildTools();scrollTo(...oldScroll);select(selected,false);send('manifest',{nodes:manifest(),main:id(document.querySelector('main'))});
}
function buildTools(){const tools=document.createElement('div');tools.id='wgp-tools';tools.hidden=true;tools.innerHTML='<span id="wgp-selection-label"></span><div><button type="button" data-canvas="drag" aria-label="Przeciągnij zaznaczony element" title="Przeciągnij">⠿</button><button type="button" data-canvas="parent" aria-label="Zaznacz cały blok" title="Zaznacz cały blok">▣</button><button type="button" data-canvas="edit" aria-label="Edytuj tekst" title="Edytuj tekst">✎</button><button type="button" data-canvas="up" aria-label="Przesuń element wyżej">↑</button><button type="button" data-canvas="down" aria-label="Przesuń element niżej">↓</button></div>';document.body.append(tools);const box=document.createElement('div');box.id='wgp-selection-box';box.hidden=true;document.body.append(box);}
function position(){const n=q(selected),tools=document.querySelector('#wgp-tools'),box=document.querySelector('#wgp-selection-box');if(drag?.active||settling||!n||(n.dataset.wgpHidden==='1'&&peekKey!==selected)){if(tools)tools.hidden=true;if(box)box.hidden=true;return;}const r=n.getBoundingClientRect();if(!r.width||!r.height)return;box.hidden=false;Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});tools.hidden=false;Object.assign(tools.style,{left:Math.max(4,Math.min(r.left,innerWidth-270))+'px',top:Math.max(4,r.top-58)+'px'});tools.querySelector('#wgp-selection-label').textContent=(n.tagName==='IMG'?'Zdjęcie':/^H[1-6]$/.test(n.tagName)?'Nagłówek':textNode(n)?'Tekst':'Blok')+' · '+descriptor(n).label.slice(0,36);const unit=moveUnit(n);tools.querySelector('[data-canvas="drag"]').disabled=unit.dataset.wgpMovable!=='1';tools.querySelector('[data-canvas="drag"]').title=unit===n?'Przeciągnij':'Przeciągnij całą kartę';tools.querySelector('[data-canvas="edit"]').hidden=!textNode(n);const siblings=visualChildren(unit.parentElement),index=siblings.indexOf(unit);tools.querySelector('[data-canvas="up"]').disabled=unit.dataset.wgpMovable!=='1'||index<1;tools.querySelector('[data-canvas="down"]').disabled=unit.dataset.wgpMovable!=='1'||index===siblings.length-1;}
function select(key,notify=true,reveal=false){const hadPeek=peek.size>0,n=q(key),keepPeek=reveal||key===peekKey||[...peek.keys()].some(p=>p.contains(n));clearPeek();peekKey=keepPeek?key:null;if(keepPeek)revealNode(n);if(hadPeek||peek.size)window.WGPVisualLayout?.refresh();selected=key;n?.setAttribute('data-wgp-selected','1');document.querySelectorAll('[data-wgp-selected]').forEach(n=>{if(id(n)!==key)n.removeAttribute('data-wgp-selected');});position();if(notify)send('selection',{node:n?descriptor(n):null,nodes:manifest()});}
function commitMove(n,p,before){n=moveUnit(n);if(n.dataset.wgpMovable!=='1'||!compatible(n,p)||n===before)return;const previous=n.parentElement;if(p===previous&&!before&&visualChildren(p).at(-1)===n)return;canonicalize(previous);if(p!==previous)canonicalize(p);if(previous!==p)n.dataset.wgpTransferred='1';p.insertBefore(n,before||null);previous.dataset.wgpArranged='1';p.dataset.wgpArranged='1';window.WGPVisualLayout?.refresh();const orders={[id(previous)]:children(previous).map(id),[id(p)]:children(p).map(id)};send('move',{local:true,id:id(n),parent:id(p),orders,flow:[...new Set([id(previous),id(p)])]});select(id(n));}
function shift(direction){const n=moveUnit(q(selected));if(!n)return;const siblings=visualChildren(n.parentElement),index=siblings.indexOf(n),other=siblings[index+direction];if(!other)return;canonicalize(n.parentElement);commitMove(n,n.parentElement,direction<0?other:other.nextSibling);}
function edit(){const n=q(selected);if(!n||!textNode(n))return;const original=window.WGPVisualLayout?.readText(n)??n.textContent,originalHTML=n.innerHTML;editingText=true;n.contentEditable='plaintext-only';n.focus();const range=document.createRange();range.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(range);const cancel=e=>{if(e.key==='Escape'){n.textContent=original;n.blur();}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();n.blur();}};n.addEventListener('keydown',cancel);n.addEventListener('blur',()=>{editingText=false;n.removeAttribute('contenteditable');n.removeEventListener('keydown',cancel);const value=(n.innerText??window.WGPVisualLayout?.readText(n)??n.textContent).slice(0,6000);n.innerHTML=originalHTML;applyChange(n,{text:value,textFormat:'lines'});if(value!==original)send('set',{local:true,id:id(n),patch:{text:value,textFormat:'lines'}});window.WGPVisualLayout?.refresh();select(id(n));},{once:true});}
function action(name){if(name==='parent'){const current=q(selected),effective=moveUnit(current);if(effective&&effective!==current){select(id(effective));return;}let n=current?.parentElement;if(current?.dataset.wgpMovable==='0'&&n&&(textNode(n)||n.matches('a.button,button'))&&n.dataset.wgpMovable==='1'){select(id(n));return;}const unit=current?.closest(componentSelector);if(unit&&unit!==current){select(id(unit));return;}while(n&&(!id(n)||(n.dataset.wgpContainer!=='1'&&n.dataset.wgpMovable!=='1')))n=n.parentElement;if(n)select(id(n));}if(name==='edit')edit();if(name==='up')shift(-1);if(name==='down')shift(1);}
// Live sorting uses the actual page layout; only the lifted copy leaves document flow.
const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
const moves=new Map();
function animateLayout(elements,change){
 const roots=[...new Set(elements)].filter(n=>n?.isConnected&&!elements.some(p=>p!==n&&p?.contains(n)));
 const first=new Map(roots.map(n=>[n,n.getBoundingClientRect()]));
 roots.forEach(n=>{moves.get(n)?.cancel();moves.delete(n);});
 change();window.WGPVisualLayout?.refresh();
 if(!motion())return;
 for(const n of roots){if(!n.isConnected)continue;const a=first.get(n),b=n.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;
  if(Math.abs(dx)<.5&&Math.abs(dy)<.5)continue;
  const animation=n.animate([{translate:`${dx}px ${dy}px`},{translate:'0 0'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
  moves.set(n,animation);animation.onfinish=()=>{if(moves.get(n)===animation)moves.delete(n);};
 }
}
function rememberParent(d,p){if(!d.parents.has(p))d.parents.set(p,{arranged:p.getAttribute('data-wgp-arranged'),order:children(p).map(id).join('|'),visual:visualChildren(p).map(id).join('|'),nodes:[...p.childNodes]});}
function restoreArrangement(d){for(const [p,original]of d.parents){if(children(p).map(id).join('|')!==original.order)continue;if(original.arranged===null)p.removeAttribute('data-wgp-arranged');else p.setAttribute('data-wgp-arranged',original.arranged);}}
function liftedCopy(n,r){
 const clone=n.cloneNode(true),originals=[n,...n.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 // Freeze computed styles so a card keeps its appearance outside its original grid.
 originals.forEach((source,i)=>{const copy=copies[i],style=getComputedStyle(source);for(const property of style)copy.style.setProperty(property,style.getPropertyValue(property));
  for(const attribute of [...copy.attributes])if(attribute.name==='id'||attribute.name.startsWith('data-wgp-')||attribute.name.startsWith('on'))copy.removeAttribute(attribute.name);
  copy.removeAttribute('contenteditable');copy.removeAttribute('autofocus');
 });
 clone.id='wgp-drag-copy';clone.inert=true;clone.setAttribute('aria-hidden','true');
 for(const [property,value]of Object.entries({position:'fixed',left:'0',top:'0',width:r.width+'px',height:r.height+'px',margin:'0',boxSizing:'border-box',maxWidth:'none',minWidth:'0',transform:'none',pointerEvents:'none',zIndex:'2147483605'}))clone.style.setProperty(property.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),value,'important');
 clone.style.setProperty('box-shadow','0 20px 55px #08285a38,0 0 0 2px #2680df','important');
 document.body.append(clone);return clone;
}
function beginDrag(d){
 d.active=true;d.rect=d.node.getBoundingClientRect();d.overlay=liftedCopy(d.node,d.rect);rememberParent(d,d.node.parentElement);
 d.node.dataset.wgpDragSource='1';document.body.classList.add('wgp-dragging');position();
 canonicalize(d.node.parentElement);
 const hint=document.createElement('div');hint.id='wgp-drag-hint';hint.textContent='Przesuwaj, aby zobaczyć układ · Esc — anuluj';document.body.append(hint);d.hint=hint;
 d.frame=requestAnimationFrame(dragFrame);
}
function startDrag(e){
 if(editingText)document.activeElement?.blur();
 const n=moveUnit(q(selected));if(drag||settling||!n||n.dataset.wgpMovable!=='1'||e.button!==0||e.isPrimary===false)return;
 e.preventDefault();if(id(n)!==selected)select(id(n));const handle=e.target.closest('[data-canvas="drag"]');
 drag={node:n,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,pointer:e.pointerId,handle,active:false,parents:new Map(),originalParent:n.parentElement,originalNext:n.nextSibling,originalTransferred:n.getAttribute('data-wgp-transferred'),lastMove:0,lastX:e.clientX,lastY:e.clientY};
 handle.setPointerCapture?.(e.pointerId);
}
function dragging(e){
 if(!drag||e.pointerId!==drag.pointer)return;
 e.preventDefault();drag.x=e.clientX;drag.y=e.clientY;
 if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>=5)beginDrag(drag);
}
function containsPoint(r,x,y,inset=0){return x>=r.left+inset&&x<=r.right-inset&&y>=r.top+inset&&y<=r.bottom-inset;}
function slotAt(n,p,target,x,y){
 const siblings=children(p).filter(c=>c!==n&&c.dataset.wgpHidden!=='1'),style=getComputedStyle(p);
 const row=(style.display==='flex'&&style.flexDirection.startsWith('row'))||(style.display==='grid'&&style.gridTemplateColumns.split(' ').length>1);
 if(!target||target===p){
  if(!siblings.length)return{parent:p,before:null};
  // Gaps between cards also accept drops; use the nearest rectangle, not just hit testing.
  target=siblings.reduce((best,c)=>{const r=c.getBoundingClientRect(),distance=Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom));return !best||distance<best.distance?{node:c,distance}:best;},null).node;
 }
 const r=target.getBoundingClientRect();let after;
 if(row){after=y>r.bottom||y>=r.top&&x>r.left+r.width/2; if(style.direction==='rtl'&&y>=r.top&&y<=r.bottom)after=x<r.left+r.width/2;}
 else after=y>r.top+r.height/2;
 return{parent:p,before:after?target.nextSibling:target,anchor:target,after};
}
function liveTarget(d){
 const {node:n,x,y}=d;if(x<0||x>innerWidth||y<0||y>innerHeight)return null;
 const hover=document.elementFromPoint(x,y);let target=hover?.closest('[data-wgp-node]');
 if(!target||target.dataset.wgpRoot!==n.dataset.wgpRoot||n===target||n.contains(target))return null;
 const current=d.originalParent,r=n.getBoundingClientRect();
 if(containsPoint(r,x,y,3))return null;
 // Keep sorting at the selected block's level when the pointer crosses its text or image.
 let sibling=target;while(sibling.parentElement!==current&&id(sibling.parentElement))sibling=sibling.parentElement;
 if(sibling.parentElement===current){
  target=sibling;
  return slotAt(n,current,target,x,y);
 }
 if(target===current)return slotAt(n,current,null,x,y);
 // Outside the original group, prefer an actual container under the pointer.
 let p=target.dataset.wgpContainer==='1'&&target.tagName!==n.tagName&&hover===target?target:target.parentElement;
 while(p&&!compatible(n,p))p=p.parentElement;
 if(!p)return null;
 if(textNode(n)&&p.matches('.audience,.game-card,.catalog-card,.hero-carousel')){const copy=p.querySelector('.audience-copy,.hero-copy,.game-copy,.catalog-copy');if(compatible(n,copy))p=copy;}
 // A word crossing the gutter between large panels is not a new panel in that grid.
 if(textNode(n)&&p!==d.originalParent){const items=children(p);if(items.length&&!items.some(textNode)&&items.some(item=>item.dataset.wgpContainer==='1'))return null;}
 let child=target;while(child&&child.parentElement!==p)child=child.parentElement;
 p.dataset.wgpDropContainer='1';return slotAt(n,p,child,x,y);
}
function previewMove(d,target,now,immediate=false){
 if(!target||!compatible(d.node,target.parent)){d.cross=null;return;}
 const {node:n}=d,{parent:p}=target;let before=target.before;
 if(before===n)before=n.nextSibling;
 if(p===n.parentElement&&before===n.nextSibling)return;
 if(!immediate&&p!==n.parentElement&&p!==d.originalParent){if(d.cross?.parent!==p)d.cross={parent:p,since:now};if(now-d.cross.since<130)return;}else d.cross=null;
 // Brief hysteresis prevents differently sized neighbours swapping back during their animation.
 if(now-d.lastMove<110&&Math.hypot(d.x-d.lastX,d.y-d.lastY)<10)return;
 const previous=n.parentElement;rememberParent(d,previous);rememberParent(d,p);
 animateLayout([...children(previous),...children(p)].filter(c=>c!==n),()=>{canonicalize(p);if(target.anchor)before=target.after?target.anchor.nextSibling:target.anchor;previous.dataset.wgpArranged='1';p.dataset.wgpArranged='1';p.insertBefore(n,before||null);if(p!==d.originalParent)n.dataset.wgpTransferred='1';else if(d.originalTransferred===null)n.removeAttribute('data-wgp-transferred');});
 d.lastMove=now;d.lastX=d.x;d.lastY=d.y;
}
function scrollDrag(d,elapsed){
 const edge=Math.min(80,innerHeight*.15),speed=d.y<edge?-Math.pow(1-d.y/edge,2):d.y>innerHeight-edge?Math.pow(1-(innerHeight-d.y)/edge,2):0;
 if(!speed||d.x<0||d.x>innerWidth)return;
 // Scroll the nearest overflow panel first, then the document. Continue without new pointer events.
 const amount=Math.max(-1,Math.min(1,speed))*Math.min(elapsed,32)*.8;
 for(let p=d.node.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight){const old=p.scrollTop;p.scrollTop+=amount;if(p.scrollTop!==old)return;}}
 scrollBy(0,amount);
}
function dragFrame(now){
 const d=drag;if(!d?.active)return;
 const dx=d.x-d.startX,dy=d.y-d.startY;
 d.overlay.style.translate=`${d.rect.left+dx}px ${d.rect.top+dy}px`;
 document.querySelectorAll('[data-wgp-drop-container]').forEach(n=>n.removeAttribute('data-wgp-drop-container'));
 scrollDrag(d,d.time?now-d.time:16);d.time=now;
 previewMove(d,liveTarget(d),now);
 d.frame=requestAnimationFrame(dragFrame);
}
function finishDrag(cancel=false,notify=true){
 const d=drag;if(!d)return;drag=null;cancelAnimationFrame(d.frame);
 try{if(d.handle.hasPointerCapture?.(d.pointer))d.handle.releasePointerCapture(d.pointer);}catch{}
 if(!d.active)return;
 suppressClick=true;setTimeout(()=>{suppressClick=false;},0);d.hint.remove();
 document.querySelectorAll('[data-wgp-drop-container]').forEach(n=>n.removeAttribute('data-wgp-drop-container'));
 const changedParents=[...d.parents].filter(([p,old])=>visualChildren(p).map(id).join('|')!==old.visual),changed=!cancel&&changedParents.length>0;
 if(!changed)animateLayout([...d.parents.keys()].flatMap(children).filter(n=>n!==d.node),()=>{for(const [p,old]of d.parents)p.append(...old.nodes);if(d.originalTransferred===null)d.node.removeAttribute('data-wgp-transferred');else d.node.setAttribute('data-wgp-transferred',d.originalTransferred);restoreArrangement(d);});
 else for(const [p,old]of d.parents)if(!changedParents.some(([target])=>target===p)){p.append(...old.nodes);if(old.arranged===null)p.removeAttribute('data-wgp-arranged');else p.setAttribute('data-wgp-arranged',old.arranged);}
 const orders=Object.fromEntries([...d.parents.keys()].map(p=>[id(p),children(p).map(id)]));
 const destination=d.node.getBoundingClientRect(),from=d.overlay.getBoundingClientRect();
 document.body.classList.remove('wgp-dragging');settling=true;d.notify=notify;landing=d;
 const done=()=>{
  if(d.finished)return;d.finished=true;landing=null;
  d.overlay.remove();d.node.removeAttribute('data-wgp-drag-source');settling=false;
  if(d.notify){select(id(d.node));document.querySelector('[data-canvas="drag"]')?.focus({preventScroll:true});}
 };
 d.done=done;
 // Record at release so Undo works while the lifted copy is still landing.
 if(notify&&changed){send('move',{local:true,id:id(d.node),parent:id(d.node.parentElement),orders,flow:changedParents.map(([p])=>id(p))});select(id(d.node));}
 if(!notify||!motion()){done();return;}
 // Land the lifted card into the space already previewed, including its new responsive size.
 const animation=d.overlay.animate([{translate:`${from.left}px ${from.top}px`,width:from.width+'px',height:from.height+'px'},{translate:`${destination.left}px ${destination.top}px`,width:destination.width+'px',height:destination.height+'px'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
 d.animation=animation;
 // Release frozen dimensions so the landing animation can match the new slot.
 d.overlay.style.removeProperty('translate');d.overlay.style.removeProperty('width');d.overlay.style.removeProperty('height');
 animation.onfinish=done;animation.oncancel=done;
}
function endDrag(e){if(drag&&e.pointerId===drag.pointer){drag.x=e.clientX;drag.y=e.clientY;if(drag.active)previewMove(drag,liveTarget(drag),performance.now(),true);finishDrag();}}

addEventListener('message',e=>{if(e.source!==parent||e.origin!==origin||e.data?.file!==file)return;const m=e.data;if(m.kind==='wgp:sync')sync(m.model);if(m.kind==='wgp:ack')model=m.model;if(m.kind==='wgp:select'){select(m.id,true,true);const n=q(m.id);n?.scrollIntoView({block:n.getBoundingClientRect().height>innerHeight*.8?'start':'center'});}if(m.kind==='wgp:action')action(m.action);if(m.kind==='wgp:move'){const n=q(m.id),p=q(m.parent);if(n&&p)commitMove(n,p,m.before?q(m.before):null);}});
document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();return;}const tool=e.target.closest('[data-canvas]');if(tool){e.preventDefault();action(tool.dataset.canvas);return;}if(e.target.closest('#wgp-tools')||editingText)return;e.preventDefault();e.stopImmediatePropagation();const n=e.target.closest('[data-wgp-node]');if(n)select(id(n));},true);
document.addEventListener('dblclick',e=>{if(e.target.closest('#wgp-tools'))return;e.preventDefault();const n=e.target.closest('[data-wgp-node]');if(n){select(id(n));edit();}},true);
document.addEventListener('submit',e=>e.preventDefault(),true);document.addEventListener('dragstart',e=>e.preventDefault());
document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-canvas="drag"]'))startDrag(e);});document.addEventListener('pointermove',dragging);document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pointer)finishDrag(true);});document.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.pointer)finishDrag(true);});addEventListener('blur',()=>finishDrag(true));
addEventListener('scroll',position,{passive:true});let resizeTick;addEventListener('resize',()=>{cancelAnimationFrame(resizeTick);resizeTick=requestAnimationFrame(()=>{position();send('manifest',{nodes:manifest(),main:id(document.querySelector('main'))});});});document.addEventListener('keydown',e=>{if(editingText)return;if(drag){if(e.key==='Escape'){e.preventDefault();finishDrag(true);}return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();send('history',{direction:e.shiftKey?'redo':'undo'});return;}if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();shift(e.key==='ArrowUp'?-1:1);}if(e.key==='Escape'){select(null);send('escape');}});
buildTools();send('ready');
})();
