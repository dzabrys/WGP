/* Produce an upload bundle; secrets, local databases and test accounts are never copied. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),work=path.join(root,'work');fs.mkdirSync(work,{recursive:true});
const dest=fs.mkdtempSync(path.join(work,'wgp-nazwa-')),pub=path.join(dest,'public'),priv=path.join(dest,'private');
fs.mkdirSync(pub,{recursive:true});fs.mkdirSync(path.join(priv,'templates'),{recursive:true});fs.mkdirSync(path.join(priv,'data'),{recursive:true});
for(const entry of fs.readdirSync(path.join(root,'docs'),{withFileTypes:true})){
 const from=path.join(root,'docs',entry.name);
 if(entry.name.startsWith('.')||['robots.txt','sitemap.xml'].includes(entry.name))continue;
 if(entry.name.endsWith('.html'))continue;
 else fs.cpSync(from,path.join(pub,entry.name),{recursive:true});
}
fs.cpSync(path.join(root,'hosting/templates'),path.join(priv,'templates'),{recursive:true});
fs.cpSync(path.join(root,'hosting/public'),pub,{recursive:true});
for(const folder of ['app','bin'])fs.cpSync(path.join(root,'hosting',folder),path.join(dest,folder),{recursive:true});
fs.copyFileSync(path.join(root,'hosting/config.example.php'),path.join(priv,'config.example.php'));
fs.copyFileSync(path.join(root,'hosting/WDROZENIE.md'),path.join(dest,'WDROZENIE.md'));
fs.copyFileSync(path.join(root,'hosting/CHMURA.md'),path.join(dest,'CHMURA.md'));
fs.writeFileSync(path.join(priv,'.htaccess'),'Require all denied\n');
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push({path:path.relative(dest,p).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}walk(dest);
if(files.some(f=>/config\.php$|\.sqlite|account\.json|\.env|php-runtime|mariadb-runtime/.test(f.path)))throw Error('Private runtime data detected in bundle.');
fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify({schema:1,created:new Date().toISOString(),files},null,2)+'\n');
console.log(JSON.stringify({directory:dest,publicDirectory:pub,files:files.length},null,2));
