<?php
declare(strict_types=1);
$root=dirname(__DIR__);
function config(): array {global $root;return ['base_url'=>'https://example.test','public_url'=>'https://example.test','templates_dir'=>$root.'/hosting/templates','assets_dir'=>$root.'/docs','data_dir'=>$root.'/docs'];}
require $root.'/hosting/app/render.php';require $root.'/hosting/app/github.php';
$state=json_decode(file_get_contents($root.'/hosting/app/seed.json'),true,512,JSON_THROW_ON_ERROR);
$state['categories']=[['id'=>'przygodowe','name'=>'Przygoda','description'=>'','catalog'=>'boards'],['id'=>'dla-szkol','name'=>'Nauka','description'=>'','catalog'=>'boards'],['id'=>'dla-firm','name'=>'Ruch','description'=>'','catalog'=>'boards'],['id'=>'customowe','name'=>'Na zamówienie','description'=>'','catalog'=>'custom']];
function check(bool $ok,string $message):void {if(!$ok)throw new RuntimeException($message);}
function graph_of(string $html):array{preg_match('~<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>~s',$html,$m);return json_decode($m[1],true,512,JSON_THROW_ON_ERROR)['@graph'];}
$state['products'][0]['name']='Żółta gra testowa';$state['products'][0]['variants'][0]['gross']=1234.56;
$file=$state['products'][0]['url'];$html=render_site($file,$state);$graph=graph_of($html);
$product=array_values(array_filter($graph,fn($n)=>$n['@type']==='Product'))[0];
check($product['name']==='Żółta gra testowa','CMS schema name stale');check($product['offers'][0]['price']==='1234.56','CMS schema price stale');
check(str_contains($product['url'],'https://example.test/'),'CMS canonical host stale');
// Applying metadata alone must not modify the DOM body or styles.
$d=new DOMDocument();@$d->loadHTML('<?xml encoding="UTF-8">'.$html,LIBXML_NONET);$body=$d->saveHTML($d->getElementsByTagName('body')->item(0));geo_metadata($d,$file,$state,$state['products'][0]);check($body===$d->saveHTML($d->getElementsByTagName('body')->item(0)),'GEO modified body');
$state['products'][0]['visible']=false;$files=public_files($state);
check(!isset($files['docs/'.$file]),'Hidden product published');check(!str_contains($files['docs/sitemap.xml'],$file),'Hidden product in sitemap');check(!str_contains($files['docs/llms.txt'],'Żółta gra testowa'),'Hidden product in llms');
$state['products'][0]['visible']=true;$files=public_files($state);check(str_contains($files['docs/llms.txt'],'Żółta gra testowa'),'llms not refreshed');check(str_contains($files['docs/llms.txt'],'https://example.test/'),'llms host stale');
echo "PASS: CMS name/price changes, canonical host, body preservation, product visibility, sitemap and llms regeneration.\n";
