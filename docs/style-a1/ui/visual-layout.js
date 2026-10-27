/* Shared by the page canvas and published pages: reorder content, retain grid spans. */
(()=>{'use strict';
function tracks(value){return (value||'').replace(/\[[^\]]*\]/g,'').trim().split(/\s+(?![^()]*\))/).filter(v=>v&&v!=='none').length||1;}
function span(start,end,count){
 const explicit=/^span\s+(\d+)/.exec(end)||/^span\s+(\d+)/.exec(start);if(explicit)return Math.max(1,Math.min(count,Number(explicit[1])));
 const line=v=>{const n=Number(v);return Number.isInteger(n)&&n!==0?(n<0?count+2+n:n):null;};
 const a=line(start),b=line(end);return a!==null&&b!==null?Math.max(1,Math.min(count,Math.abs(b-a))):1;
}
function areaSpan(name,template){
 const rows=[...(template||'').matchAll(/"([^"]*)"/g)].map(m=>m[1].trim().split(/\s+/)),cells=[];
 rows.forEach((row,y)=>row.forEach((cell,x)=>{if(cell===name)cells.push([x,y]);}));
 return cells.length?{columns:Math.max(...cells.map(c=>c[0]))-Math.min(...cells.map(c=>c[0]))+1,rows:Math.max(...cells.map(c=>c[1]))-Math.min(...cells.map(c=>c[1]))+1}:null;
}
function placement(style,parent){
 const columns=tracks(parent.gridTemplateColumns),rows=tracks(parent.gridTemplateRows),named=areaSpan(style.gridArea,parent.gridTemplateAreas);
 const wide=named?.columns||span(style.gridColumnStart,style.gridColumnEnd,columns),tall=named?.rows||span(style.gridRowStart,style.gridRowEnd,rows);
 return{column:wide===columns&&wide>1?'1 / -1':`auto / span ${wide}`,row:`auto / span ${tall}`};
}
const transferred='[data-wgp-transferred="1"]{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;min-width:0;max-width:100%;overflow:visible!important}:is([data-wgp-flow],[data-wgp-edited]) :is(h1,h2,h3,h4,p),[data-wgp-edited]{overflow-wrap:anywhere}';
const rgb=value=>{const numbers=(value||'').match(/[\d.]+/g);return numbers?.length>=3?numbers.slice(0,3).map(Number):[255,255,255];};
function contrast(a,b){const light=color=>color.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),x=light(a),y=light(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function background(node){for(let p=node;p;p=p.parentElement){const color=getComputedStyle(p).backgroundColor;if(color&&color!=='transparent'&&!/rgba\([^)]*,\s*0\s*\)/.test(color))return rgb(color);}return[255,255,255];}
function refresh(){
 let sheet=document.querySelector('#wgp-grid-flow');if(!sheet){sheet=document.createElement('style');sheet.id='wgp-grid-flow';document.head.append(sheet);}sheet.textContent=transferred;
 const rules=[];
 for(const n of document.querySelectorAll('[data-wgp-transferred="1"]'))if(!n.hasAttribute('data-wgp-width-custom')&&!(innerWidth<=760&&n.hasAttribute('data-wgp-mobile-width-custom')))rules.push(`[data-wgp-node="${n.dataset.wgpNode}"]{width:auto!important}`);
 const flowParents=[...document.querySelectorAll('[data-wgp-arranged="1"],[data-wgp-flow],[data-wgp-hide-flow],[data-wgp-layout-desktop],[data-wgp-layout-mobile]')].filter(n=>n.dataset.wgpArranged==='1'||n.hasAttribute('data-wgp-flow')||n.hasAttribute('data-wgp-hide-flow')||n.hasAttribute('data-wgp-layout-desktop')||innerWidth<=760&&n.hasAttribute('data-wgp-layout-mobile'));
 for(const parent of flowParents){
  const key=parent.dataset.wgpNode;if(!key)continue;const selector=`[data-wgp-node="${key}"]`,layout=getComputedStyle(parent);
  if(layout.display==='grid'||layout.display==='inline-grid'){
   // Read the original responsive CSS before replacing explicit placement. Do not erase spans.
   const cells=[...parent.children].filter(n=>n.dataset.wgpNode).map(n=>({node:n,style:getComputedStyle(n)}));
   rules.push(`${selector}{grid-template-areas:none!important;grid-auto-flow:${layout.gridAutoFlow?.startsWith('column')?'column':'row'}!important}`);
   const visible=cells.filter(({style})=>style.display!=='none'&&!['absolute','fixed'].includes(style.position));
   for(const {node,style}of cells){if(style.display==='none'||['absolute','fixed'].includes(style.position))continue;const cell=placement(style,layout);if(parent.hasAttribute('data-wgp-hide-flow')&&visible.length===1)cell.column='1 / -1';
    rules.push(`${selector}>[data-wgp-node="${node.dataset.wgpNode}"]{grid-column:${cell.column}!important;grid-row:${cell.row}!important;order:0!important;min-width:0}`);
   }
  }else if(layout.display==='flex'||layout.display==='inline-flex'){rules.push(`${selector}>[data-wgp-node]{order:0!important;min-width:0}`);if(layout.flexDirection.endsWith('-reverse'))rules.push(`${selector}{flex-direction:${layout.flexDirection.startsWith('row')?'row':'column'}!important}`);}
 }
 for(const root of document.querySelectorAll('[data-wgp-transferred="1"]'))if(/^H[1-6]$/.test(root.tagName)&&!root.hasAttribute('data-wgp-font-custom')&&!(innerWidth<=760&&root.hasAttribute('data-wgp-mobile-font-custom'))){
  const peer=[...root.parentElement.children].find(n=>n!==root&&/^H[1-6]$/.test(n.tagName)&&getComputedStyle(n).display!=='none');
  if(peer){const size=parseFloat(getComputedStyle(peer).fontSize);if(Number.isFinite(size))rules.push(`[data-wgp-node="${root.dataset.wgpNode}"]{font-size:${size}px!important;line-height:1.15!important}`);}
 }
 sheet.textContent=transferred+rules.join('\n');
 // Text moved out of a dark hero must remain readable on a white content card.
 for(const root of document.querySelectorAll('[data-wgp-transferred="1"]'))for(const n of [root,...root.querySelectorAll('h1,h2,h3,h4,p,span,strong,em,small,a')]){
  if(!n.dataset.wgpNode||!n.textContent.trim()||n.closest('[data-wgp-color-custom]')||innerWidth<=760&&n.closest('[data-wgp-mobile-color-custom]'))continue;const style=getComputedStyle(n),bg=background(n);
  if(contrast(rgb(style.color),bg)>=3)continue;let color=rgb(getComputedStyle(n.parentElement).color);
  if(contrast(color,bg)<3)color=contrast([20,37,125],bg)>=3?[20,37,125]:[255,255,255];
  rules.push(`[data-wgp-node="${n.dataset.wgpNode}"]{color:rgb(${color.join(',')})!important}`);
 }
 sheet.textContent=transferred+rules.join('\n');
 // Release a constrained ancestor only when newly transferred content actually overflows it.
 const changed=[...document.querySelectorAll('[data-wgp-transferred="1"],[data-wgp-edited]'),...flowParents],texts=new Set();for(const root of changed)for(const text of [root,...root.querySelectorAll('h1,h2,h3,h4,p,span,strong,em,small,a,dt,dd')])if(text.textContent.trim()&&!text.closest('.card-photo,.hero-product-stage,.carousel-toolbar,.visually-hidden,[aria-hidden="true"]')&&getComputedStyle(text).display!=='none'&&text.getClientRects().length)texts.add(text);
 const expanded=new Set();for(const root of texts){
  const textRect=root.getBoundingClientRect();let clipped=false;for(let p=root.parentElement;p&&p!==document.body;p=p.parentElement){
   const style=getComputedStyle(p),box=p.getBoundingClientRect();if(p.clientHeight>0&&textRect.bottom>box.bottom+3&&(/hidden|clip/.test(style.overflowY)||p.matches('.audience-copy,.audiences,.reference-hero-grid,main')))clipped=true;
   if(clipped&&p.dataset.wgpNode&&!expanded.has(p)){expanded.add(p);rules.push(`[data-wgp-node="${p.dataset.wgpNode}"]{height:auto!important;max-height:none!important;min-height:min-content!important;overflow:visible!important;${style.display==='grid'?`grid-template-rows:repeat(${Math.min(24,tracks(style.gridTemplateRows))},minmax(min-content,1fr))!important;`:''}}`);}
   if(p.tagName==='MAIN')break;
  }
 }
 sheet.textContent=transferred+rules.join('\n');
}
function setText(node,value){
 const text=Array.from(value),old=Array.from(node.textContent);if(old.join('')===value)return;
 const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),leaves=[];while(walk.nextNode())leaves.push(walk.currentNode);
 if(!leaves.length){node.prepend(document.createTextNode(value));return;}
 let prefix=0,suffix=0;while(prefix<old.length&&prefix<text.length&&old[prefix]===text[prefix])prefix++;
 while(suffix<old.length-prefix&&suffix<text.length-prefix&&old[old.length-1-suffix]===text[text.length-1-suffix])suffix++;
 const insertion=text.slice(prefix,text.length-suffix).join(''),end=old.length-suffix;let offset=0,inserted=false;
 for(const leaf of leaves){const chars=Array.from(leaf.data),start=offset;offset+=chars.length;
  const before=chars.slice(0,Math.max(0,Math.min(chars.length,prefix-start))).join(''),after=chars.slice(Math.max(0,Math.min(chars.length,end-start))).join('');
  if(offset<prefix||start>end)continue;
  leaf.data=before+(!inserted?insertion:'')+after;inserted=true;
 }
}
function readText(node){return [...node.childNodes].map(n=>n.nodeType===3?n.data:n.nodeType===1?(n.tagName==='BR'?(n.hasAttribute('data-wgp-break-hidden')?'':'\n'):readText(n)):'').join('');}
function setLines(node,value){
 const old=Array.from(readText(node)),next=Array.from(value);if(old.join('')===value)return;
 let prefix=0,suffix=0;while(prefix<old.length&&prefix<next.length&&old[prefix]===next[prefix])prefix++;
 while(suffix<old.length-prefix&&suffix<next.length-prefix&&old[old.length-1-suffix]===next[next.length-1-suffix])suffix++;
 const leaves=[];function walk(p){for(const n of p.childNodes)if(n.nodeType===3)leaves.push(n);else if(n.nodeType===1){if(n.tagName==='BR'){if(!n.hasAttribute('data-wgp-break-hidden'))leaves.push(n);}else walk(n);}}walk(node);
 const end=old.length-suffix,insertion=next.slice(prefix,next.length-suffix).join('');let offset=0,inserted=false;
 function fragment(text){const f=document.createDocumentFragment();text.split('\n').forEach((line,i)=>{if(i)f.append(document.createElement('br'));f.append(document.createTextNode(line));});return f;}
 for(const leaf of leaves){const br=leaf.nodeType===1,chars=br?['\n']:Array.from(leaf.data),start=offset;offset+=chars.length;if(offset<prefix||start>end)continue;
  const before=chars.slice(0,Math.max(0,Math.min(chars.length,prefix-start))).join(''),after=chars.slice(Math.max(0,Math.min(chars.length,end-start))).join('');
  if(br){if(!inserted){if(before)leaf.after(fragment(insertion));else leaf.before(fragment(insertion));inserted=true;}if(prefix<=start&&end>start){leaf.dataset.wgpBreakHidden='1';leaf.style.display='none';}}
  else {const text=before+(!inserted?insertion:'')+after;inserted=true;if(text.includes('\n'))leaf.replaceWith(fragment(text));else leaf.data=text;}
 }
 if(!leaves.length)node.prepend(fragment(value));
}
window.WGPVisualLayout={refresh,placement,setText,setLines,readText,contrast};
let pending=0;addEventListener('resize',()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(refresh);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
document.fonts?.ready.then(refresh);
})();
