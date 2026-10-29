<?php
declare(strict_types=1);
require_once __DIR__.'/visual.php';
function text_value(mixed $v, int $max, string $label, bool $required=false): string {
    if (!is_string($v) || mb_strlen($v)>$max || ($required && trim($v)==='')) fail('Sprawdź pole: '.$label.'.');
    return trim($v);
}
function valid_image(mixed $v): string {
    $s=text_value($v,300,'zdjęcie',true);
    if (!preg_match('~^(assets/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g|avif|svg)(?:\?v=[a-zA-Z0-9_-]+)?|media/[a-f0-9]{32}\.webp)$~D',$s) || str_contains($s,'..')) fail('Wybierz zdjęcie z biblioteki.');
    $file=str_starts_with($s,'media/')?config()['data_dir'].'/'.$s:config()['assets_dir'].'/'.explode('?',$s)[0];
    if (!is_file($file)) fail('Nie znaleziono wybranego zdjęcia.');
    return $s;
}
function validate_state(array $s): array {
    $seed=json_decode(file_get_contents(__DIR__.'/seed.json'),true,64,JSON_THROW_ON_ERROR);
    if (!isset($s['products'],$s['pages'],$s['appearance'],$s['contact']) || !is_array($s['products']) || count($s['products'])>500) fail('Nieprawidłowa lista produktów.');
    $out=['schema'=>1,'products'=>[],'pages'=>[],'categories'=>[],'deletedProducts'=>[]]; $ids=[];$categoryIds=[];
    $categories=$s['categories']??default_categories();
    if(!is_array($categories)||count($categories)<1||count($categories)>50)fail('Dodaj od 1 do 50 kategorii.');
    foreach($categories as$category){
        if(!is_array($category))fail('Sprawdź kategorię.');
        $id=text_value($category['id']??'',90,'adres kategorii',true);
        if(!preg_match('/^[a-z][a-z0-9-]*$/D',$id)||isset($categoryIds[$id])||!in_array($category['catalog']??'',['boards','custom'],true))fail('Sprawdź nazwę i miejsce kategorii.');
        $categoryIds[$id]=true;$out['categories'][]=['id'=>$id,'name'=>text_value($category['name']??'',120,'nazwa kategorii',true),'description'=>text_value($category['description']??'',500,'opis kategorii'),'catalog'=>$category['catalog']];
    }
    foreach ($s['products'] as $i=>$p) {
        if (!is_array($p)) fail('Sprawdź produkt.');
        $id=text_value($p['id']??null,90,'adres produktu',true);
        if (!preg_match('/^gra-[a-z0-9]+(?:-[a-z0-9]+)*$/D',$id) || isset($ids[$id])) fail('Adresy produktów muszą być różne, np. gra-nowa-przygoda.'); $ids[$id]=true;
        $kind=$p['kind']??''; if (!in_array($kind,['board','puzzle','memory','custom'],true)) fail('Wybierz rodzaj produktu.');
        $category=$p['category']??''; if (!is_string($category)||!isset($categoryIds[$category])) fail('Wybierz istniejącą kategorię produktu.');
        $audiences=$p['audiences']??[]; if (!is_array($audiences) || array_diff($audiences,['school','company'])) fail('Sprawdź grupę odbiorców.');
        $q=['id'=>$id,'url'=>$id.'.html','name'=>text_value($p['name']??null,120,'nazwa produktu',true),'image'=>valid_image($p['image']??null),'kind'=>$kind,'format'=>text_value($p['format']??'',160,'rodzaj gry'),'description'=>text_value($p['description']??'',6000,'opis'),'included'=>text_value($p['included']??'',3000,'zawartość zestawu'),'material'=>text_value($p['material']??'',3000,'materiał'),'sort'=>$i,'visible'=>($p['visible']??false)===true,'category'=>$category,'audiences'=>array_values(array_unique($audiences)),'facts'=>[],'variants'=>[]];
        $facts=$p['facts']??[]; if (!is_array($facts)||count($facts)>10) fail('Można dodać do 10 parametrów produktu.');
        foreach ($facts as $f) { if (!is_array($f)||count($f)!==2) fail('Sprawdź parametry produktu.'); $q['facts'][]=[text_value($f[0],70,'nazwa parametru',true),text_value($f[1],200,'wartość parametru',true)]; }
        if (!is_array($p['variants']??null)||count($p['variants'])<1||count($p['variants'])>30) fail('Produkt potrzebuje od 1 do 30 wariantów.');
        $vids=[];
        foreach ($p['variants'] as $v) {
            $vid=text_value($v['id']??null,60,'wariant',true); if (!preg_match('/^[a-zA-Z0-9-]+$/D',$vid)||isset($vids[$vid])) fail('Sprawdź oznaczenia wariantów.'); $vids[$vid]=true;
            $net=$v['net']??null; $gross=$v['gross']??null;
            if (($net===null)!==($gross===null)) fail('Wypełnij obie ceny albo wybierz wycenę indywidualną.');
            foreach ([$net,$gross] as $n) if ($n!==null && (!is_numeric($n)||!is_finite((float)$n)||(float)$n<0||(float)$n>10000000)) fail('Cena musi być liczbą od 0 do 10 000 000 zł.');
            $q['variants'][]=['id'=>$vid,'label'=>text_value($v['label']??null,150,'nazwa wariantu',true),'net'=>$net===null?null:round((float)$net,2),'gross'=>$gross===null?null:round((float)$gross,2)];
        }
        $out['products'][]=$q;
        $last=count($out['products'])-1;
        $out['products'][$last]['summary']=text_value($p['summary']??$p['format']??'',200,'podtytuł produktu');
        $out['products'][$last]['shortDescription']=text_value($p['shortDescription']??mb_substr($p['description']??'',0,160),400,'krótki opis w katalogu');
    }
    $deleted=$s['deletedProducts']??[];if(!is_array($deleted)||count($deleted)>2000)fail('Nieprawidłowa lista usuniętych produktów.');
    foreach($seed['products']as$original)if(!isset($ids[$original['id']]))$deleted[]=$original['id'];
    foreach($deleted as$id){if(!is_string($id)||strlen($id)>90||!preg_match('/^gra-[a-z0-9]+(?:-[a-z0-9]+)*$/D',$id))fail('Nieprawidłowy adres usuniętego produktu.');if(!isset($ids[$id]))$out['deletedProducts'][]=$id;}
    $out['deletedProducts']=array_values(array_unique($out['deletedProducts']));
    if (!is_array($s['pages'])||count($s['pages'])!==count($seed['pages'])) fail('Nieprawidłowe strony.');
    $given=array_column($s['pages'],null,'id');
    foreach ($seed['pages'] as $page) {
        $in=$given[$page['id']]??null; if (!$in || !is_array($in['fields']??null)) fail('Nieprawidłowe treści strony.');
        $page['title']=text_value($in['title']??null,180,'tytuł strony',true); $page['description']=text_value($in['description']??'',500,'opis w wyszukiwarce');
        $fields=array_column($in['fields'],null,'key');
        foreach ($page['fields'] as &$field) { $v=$fields[$field['key']]['value']??null; $field['value']=$field['type']==='image'?valid_image($v):text_value($v,4000,$field['label']); } unset($field);
        $out['pages'][]=$page;
    }
    $a=$s['appearance']; $out['appearance']=[];
    foreach (['primary','accent','background'] as $k) { if (!preg_match('/^#[a-fA-F0-9]{6}$/D',$a[$k]??'')) fail('Wybierz poprawny kolor.'); $out['appearance'][$k]=strtolower($a[$k]); }
    if (!is_int($a['radius']??null)||$a['radius']<0||$a['radius']>40||!in_array($a['font']??'',['lato','system'],true)) fail('Sprawdź ustawienia wyglądu.');
    $out['appearance']+=['radius'=>$a['radius'],'font'=>$a['font']];
    $featured=$a['featured']??$seed['appearance']['featured'];
    if (!is_array($featured)||!array_is_list($featured)||count($featured)>20) fail('Dodaj do 20 slajdów do karuzeli.');
    $out['appearance']['featured']=[];$featuredGames=[];
    foreach($featured as $slide){
        if(is_string($slide)){
            if(!isset($ids[$slide])||isset($featuredGames[$slide]))fail('Wybierz różne istniejące gry do karuzeli.');
            $featuredGames[$slide]=true;$out['appearance']['featured'][]=$slide;
        }elseif(is_array($slide)&&($slide['type']??'')==='image'){
            $out['appearance']['featured'][]=['type'=>'image','image'=>valid_image($slide['image']??null),'alt'=>text_value($slide['alt']??'',300,'opis zdjęcia',true),'caption'=>text_value($slide['caption']??'',120,'podpis zdjęcia')];
        }else fail('Wybierz grę albo zdjęcie z biblioteki do karuzeli.');
    }
    $c=$s['contact']; $email=text_value($c['email']??null,190,'e-mail',true); if (!filter_var($email,FILTER_VALIDATE_EMAIL)||!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+$/D',$email)) fail('Wpisz poprawny adres e-mail.');
    $out['contact']=['email'=>$email,'phone'=>text_value($c['phone']??'',50,'telefon'),'address'=>text_value($c['address']??'',250,'adres')];
    $visual=$s['visual']??['pages'=>[]];if(is_array($visual)&&is_array($visual['pages']??null))foreach($out['deletedProducts']as$id)unset($visual['pages'][$id.'.html']);
    $out['visual']=validate_visual($visual,array_merge(array_column($out['pages'],'file'),array_column($out['products'],'url')));
    return $out;
}
