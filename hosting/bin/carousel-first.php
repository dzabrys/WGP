<?php
declare(strict_types=1);
// Reorder one existing image without replacing products, drafts or other settings.
if (PHP_SAPI !== 'cli') exit;
require dirname(__DIR__).'/app/bootstrap.php';
$image=$argv[1]??'';
if (!preg_match('~^(?:media|assets)/[a-zA-Z0-9._/-]+\.(?:webp|png|jpe?g)$~D',$image)) throw new RuntimeException('Podaj ścieżkę istniejącego zdjęcia.');
$updates=[];
foreach (['draft','published'] as $key) {
    $doc=document($key);$slides=$doc['state']['appearance']['featured'];$index=null;
    foreach($slides as $i=>$slide) if(is_array($slide)&&($slide['image']??'')===$image){$index=$i;break;}
    if($index===null) throw new RuntimeException('Nie znaleziono zdjęcia w dokumencie '.$key.'. Niczego nie zmieniono.');
    if($index===0) continue;
    $first=array_splice($slides,$index,1);array_unshift($slides,$first[0]);
    $next=$doc['state'];$next['appearance']['featured']=$slides;
    $updates[$key]=[$doc,$next];
}
db()->beginTransaction();
try {
    if(isset($updates['published'])) query('INSERT INTO wgp_history (id,created_at,user_name,body) VALUES (?,?,?,?)',[bin2hex(random_bytes(16)),gmdate('c'),'Aktualizacja kolejności karuzeli',json_encode_safe($updates['published'][0]['state'])]);
    foreach($updates as $key=>[$doc,$state]) save_document($key,$state,$doc['revision']);
    db()->commit();
} catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
echo 'OK: zdjęcie jako pierwsze; zaktualizowane dokumenty: '.count($updates).PHP_EOL;
