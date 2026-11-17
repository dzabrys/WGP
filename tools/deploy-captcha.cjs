// Usage: node tools/deploy-captcha.cjs <path-to-private-env-file>
const fs=require('node:fs'),path=require('node:path'),{parseEnv}=require('node:util');
(async()=>{
 const env=parseEnv(fs.readFileSync(process.argv[2]||'.env.local','utf8'));
 for(const key of ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','TURNSTILE_SITEKEY','TURNSTILE_SECRET_KEY'])if(!env[key]?.trim())throw Error('Missing local setting: '+key);
 if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID))throw Error('Invalid Cloudflare account ID');
 async function api(route,method='GET',body){const response=await fetch('https://api.cloudflare.com/client/v4'+route,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok||result.success===false)throw Error('Cloudflare request failed ('+response.status+'), codes: '+(result.errors||[]).map(e=>e.code).join(','));return result.result;}
 const prefix='/accounts/'+env.CLOUDFLARE_ACCOUNT_ID;
 const subdomain=await api(prefix+'/workers/subdomain');if(!subdomain.subdomain)throw Error('Create a Workers subdomain in the Cloudflare dashboard first');
 const form=new FormData();
 form.set('metadata',new Blob([JSON.stringify({main_module:'worker.mjs',compatibility_date:'2026-10-22',bindings:[{type:'plain_text',name:'TURNSTILE_SITEKEY',text:env.TURNSTILE_SITEKEY},{type:'secret_text',name:'TURNSTILE_SECRET_KEY',text:env.TURNSTILE_SECRET_KEY},{type:'plain_text',name:'TURNSTILE_HOSTNAME',text:'dzabrys.github.io'},{type:'plain_text',name:'ALLOWED_ORIGIN',text:'https://dzabrys.github.io'}]})],{type:'application/json'}));
 form.set('worker.mjs',new Blob([fs.readFileSync(path.resolve(__dirname,'../backend/worker.mjs'))],{type:'application/javascript+module'}),'worker.mjs');
 const workerName='wgp-captcha';
 await api(prefix+'/workers/scripts/'+workerName,'PUT',form);
 await api(prefix+'/workers/scripts/'+workerName+'/subdomain','POST',{enabled:true});
 const base='https://'+workerName+'.'+subdomain.subdomain+'.workers.dev/';
 let ready=false;for(let i=0;i<6;i++){try{const r=await fetch(base+'api/captcha/config',{headers:{Origin:'https://dzabrys.github.io'}});const data=await r.json();if(r.ok&&data.testMode===false&&data.sitekey===env.TURNSTILE_SITEKEY){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,3000));}
 if(!ready)throw Error('Worker deployed, but public config endpoint is not ready');
 const contact=path.resolve(__dirname,'../docs/kontakt.html');let html=fs.readFileSync(contact,'utf8');if(!html.includes('name="contact-api-base"'))throw Error('Contact API configuration element missing');html=html.replace(/(<meta name="contact-api-base" content=")[^"]*(">)/,'$1'+base+'$2');fs.writeFileSync(contact,html);
 console.log('CAPTCHA backend deployed and configured: '+base);
})().catch(error=>{console.error(error.message);process.exitCode=1});
