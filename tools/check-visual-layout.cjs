const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const dom=new JSDOM('<head></head><body><h1 data-wgp-node="heading">Wielkie gry<br data-wgp-node="break"><span data-wgp-node="accent">planszowe</span></h1></body>',{runScripts:'outside-only',pretendToBeVisual:true});
dom.window.eval(fs.readFileSync('docs/style-a1/ui/visual-layout.js','utf8'));const {placement,setText,contrast}=dom.window.WGPVisualLayout;let count=0;
function check(ok,label){assert(ok,label);count++;console.log('PASS '+label);}
const grid={gridTemplateColumns:'300px 300px 300px',gridTemplateRows:'100px 100px',gridTemplateAreas:'none'};
check(placement({gridColumnStart:'auto',gridColumnEnd:'span 2',gridRowStart:'auto',gridRowEnd:'auto'},grid).column==='auto / span 2','two-column cards keep their span after reordering');
check(placement({gridColumnStart:'1',gridColumnEnd:'-1',gridRowStart:'auto',gridRowEnd:'auto'},grid).column==='1 / -1','full-width headings keep the full row');
check(placement({gridColumnStart:'1',gridColumnEnd:'2',gridRowStart:'1',gridRowEnd:'3'},grid).row==='auto / span 2','product imagery keeps its two-row footprint');
check(placement({gridArea:'photo'}, {...grid,gridTemplateAreas:'"photo title title" "photo copy copy"'}).row==='auto / span 2','named grid areas retain their row span');
check(placement({gridArea:'copy'}, {...grid,gridTemplateAreas:'"photo title title" "photo copy copy"'}).column==='auto / span 2','named content area retains its column span');
check(placement({gridColumnStart:'auto',gridColumnEnd:'span 3'}, {...grid,gridTemplateColumns:'360px'}).column==='auto / span 1','desktop spans fit inside the mobile column');
const heading=dom.window.document.querySelector('h1'),accent=heading.querySelector('span'),br=heading.querySelector('br');
setText(heading,'Duże gryplanszowe');check(heading.textContent==='Duże gryplanszowe'&&heading.querySelector('span')===accent&&heading.querySelector('br')===br,'editing a heading preserves its editable accent and line break');
setText(heading,'Duże gryplanszowe i więcej');check(heading.textContent==='Duże gryplanszowe i więcej'&&heading.querySelector('span')===accent,'appending text keeps all editable identities');
setText(heading,'🎲 Nowy tytuł');check(heading.textContent==='🎲 Nowy tytuł'&&heading.querySelector('[data-wgp-node="accent"]')===accent,'replacing a whole heading preserves structure and Unicode');
setText(heading,'');check(heading.textContent===''&&heading.querySelector('br')===br,'clearing text preserves the structural line break');
check(contrast([255,255,255],[255,255,255])===1&&contrast([20,37,125],[255,255,255])>8,'readability checks distinguish invisible white text from navy text');
console.log(count+' visual layout checks passed.');dom.window.close();
