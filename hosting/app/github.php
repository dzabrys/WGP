<?php
declare(strict_types=1);

// Publish only the public, rendered website. Never publish drafts, accounts or configuration.
function github_mode(): bool { return (config()['publication_target']??'server')==='github'; }
function github_delivery(): array {
    $row=query("SELECT body FROM wgp_documents WHERE id='github-delivery'")->fetchColumn();
    return $row?json_decode($row,true,16,JSON_THROW_ON_ERROR):[];
}
function github_pending(): bool { return github_mode() && (github_delivery()['revision']??0)!==document('published')['revision']; }
function github_request(string $method,string $endpoint,?array $body=null): array {
    $token=getenv('WGP_GITHUB_TOKEN')?:getenv('GITHUB_TOKEN');
    if (!$token) throw new RuntimeException('Brak połączenia z GitHubem. Administrator musi uruchomić panel z dostępem do repozytorium.');
    $repo=config()['github_repository']??'dzabrys/WGP';
    if (!preg_match('~^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$~D',$repo)) throw new RuntimeException('Nieprawidłowe repozytorium.');
    $h=curl_init('https://api.github.com/repos/'.$repo.'/'.$endpoint);
    curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_TIMEOUT=>40,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token,'User-Agent: WGP-Panel','Accept: application/vnd.github+json','X-GitHub-Api-Version: 2022-11-28','Content-Type: application/json']]);
    if ($body!==null) curl_setopt($h,CURLOPT_POSTFIELDS,json_encode_safe($body));
    $raw=curl_exec($h);$status=curl_getinfo($h,CURLINFO_RESPONSE_CODE);curl_close($h);
    if($raw===false||$status<200||$status>=300) throw new RuntimeException($status===409||$status===422?'Repozytorium zmieniło się podczas publikacji. Kliknij „Opublikuj” ponownie.':'Nie udało się opublikować na GitHubie (HTTP '.$status.'). Treści pozostają zapisane; spróbuj ponownie.');
    return json_decode($raw,true,64,JSON_THROW_ON_ERROR);
}
function public_files(array $state): array {
    $url=rtrim(config()['public_url']??config()['base_url'],'/');
    $prefix=rtrim(parse_url($url,PHP_URL_PATH)??'','/');
    $files=[];$names=array_unique(array_merge(array_map('basename',glob(config()['templates_dir'].'/*.html')?:[]),array_column($state['products'],'url')));
    foreach($names as $name){
        $html=render_site($name,$state,false);if($html===null)continue;
        $html=str_replace([config()['base_url'],str_replace('/','\\/',config()['base_url'])],[$url,str_replace('/','\\/',$url)],$html);
        // GitHub Pages keeps the existing CAPTCHA Worker; PHP handles it after migration.
        $html=preg_replace('~(<meta name="contact-api-base" content=")[^"]*(")~','$1https://staz2-captcha.dzabrys-staz2.workers.dev/$2',$html);
        $html=preg_replace('~((?:href|src|action)=")/(?!/|WGP/)([^"]*)~','$1'.$prefix.'/$2',$html);
        $files['docs/'.$name]=$html;
    }
    $files['docs/cms-catalog.js']=catalog_js($state);
    foreach(['contact.js','contact-designs.js'] as $name)$files['docs/style-a1/ui/'.$name]=str_replace('biuro@wielkiegryplanszowe.pl',$state['contact']['email'],file_get_contents(config()['assets_dir'].'/style-a1/ui/'.$name));
    $media=[];foreach($state['products']as$p)if($p['visible'])$media[]=$p['image'];
    foreach($state['pages']as$page)foreach($page['fields']as$field)if($field['type']==='image')$media[]=$field['value'];
    foreach(array_unique($media)as$ref)if(preg_match('~^media/[a-f0-9]{32}\.webp$~D',$ref))$files['docs/'.$ref]=file_get_contents(config()['data_dir'].'/'.$ref);
    $xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    $indexed=array_merge(['index.html','oferta.html','szkoly.html','firmy.html','gry-na-zamowienie.html','wielkie-gry-planszowe.html','inne.html','kontakt.html'],array_column(array_filter($state['products'],fn($p)=>$p['visible']),'url'));
    foreach(array_unique($indexed)as$f)if(isset($files['docs/'.$f]))$xml.='<url><loc>'.esc($url.'/'.($f==='index.html'?'':$f)).'</loc></url>';
    $files['docs/sitemap.xml']=$xml.'</urlset>';
    $files['docs/robots.txt']="User-agent: *\nDisallow: ".$prefix."/panel/\nSitemap: ".$url."/sitemap.xml\n";
    $files['docs/.nojekyll']='';
    return $files;
}
function publish_github(array $state,int $revision): array {
    $lock=fopen(config()['data_dir'].'/github-publish.lock','c');
    if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))throw new RuntimeException('Trwa już publikowanie. Spróbuj ponownie za chwilę.');
    try{
        $branch=config()['github_branch']??'main';if(!preg_match('~^[a-zA-Z0-9_.-]+$~D',$branch))throw new RuntimeException('Nieprawidłowa gałąź.');
        $head=github_request('GET','git/ref/heads/'.$branch)['object']['sha'];
        $commit=github_request('GET','git/commits/'.$head);$tree=github_request('GET','git/trees/'.$commit['tree']['sha'].'?recursive=1');
        if($tree['truncated']??false)throw new RuntimeException('Repozytorium jest zbyt duże do publikacji.');
        $existing=[];foreach($tree['tree']as$f)$existing[$f['path']]=$f['sha'];
        $files=public_files($state);$changes=[];
        $files['docs/wgp-publication.json']=json_encode_safe(['schema'=>1,'revision'=>$revision,'contentHash'=>hash('sha256',json_encode_safe($state))]);
        foreach($files as$path=>$content){
            $sha=sha1('blob '.strlen($content)."\0".$content);if(($existing[$path]??null)===$sha)continue;
            if(str_starts_with($path,'docs/media/')){$blob=github_request('POST','git/blobs',['content'=>base64_encode($content),'encoding'=>'base64']);$changes[]=['path'=>$path,'mode'=>'100644','type'=>'blob','sha'=>$blob['sha']];}
            else$changes[]=['path'=>$path,'mode'=>'100644','type'=>'blob','content'=>$content];
        }
        // Delete only product pages explicitly hidden in this CMS, never unrelated repository files.
        foreach($state['products']as$p)if(!$p['visible']&&isset($existing['docs/'.$p['url']]))$changes[]=['path'=>'docs/'.$p['url'],'mode'=>'100644','type'=>'blob','sha'=>null];
        if($changes){
            $newTree=github_request('POST','git/trees',['base_tree'=>$commit['tree']['sha'],'tree'=>$changes]);
            $newCommit=github_request('POST','git/commits',['message'=>'Publish WGP website from management panel','tree'=>$newTree['sha'],'parents'=>[$head]]);
            // Fast-forward only: concurrent repository edits are never force-overwritten.
            github_request('PATCH','git/refs/heads/'.$branch,['sha'=>$newCommit['sha'],'force'=>false]);$head=$newCommit['sha'];
        }
        $result=['revision'=>$revision,'commit'=>$head,'url'=>config()['public_url'],'created'=>gmdate('c')];
        query("DELETE FROM wgp_documents WHERE id='github-delivery'");query('INSERT INTO wgp_documents (id,body,revision) VALUES (?,?,1)',['github-delivery',json_encode_safe($result)]);
        return $result;
    }finally{flock($lock,LOCK_UN);fclose($lock);}
}
