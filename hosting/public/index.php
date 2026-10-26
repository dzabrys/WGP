<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/app/bootstrap.php';
require_once dirname(__DIR__).'/app/validation.php';
require_once dirname(__DIR__).'/app/api.php';
require_once dirname(__DIR__).'/app/render.php';
require_once dirname(__DIR__).'/app/github.php';
require_once dirname(__DIR__).'/app/transfer.php';
require_once dirname(__DIR__).'/app/captcha.php';
header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: strict-origin-when-cross-origin'); header('X-Frame-Options: SAMEORIGIN');
try {
    $c=config();
    $cloudProxy=($c['codespaces_proxy']??false)===true && in_array($_SERVER['REMOTE_ADDR']??'',['127.0.0.1','::1'],true) && ($_SERVER['HTTP_X_FORWARDED_PROTO']??'')==='https' && ($_SERVER['HTTP_X_FORWARDED_HOST']??'')===parse_url($c['base_url'],PHP_URL_HOST);
    // Codespaces rewrites Host to localhost. Trust its headers only from loopback,
    // with the exact configured HTTPS hostname; ordinary hosting never enables this.
    if($cloudProxy){$_SERVER['HTTP_HOST']=$_SERVER['HTTP_X_FORWARDED_HOST'];$_SERVER['WGP_TRUSTED_CLOUD_PROXY']=true;}
    if (in_array($_SERVER['HTTP_HOST']??'', $c['aliases']??[],true)) { header('Location: '.$c['base_url'].($_SERVER['REQUEST_URI']??'/'),true,301);exit; }
    if (($_SERVER['HTTP_HOST']??'')!==parse_url($c['base_url'],PHP_URL_HOST).(parse_url($c['base_url'],PHP_URL_PORT)?':'.parse_url($c['base_url'],PHP_URL_PORT):'')) { http_response_code(400); exit('Nieprawidłowy adres.'); }
    if ($c['environment']!=='development' && (($_SERVER['HTTPS']??'')!=='on') && !$cloudProxy) { header('Location: '.$c['base_url'].($_SERVER['REQUEST_URI']??'/'),true,302);exit; }
    $path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH); if(!is_string($path)||str_contains($path,'..')||str_contains($path,'\\')||str_contains($path,'%')){http_response_code(400);exit;}
    if (preg_match('~^/panel/api/([a-z-]+)$~D',$path,$m)) api($m[1]);
    if (preg_match('~^/api/captcha/([a-z-]+)$~D',$path,$m)) captcha($m[1]);
    if (!in_array($_SERVER['REQUEST_METHOD'],['GET','HEAD'],true)) { http_response_code(405);exit; }
    header('Cache-Control: no-store');
    if (in_array($path,['/panel','/panel/','/panel/index.html'],true)) { header('X-Robots-Tag: noindex, nofollow');header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");header('Content-Type: text/html; charset=utf-8');if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile(__DIR__.'/panel/index.html');exit; }
    if(preg_match('~^/media/([a-f0-9]{32}\.webp)$~D',$path,$m)){ $f=$c['data_dir'].'/media/'.$m[1]; if(!is_file($f)){http_response_code(404);exit;}header('Content-Type: image/webp');if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($f);exit; }
    $preview=isset($_GET['preview']) && $_GET['preview']==='1';
    if($preview) { require_user('editor'); header('X-Robots-Tag: noindex, nofollow'); }
    $state=document($preview?'draft':'published')['state'];
    if ($path==='/cms-catalog.js') { header('Content-Type: application/javascript; charset=utf-8');echo catalog_js($state);exit; }
    if ($path==='/sitemap.xml') {header('Content-Type: application/xml; charset=utf-8');echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';foreach(array_merge(['index.html','oferta.html','szkoly.html','firmy.html','gry-na-zamowienie.html','wielkie-gry-planszowe.html','inne.html','kontakt.html'],array_column(array_filter($state['products'],fn($p)=>$p['visible']),'url'))as$f)echo '<url><loc>'.esc($c['base_url'].'/'.($f==='index.html'?'':$f)).'</loc></url>';echo '</urlset>';exit;}
    if ($path==='/robots.txt') { header('Content-Type: text/plain');echo "User-agent: *\nDisallow: /panel/\nDisallow: /*preview=\nSitemap: ".$c['base_url']."/sitemap.xml\n";exit; }
    if (in_array($path,['/style-a1/ui/contact.js','/style-a1/ui/contact-designs.js'],true)) { header('Content-Type: application/javascript; charset=utf-8'); echo str_replace('biuro@wielkiegryplanszowe.pl',$state['contact']['email'],file_get_contents($c['assets_dir'].$path));exit; }
    $file=$path==='/'?'index.html':ltrim($path,'/');
    if(str_ends_with($file,'.html')) {
        $html=render_site($file,$state,$preview);if($html===null){http_response_code(404);$html=render_site('404.html',$state,false)??'Nie znaleziono strony.';}else{try{record_view($file);}catch(Throwable $e){error_log('WGP: view count unavailable');}}
        header('Content-Type: text/html; charset=utf-8');if($_SERVER['REQUEST_METHOD']!=='HEAD')echo$html;exit;
    }
    http_response_code(404);echo 'Nie znaleziono pliku.';
} catch (Throwable $e) { if(db_if_transaction())db()->rollBack();error_log('WGP: '.$e->getMessage());http_response_code(503);header('Content-Type: application/json; charset=utf-8');echo json_encode_safe(['ok'=>false,'message'=>'Panel jest chwilowo niedostępny. Spróbuj ponownie.']); }
function db_if_transaction(): bool { try{return db()->inTransaction();}catch(Throwable){return false;} }
