<?php
declare(strict_types=1);

function geo_llms(array $state,string $base): string {
    $s="# Wielkie Gry Planszowe\n\n> Gry wielkoformatowe dla szkół, firm i instytucji oraz gry na zamówienie.\n\nSerwis: ".$base."\nJęzyk: polski.\nKontakt: ".$state['contact']['email'].'; '.$state['contact']['phone'].'; '.$state['contact']['address'].".\n\n## Strony główne\n";
    foreach(['oferta','szkoly','firmy','gry-na-zamowienie','wielkie-gry-planszowe','inne','kontakt']as$f)$s.='- ['.$f.']('.$base.$f.".html)\n";
    $s.="\n## Produkty\n";foreach($state['products']as$p)if($p['visible'])$s.='- ['.$p['name'].']('.$base.$p['url'].'): '.preg_replace('/\s+/u',' ',$p['shortDescription']??$p['description'])."\n";
    return $s."\n## Ceny i zamawianie\nCeny i warianty są podane na stronach produktów. Kwoty brutto są w PLN, za jeden zestaw. Warianty bez ceny wymagają indywidualnej wyceny. Formularz kontaktowy przygotowuje wiadomość, a wysyłkę zatwierdza użytkownik w swojej poczcie. Szczegóły realizacji potwierdza firma.\n\n## Źródła\n- [Mapa witryny](".$base."sitemap.xml)\n";
}

