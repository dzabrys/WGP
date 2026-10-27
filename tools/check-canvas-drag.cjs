/* Exercise the real canvas runtime. JSDOM supplies events; rectangles model lists/grids. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const runtime=fs.readFileSync('hosting/public/panel/canvas.js','utf8');
let checks=0;const check=(condition,label)=>{assert(condition,label);checks++;console.log('PASS '+label);};
function fixture({grid=false,reduced=false,fixed=false}={}){
 const node=(key,h=100)=>`<article data-wgp-node="${key}" data-wgp-root="main" data-wgp-container="1" data-wgp-movable="${fixed&&key==='b'?'0':'1'}" data-height="${h}"><h2>${key}</h2><p>Content of ${key}</p></article>`;
 const dom=new JSDOM(`<body data-wgp-canvas="test.html"><main data-wgp-node="main" data-wgp-root="main" data-wgp-container="1" data-wgp-movable="0"><div id="list" style="display:${grid?'grid':'block'};grid-template-columns:${grid?'1fr 1fr':'none'}" data-wgp-node="list" data-wgp-root="main" data-wgp-container="1" data-wgp-movable="1">${node('a',100)}${node('b',140)}${node('c',80)}${grid?node('e',100):''}</div><div id="other" data-wgp-node="other" data-wgp-root="main" data-wgp-container="1" data-wgp-movable="1">${node('d',120)}</div></main></body>`,{url:'http://localhost/panel/canvas',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,sent=[],animations=[];let time=1000,frames=new Map(),seq=0,scroll=0;
 w.matchMedia=()=>({matches:reduced});w.scrollTo=()=>{};w.scrollBy=(x,y)=>{scroll+=y;};Object.defineProperty(w,'scrollY',{get:()=>scroll});Object.defineProperty(w,'innerWidth',{value:900});Object.defineProperty(w,'innerHeight',{value:700});
 w.requestAnimationFrame=f=>{frames.set(++seq,f);return seq;};w.cancelAnimationFrame=n=>frames.delete(n);
 w.parent.postMessage=m=>sent.push(m);w.CSSStyleDeclaration.prototype[Symbol.iterator]=function*(){for(let i=0;i<this.length;i++)yield this[i];};
 w.Element.prototype.setPointerCapture=function(p){this._pointer=p;};w.Element.prototype.hasPointerCapture=function(p){return this._pointer===p;};w.Element.prototype.releasePointerCapture=function(){delete this._pointer;};
 w.Element.prototype.animate=function(keys,options){const a={keys,options,cancel(){this.oncancel?.();}};animations.push(a);setTimeout(()=>a.onfinish?.(),0);return a;};
 const rect=(x,y,width,height)=>({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height});
 w.Element.prototype.getBoundingClientRect=function(){
  if(this.id==='wgp-drag-copy'){const [x,y]=this.style.translate.split(' ').map(parseFloat);return rect(x||0,y||0,parseFloat(this.style.width)||300,parseFloat(this.style.height)||100);}
  const key=this.dataset?.wgpNode;if(key==='main')return rect(0,-scroll,900,1500);
  if(key==='list')return rect(20,100-scroll,300,grid?300:500);if(key==='other')return rect(400,100-scroll,300,500);
  if(key){const p=this.parentElement,items=[...p.children],i=items.indexOf(this),pr=p.getBoundingClientRect();if(p.id==='list'&&grid)return rect(pr.left+(i%2)*150,pr.top+Math.floor(i/2)*160,140,140);return rect(pr.left,pr.top+items.slice(0,i).reduce((sum,n)=>sum+Number(n.dataset.height||100)+10,0),300,Number(this.dataset.height||100));}
  return this.parentElement?.getBoundingClientRect()||rect(0,0,0,0);
 };
 d.elementFromPoint=(x,y)=>{const all=[...d.querySelectorAll('[data-wgp-node]')].filter(n=>!n.closest('[data-wgp-drag-source]'));return all.reverse().find(n=>{const r=n.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})||d.body;};
 w.eval(runtime);const q=key=>d.querySelector(`[data-wgp-node="${key}"]`),order=p=>[...q(p).children].map(n=>n.dataset.wgpNode).join(',');
 function event(type,x,y,pointerId=1){const target=type==='pointerdown'?d.querySelector('[data-canvas="drag"]'):d,e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId,button:0,isPrimary:true});target.dispatchEvent(e);}
 function start(key='a',pointerId=1){q(key).dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));const r=q(key).getBoundingClientRect();event('pointerdown',r.left+25,r.top-20,pointerId);}
 function frame(){const old=[...frames.values()];frames.clear();time+=16;old.forEach(f=>f(time));}
 function move(x,y,pointerId=1){event('pointermove',x,y,pointerId);frame();}
 const cancel=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 const sync=(model={changes:{},added:[],order:{}})=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{kind:'wgp:sync',file:'test.html',model}}));
 return{w,d,q,sent,animations,event,start,move,frame,order,cancel,sync,scroll:()=>scroll,close:()=>w.close()};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
(async()=>{
 let f=fixture();f.start();f.move(46,81);check(!f.d.querySelector('#wgp-drag-copy'),'click jitter does not start a drag');f.event('pointerup',46,81);check(!f.sent.some(m=>m.kind==='wgp:move'),'click without moving records no change');f.close();
 f=fixture();f.start();f.move(100,320);check(f.order('list')==='b,a,c','neighbours move before pointer release');check(!f.sent.some(m=>m.kind==='wgp:move'),'live preview does not save intermediate moves');check(f.d.querySelector('#wgp-drag-copy')&&!f.d.querySelector('#wgp-drag-copy [data-wgp-node]'),'lifted visual copy has no duplicate editable identities');check(f.q('a').hasAttribute('data-wgp-drag-source'),'actual element reserves its new layout space');check(f.animations.some(a=>a.keys[0].translate),'surrounding cards receive a FLIP position animation');for(let i=0;i<80;i++)f.frame();check(f.order('list')==='b,a,c','stationary pointer does not cause reorder oscillation');f.event('pointerup',100,320);await tick();const moves=f.sent.filter(m=>m.kind==='wgp:move');check(moves.length===1&&moves[0].orders.list.join(',')==='b,a,c','one completed drag creates one persisted move');check(!f.d.querySelector('#wgp-drag-copy,[data-wgp-drag-source]'),'drop cleans up all drag visuals');f.close();
 f=fixture();f.start();f.move(100,320);f.cancel();await tick();check(f.order('list')==='a,b,c'&&!f.q('list').hasAttribute('data-wgp-arranged'),'Escape restores original order and fixed layout');check(!f.sent.some(m=>m.kind==='wgp:move'),'cancelled drag never records a model change');f.close();
 for(const type of ['pointercancel','lostpointercapture','blur']){f=fixture();f.start();f.move(100,320);if(type==='blur')f.w.dispatchEvent(new f.w.Event('blur'));else f.event(type,100,320);await tick();check(f.order('list')==='a,b,c'&&!f.d.querySelector('#wgp-drag-copy'),type+' restores order and releases drag');f.close();}
 f=fixture();f.start();f.move(500,190);check(f.order('other')==='d,a'&&f.order('list')==='b,c','moving across groups previews the destination layout');f.cancel();await tick();check(f.order('list')==='a,b,c'&&f.order('other')==='d','cross-group cancellation restores both containers');f.close();
 f=fixture();f.start();f.move(500,190);f.event('pointerup',500,190);await tick();const cross=f.sent.find(m=>m.kind==='wgp:move');check(cross?.orders.list.join(',')==='b,c'&&cross?.orders.other.join(',')==='d,a','cross-group commit includes source and destination orders');f.close();
 f=fixture({grid:true});f.start();f.move(295,170);check(f.order('list')==='b,a,c,e','horizontal card grid sorts by pointer side');f.move(295,330);check(f.order('list')==='b,c,e,a','wrapping grid moves between rows');f.cancel();await tick();check(f.order('list')==='a,b,c,e','grid cancellation restores all cards');f.close();
 f=fixture({reduced:true});f.start();f.move(100,320);f.event('pointerup',100,320);check(f.animations.length===0&&f.sent.some(m=>m.kind==='wgp:move'),'reduced motion preserves live sorting without animations');f.close();
 f=fixture();f.start();f.move(100,320,2);check(!f.d.querySelector('#wgp-drag-copy'),'unrelated touch pointer cannot move the selected card');f.move(100,690);const before=f.scroll();for(let i=0;i<10;i++)f.frame();check(f.scroll()>before,'edge scrolling continues while the pointer is held still');f.cancel();await tick();const stopped=f.scroll();f.frame();check(f.scroll()===stopped,'cancel stops automatic scrolling');f.close();
 f=fixture();f.start();f.move(100,320);f.move(100,120);f.event('pointerup',100,120);await tick();check(f.order('list')==='a,b,c'&&!f.sent.some(m=>m.kind==='wgp:move'),'returning to original position records no change');f.close();
 f=fixture();f.start();f.move(100,320);f.sync();await tick();check(f.order('list')==='a,b,c'&&!f.d.querySelector('#wgp-drag-copy'),'incoming model update safely cancels an active drag');f.close();
 f=fixture();f.start();f.move(100,320);f.event('pointerup',100,320);f.sync();await tick();check(f.order('list')==='a,b,c'&&!f.sent.some(m=>m.kind==='wgp:move')&&!f.d.querySelector('#wgp-drag-copy'),'incoming model update cannot be overwritten by a pending landing animation');f.close();
 f=fixture({fixed:true});f.sync({changes:{},added:[],order:{list:['c','a','b']}});check(f.order('list')==='c,a,b'&&f.q('b').dataset.wgpMovable==='0','model replay restores the same order around fixed siblings');f.close();
 // Exercise the actual parent editor history, not a second implementation of its model.
 const parent=new JSDOM('<body></body>',{url:'http://localhost/panel',runScripts:'outside-only',pretendToBeVisual:true}),pw=parent.window;
 pw.structuredClone=structuredClone;pw.ResizeObserver=class{observe(){}disconnect(){}};
 const state={pages:[{id:'home',file:'index.html',name:'Home',title:'Home',description:''}],products:[],contact:{email:'office@example.com',phone:'',address:''},appearance:{accent:'#ff8800',primary:'#123456'}};
 pw.eval(fs.readFileSync('hosting/public/panel/visual-editor.js','utf8'));pw.document.body.innerHTML=pw.WGPVisual.markup(state,'home');const editor=pw.WGPVisual.mount({state:()=>state,changed(){}}),frame=pw.document.querySelector('iframe');
 pw.dispatchEvent(new pw.MessageEvent('message',{source:frame.contentWindow,origin:pw.location.origin,data:{kind:'wgp:move',file:'index.html',id:'a',orders:{list:['b','a','c']}}}));
 check(state.visual.pages['index.html'].order.list.join(',')==='b,a,c','real parent editor accepts the completed preview order');
 pw.document.querySelector('[data-ve-action="undo"]').click();check(!state.visual.pages['index.html'].order.list,'one Undo restores the layout before the whole drag');
 pw.document.querySelector('[data-ve-action="redo"]').click();check(state.visual.pages['index.html'].order.list.join(',')==='b,a,c','Redo restores the completed drag');editor.destroy();pw.close();
 console.log(checks+' canvas drag checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
