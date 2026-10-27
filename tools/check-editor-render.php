<?php
declare(strict_types=1);
// Exercise every page using only repository seed data and an ephemeral, in-memory configuration.
$root=dirname(__DIR__);$configuration=tempnam(sys_get_temp_dir(),'wgp-render-');
$settings=['environment'=>'development','base_url'=>'http://127.0.0.1','public_url'=>'http://127.0.0.1','secret'=>bin2hex(random_bytes(32)),'dsn'=>'sqlite::memory:','data_dir'=>sys_get_temp_dir(),'templates_dir'=>$root.'/hosting/templates','assets_dir'=>$root.'/docs','publication_target'=>'server','turnstile_sitekey'=>'','turnstile_secret'=>''];
file_put_contents($configuration,'<?php return '.var_export($settings,true).';');putenv('WGP_CONFIG='.$configuration);
register_shutdown_function(static function()use($configuration){if(is_file($configuration))unlink($configuration);});
require $root.'/hosting/app/bootstrap.php';require $root.'/hosting/app/validation.php';require $root.'/hosting/app/render.php';
$seed=json_decode(file_get_contents($root.'/hosting/app/seed.json'),true,512,JSON_THROW_ON_ERROR);$files=array_values(array_unique(array_merge(array_column($seed['pages'],'file'),array_column($seed['products'],'url'))));$checks=0;
function document_of(string $html): DOMDocument {$d=new DOMDocument('1.0','UTF-8');@$d->loadHTML($html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING);return $d;}
function ensure(bool $ok,string $message): void {global $checks;if(!$ok)throw new RuntimeException($message);$checks++;}
foreach($files as$file){
    $html=render_site($file,$seed,true);ensure(is_string($html),$file.': canvas did not render');$d=document_of($html);$xp=new DOMXPath($d);$all=iterator_to_array($xp->query('//*[@data-wgp-node]'));$ids=array_map(fn($n)=>$n->getAttribute('data-wgp-node'),$all);
    ensure(count($ids)===count(array_unique($ids))&&count($ids)>5,$file.': duplicate or missing editor identities');
    $map=[];foreach($all as$n)$map[$n->getAttribute('data-wgp-node')]=$n;$main=first($d,'//main');$parent=null;$candidates=[];
    foreach($xp->query('//main | //main//*[@data-wgp-container="1"]')as$p){$list=[];foreach($p->childNodes as$n)if($n instanceof DOMElement&&$n->hasAttribute('data-wgp-node'))$list[]=$n;
        if(count($list)>=2&&count(array_filter($list,fn($n)=>$n->getAttribute('data-wgp-movable')==='1'))>=2){$preferred=preg_match('/(?:^|\s)(?:audiences|games-grid|catalog-grid|steps|product-hero|contact-form-card)(?:\s|$)/',$p->getAttribute('class'));$candidates[]=['node'=>$p,'list'=>$list,'score'=>$preferred?1000+count($list):count($list)];}
    }
    usort($candidates,fn($a,$b)=>$b['score']<=>$a['score']);$chosen=$candidates[0]??null;ensure($chosen!==null,$file.': no sortable content group');$parent=$chosen['node'];$list=$chosen['list'];$movable=array_keys(array_filter($list,fn($n)=>$n->getAttribute('data-wgp-movable')==='1'));[$a,$b]=array_slice($movable,0,2);[$list[$a],$list[$b]]=[$list[$b],$list[$a]];
    $parentId=$parent->getAttribute('data-wgp-node');$order=array_map(fn($n)=>$n->getAttribute('data-wgp-node'),$list);$state=$seed;$model=['changes'=>[],'added'=>[],'order'=>[$parentId=>$order],'flow'=>[$parentId]];
    $heading=first($d,'//main//h1');if($heading&&visual_text($heading))$model['changes'][$heading->getAttribute('data-wgp-node')]=['text'=>'Test: '.$heading->textContent];
    $state['visual']=validate_visual(['pages'=>[$file=>$model]],$files);$edited=document_of(render_site($file,$state,true));$editedMap=[];foreach((new DOMXPath($edited))->query('//*[@data-wgp-node]')as$n)$editedMap[$n->getAttribute('data-wgp-node')]=$n;
    ensure(!array_diff($ids,array_keys($editedMap)),$file.': moving/editing deleted another editable object');$actual=[];foreach($editedMap[$parentId]->childNodes as$n)if($n instanceof DOMElement&&$n->hasAttribute('data-wgp-node'))$actual[]=$n->getAttribute('data-wgp-node');ensure($actual===$order,$file.': saved order differs from canvas order');
    if($heading&&visual_text($heading))ensure($editedMap[$heading->getAttribute('data-wgp-node')]->textContent==='Test: '.$heading->textContent,$file.': heading text did not survive');
    $public=render_site($file,$state,false);ensure(!str_contains($public,'/panel/canvas.js')&&str_contains($public,'visual-layout.js'),$file.': published output has missing layout support or editor code');
    echo 'PASS page render/edit/order/export: '.$file.PHP_EOL;
}
echo $checks.' rendering checks passed across '.count($files).' pages.'.PHP_EOL;