// Rebuild search metadata after CMS edits, including visual edits. No body changes.
function geo_metadata(DOMDocument $d,string $file,array $state,?array $product): void {
    $robots=first($d,'//meta[@name="robots"]');
    if($robots&&str_contains($robots->getAttribute('content'),'noindex'))return;
    $base=rtrim(config()['base_url'],'/').'/';$url=$base.($file==='index.html'?'':$file);
    $meta=function(string $key,string $value,bool $property=false)use($d):void{
        $attr=$property?'property':'name';$found=nodes($d,'//meta[@'.$attr.'="'.$key.'"]');
        $e=array_shift($found);foreach($found as$extra)$extra->parentNode->removeChild($extra);
        if(!$e){$e=$d->createElement('meta');$e->setAttribute($attr,$key);$d->getElementsByTagName('head')->item(0)->appendChild($e);}
        $e->setAttribute('content',$value);
    };
    $title=first($d,'//title')?->textContent??'';$description=first($d,'//meta[@name="description"]')?->getAttribute('content')??'';
    $meta('robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    foreach(['title'=>$title,'description'=>$description,'url'=>$url]as$key=>$value)$meta('og:'.$key,$value,true);
    $image=$product?$base.$product['image']:(first($d,'//meta[@property="og:image"]')?->getAttribute('content')??'');
    if($image){$meta('og:image',$image,true);$meta('og:image:alt',$product['name']??'Wielkie Gry Planszowe',true);$meta('twitter:image',$image);}
    $meta('twitter:card','summary_large_image');$meta('twitter:title',$title);$meta('twitter:description',$description);
    foreach(['canonical'=>$url,'sitemap'=>$base.'sitemap.xml']as$rel=>$href){
        $e=first($d,'//link[@rel="'.$rel.'"]');if(!$e){$e=$d->createElement('link');$e->setAttribute('rel',$rel);$d->getElementsByTagName('head')->item(0)->appendChild($e);}
        $e->setAttribute('href',$href);if($rel==='sitemap')$e->setAttribute('type','application/xml');
    }
    $org=['@type'=>'Organization','@id'=>$base.'#organization','name'=>'Wielkie Gry Planszowe','url'=>$base,'email'=>$state['contact']['email'],'telephone'=>$state['contact']['phone'],'address'=>$state['contact']['address']];
    $old=[];foreach(nodes($d,'//script[@type="application/ld+json"]')as$e){$v=json_decode($e->textContent,true);if(is_array($v))$old=array_merge($old,isset($v['@graph'])?$v['@graph']:(array_is_list($v)?$v:[$v]));$e->parentNode->removeChild($e);}
    foreach($old as$n)if(($n['@type']??'')==='Organization'&&isset($n['logo']))$org['logo']=$n['logo'];
    $page=['@type'=>$file==='kontakt.html'?'ContactPage':(in_array($file,['oferta.html','wielkie-gry-planszowe.html','inne.html','szkoly.html','firmy.html'],true)?'CollectionPage':'WebPage'),'@id'=>$url.'#webpage','url'=>$url,'name'=>$title,'description'=>$description,'inLanguage'=>'pl-PL','isPartOf'=>['@id'=>$base.'#website'],'publisher'=>['@id'=>$org['@id']]];
    $graph=[$org,['@type'=>'WebSite','@id'=>$base.'#website','url'=>$base,'name'=>'Wielkie Gry Planszowe','inLanguage'=>'pl-PL','publisher'=>['@id'=>$org['@id']]]];
    $crumb=null;foreach($old as$n)if(($n['@type']??'')==='BreadcrumbList'){$crumb=$n;unset($crumb['@context']);$crumb['@id']=$url.'#breadcrumb';}
    if($product){
        $p=$product;$node=['@type'=>'Product','@id'=>$url.'#product','url'=>$url,'name'=>$p['name'],'description'=>$p['description'],'image'=>$base.$p['image'],'category'=>$p['format'],'brand'=>['@type'=>'Brand','name'=>'Wielkie Gry Planszowe'],'mainEntityOfPage'=>['@id'=>$page['@id']]];
        $facts=[];foreach(nodes($d,'//*['.css_class('product-facts').']//dt')as$dt){$dd=$dt->nextSibling;while($dd&&$dd->nodeType!==XML_ELEMENT_NODE)$dd=$dd->nextSibling;if($dd&&$dd->nodeName==='dd')$facts[]=['@type'=>'PropertyValue','name'=>trim($dt->textContent),'value'=>trim($dd->textContent)];}
        if($facts)$node['additionalProperty']=$facts;
        $offers=[];foreach($p['variants']as$v)if(is_numeric($v['gross'])&&$v['gross']>0)$offers[]=['@type'=>'Offer','url'=>$url,'name'=>$p['name'].' — '.$v['label'],'price'=>number_format((float)$v['gross'],2,'.',''),'priceCurrency'=>'PLN','seller'=>['@id'=>$org['@id']]];
        if($offers)$node['offers']=$offers;$graph[]=$node;$page['mainEntity']=['@id'=>$node['@id']];
        if(!$crumb){$items=[['Strona główna',$base],['Oferta',$base.'oferta.html'],[$p['kind']==='board'?'Wielkie gry planszowe':'Inne',$base.($p['kind']==='board'?'wielkie-gry-planszowe.html':'inne.html')],[$p['name'],$url]];$crumb=['@type'=>'BreadcrumbList','@id'=>$url.'#breadcrumb','itemListElement'=>[]];foreach($items as$i=>$item)$crumb['itemListElement'][]=['@type'=>'ListItem','position'=>$i+1,'name'=>$item[0],'item'=>$item[1]];}
    }else{
        $urls=[];foreach(nodes($d,'//body//a[@href]')as$a)$urls[]=basename(parse_url($a->getAttribute('href'),PHP_URL_PATH)??'');
        $items=[];foreach($state['products']as$p)if($p['visible']&&in_array($p['url'],$urls,true))$items[]=['@type'=>'ListItem','position'=>count($items)+1,'name'=>$p['name'],'url'=>$base.$p['url']];
        if($items){$id=$url.'#catalog';$graph[]=['@type'=>'ItemList','@id'=>$id,'name'=>$title,'numberOfItems'=>count($items),'itemListElement'=>$items];$page['mainEntity']=['@id'=>$id];}
    }
    if($crumb){$graph[]=$crumb;$page['breadcrumb']=['@id'=>$crumb['@id']];}
    $faq=[];foreach(nodes($d,'//main//details')as$details){$summary=$details->getElementsByTagName('summary')->item(0);if(!$summary)continue;$answer='';foreach($details->childNodes as$child)if($child!==$summary)$answer.=' '.$child->textContent;$answer=trim(preg_replace('/\s+/u',' ',$answer));if($answer!=='')$faq[]=['@type'=>'Question','name'=>trim($summary->textContent),'acceptedAnswer'=>['@type'=>'Answer','text'=>$answer]];}
    if($faq)$graph[]=['@type'=>'FAQPage','@id'=>$url.'#faq','inLanguage'=>'pl-PL','mainEntity'=>$faq];
    $graph[]=$page;
    // Decode old template entities inside JSON strings; JSON-LD is a raw-text element.
    $decode=function($v)use(&$decode){if(is_string($v))return html_entity_decode($v,ENT_QUOTES|ENT_HTML5,'UTF-8');if(is_array($v))return array_map($decode,$v);return $v;};
    $schema=['@context'=>'https://schema.org','@graph'=>$decode($graph)];
    $e=$d->createElement('script');$e->setAttribute('type','application/ld+json');$e->appendChild($d->createTextNode(json_encode($schema,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR)));$d->getElementsByTagName('head')->item(0)->appendChild($e);
}
