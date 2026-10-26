<?php
declare(strict_types=1);
function esc(string $s): string { return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function css_class(string $name): string { return "contains(concat(' ',normalize-space(@class),' '),' $name ')"; }
function nodes(DOMDocument $d,string $path): array { return iterator_to_array((new DOMXPath($d))->query($path)); }
function first(DOMDocument $d,string $path): ?DOMElement { return nodes($d,$path)[0]??null; }
function set_text(DOMNode $e,string $value): void { while($e->firstChild) $e->removeChild($e->firstChild); $e->appendChild($e->ownerDocument->createTextNode($value)); }
function set_image(DOMElement $e,string $src): void {
    $e->setAttribute('src',$src); $e->removeAttribute('srcset');
    if ($e->parentNode instanceof DOMElement && strtolower($e->parentNode->tagName)==='picture') foreach(iterator_to_array($e->parentNode->getElementsByTagName('source')) as $s) $s->parentNode->removeChild($s);
}
function fragment(DOMDocument $d,string $html): DOMDocumentFragment {
    $tmp=new DOMDocument('1.0','UTF-8'); $tmp->loadHTML('<?xml encoding="UTF-8"><div id="wgp-fragment">'.$html.'</div>',LIBXML_HTML_NOIMPLIED|LIBXML_HTML_NODEFDTD|LIBXML_NONET);
    $f=$d->createDocumentFragment(); $root=$tmp->getElementById('wgp-fragment'); foreach(iterator_to_array($root->childNodes) as $e) $f->appendChild($d->importNode($e,true)); return $f;
}
function replace_children(DOMElement $e,string $html): void { while($e->firstChild)$e->removeChild($e->firstChild); $e->appendChild(fragment($e->ownerDocument,$html)); }
function money(mixed $n): string { return $n===null?'Wycena indywidualna':number_format((float)$n,fmod((float)$n,1.0)==0?0:2,',',' ').' zł'; }
function price_html(array $p): string {
    $priced=array_values(array_filter($p['variants'],fn($v)=>$v['gross']!==null)); usort($priced,fn($a,$b)=>$a['gross']<=>$b['gross']); $v=$priced[0]??$p['variants'][0];
    return '<div class="price-block"><strong>'.($v['gross']===null?'Wycena indywidualna':'od '.money($v['gross']).' brutto').'</strong><span>'.($v['net']===null?esc($v['label']):money($v['net']).' netto · '.esc($v['label'])).'</span></div>';
}
function card_html(array $p,bool $audience=false): string {
    $name=esc($p['name']); $href=esc($p['url']); $img=esc($p['image']); $desc=esc($p['shortDescription']??mb_strimwidth($p['description'],0,200,'…'));
    if ($audience) return '<article class="game-card"><a class="game-link" href="'.$href.'"><div class="game-image"><img class="crop" src="'.$img.'" width="800" height="800" alt="'.$name.'" style="object-fit:contain;background:#f3f7fc" loading="lazy"></div><div class="game-copy"><p class="game-category">'.esc($p['format']).'</p><h3>'.$name.'</h3><p class="game-description">'.$desc.'</p>'.price_html($p).'<span class="game-action">Zobacz grę →</span></div></a></article>';
    return '<article class="catalog-card"><a href="'.$href.'"><div class="catalog-image '.($p['kind']==='board'?'catalog-board':'catalog-custom').'"><img src="'.$img.'" width="800" height="800" alt="'.$name.'" loading="lazy"></div><div class="catalog-copy"><h3>'.$name.'</h3><p>'.$desc.'</p>'.price_html($p).'<span class="catalog-link"><span>Poznaj grę</span><span aria-hidden="true">→</span></span></div></a></article>';
}
function catalog_js(array $state): string {
    $products=array_values(array_filter($state['products'],fn($p)=>$p['visible'])); $data=json_encode($products,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    return '(()=>{const products='.$data.';const money=amount=>amount==null?"Wycena indywidualna":new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN",minimumFractionDigits:Number.isInteger(amount)?0:2,maximumFractionDigits:2}).format(amount);const normalize=text=>String(text).trim().toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l");const get=key=>products.find(p=>p.id===key||p.url===key||normalize(p.name)===normalize(key));const options=p=>p?.variants||[];const variant=(p,id)=>options(p).find(v=>v.id===id)||options(p)[0];const totals=(v,q)=>({net:v?.net==null?null:v.net*q,gross:v?.gross==null?null:Math.round(v.gross*q*100)/100});const contactURL=(p,v,q=1)=>{const x=new URLSearchParams({produkt:p.id,wariant:v.id,liczba:String(q),zamiar:"zakup"});if(location.search.includes("preview=1"))x.set("preview","1");return "kontakt.html?"+x+"#formularz-kontaktowy";};window.WGPCatalog={products,get,options,variant,money,totals,contactURL};})();';
}
function render_carousel(DOMDocument $d,array $state,array $visible): void {
    $stage=first($d,'//*['.css_class('hero-product-stage').']');if(!$stage)return;
    $templates=nodes($d,'//figure[@data-product-slide]');if(!$templates)return;
    $original=['gra-skarb-piratow','gra-zostan-kierowca','gra-segreguj-smieci'];
    $seed=array_column(json_decode(file_get_contents(__DIR__.'/seed.json'),true)['products'],null,'id');$byId=array_column($visible,null,'id');
    $featured=array_values(array_filter($state['appearance']['featured']??$original,fn($id)=>isset($byId[$id])));$total=count($featured);
    while($stage->firstChild)$stage->removeChild($stage->firstChild);$dots='';
    foreach($featured as$i=>$id){
        $p=$byId[$id];$originalIndex=array_search($id,$original,true);$optimized=$originalIndex!==false&&$p['image']===($seed[$id]['image']??'');
        $figure=$templates[$optimized?$originalIndex:0]->cloneNode(true);$figure->setAttribute('data-product-slide',(string)$i);$figure->setAttribute('aria-label',($i+1).' z '.$total.': '.$p['name']);
        $figure->setAttribute('class','hero-product-slide'.($i===0?' is-active':''));if($i===0)$figure->removeAttribute('hidden');else$figure->setAttribute('hidden','');
        foreach(iterator_to_array($figure->getElementsByTagName('strong'))as$e)set_text($e,$p['name']);
        foreach(iterator_to_array($figure->getElementsByTagName('img'))as$img){if(!$optimized)set_image($img,$p['image']);$img->setAttribute('alt','Plansza gry: '.$p['name']);$img->setAttribute('loading',$i===0?'eager':'lazy');$img->setAttribute('fetchpriority',$i===0?'high':'low');}
        $stage->appendChild($figure);$dots.='<button type="button" data-slide="'.$i.'" aria-label="Pokaż grę: '.esc($p['name']).'" aria-pressed="'.($i===0?'true':'false').'"></button>';
    }
    if(!$total)replace_children($stage,'<p class="empty">Wybierz gry do karuzeli w panelu lub sprawdź naszą ofertę.</p>');
    if($e=first($d,'//*['.css_class('carousel-dots').']'))replace_children($e,$dots);
    if($e=first($d,'//*[@id="carousel-status"]'))set_text($e,$total?'Gra 1 z '.$total.': '.$byId[$featured[0]]['name'].'.':'');
    if($e=first($d,'//*['.css_class('carousel-toolbar').']')){if($total<2)$e->setAttribute('hidden','');else$e->removeAttribute('hidden');}
    $style=$d->createElement('style','.carousel-dots{flex-wrap:wrap;max-width:min(60vw,30rem)}.carousel-toolbar{max-width:calc(100% - 1.25rem)}.carousel-toolbar[hidden]{display:none!important}');$d->getElementsByTagName('head')->item(0)->appendChild($style);
}
function render_categories(DOMDocument $d,array $state,array $visible,string $catalog): void {
    $sections=nodes($d,'//section['.css_class('catalog-section').']');if(!$sections)return;
    $parent=$sections[0]->parentNode;$marker=$d->createComment('WGP catalog');$parent->insertBefore($marker,$sections[0]);foreach($sections as$e)$e->parentNode->removeChild($e);
    $links='';$count=0;
    foreach($state['categories']??default_categories()as$c){
        if($c['catalog']!==$catalog)continue;$products=array_values(array_filter($visible,fn($p)=>$p['category']===$c['id']));if(!$products)continue;
        $cards='';foreach($products as$p)$cards.=card_html($p);$id=esc($c['id']);
        $html='<section class="catalog-section" id="'.$id.'" aria-labelledby="title-'.$id.'"><div class="catalog-section-heading"><h2 id="title-'.$id.'">'.esc($c['name']).'</h2><span>Produkty: '.count($products).'</span></div>'.($c['description']!==''?'<p>'.esc($c['description']).'</p>':'').'<div class="catalog-grid">'.$cards.'</div></section>';
        $parent->insertBefore(fragment($d,$html),$marker);$links.='<a href="#'.$id.'">'.esc($c['name']).'</a>';$count++;
    }
    if(!$count)$parent->insertBefore(fragment($d,'<p class="empty">Obecnie nie ma produktów w tym katalogu. Zapraszamy do kontaktu.</p>'),$marker);
    if($nav=first($d,'//*['.css_class('catalog-topics').']'))replace_children($nav,$links);
    $parent->removeChild($marker);
}
function render_site(string $file,array $state,bool $preview=false): ?string {
    $all=array_column($state['products'],null,'url'); $product=$all[$file]??null;
    $seedIds=array_column(json_decode(file_get_contents(__DIR__.'/seed.json'),true)['products'],'id');
    $deleted=array_unique(array_merge($state['deletedProducts']??[],array_values(array_diff($seedIds,array_column($state['products'],'id')))));
    if(in_array(basename($file,'.html'),$deleted,true)&&!$product)return null;
    if ($product && !$product['visible'] && !$preview) return null;
    $template=$file;
    if ($product && !is_file(config()['templates_dir'].'/'.$file)) $template='gra-farmer.html';
    if (!preg_match('/^[a-z0-9-]+\.html$/D',$template) || !is_file(config()['templates_dir'].'/'.$template)) return null;
    libxml_use_internal_errors(true);
    $html=file_get_contents(config()['templates_dir'].'/'.$template);
    $html=str_replace(['https://dzabrys.github.io/WGP','/WGP/'],[config()['base_url'],'/'],$html);
    $d=new DOMDocument('1.0','UTF-8'); $d->loadHTML('<?xml encoding="UTF-8">'.$html,LIBXML_NONET); $xp=new DOMXPath($d);
    foreach(iterator_to_array($d->childNodes) as $n) if ($n->nodeType===XML_PI_NODE) $d->removeChild($n);
    $visible=array_filter($state['products'],fn($p)=>$p['visible']);
    if ($file==='index.html') render_carousel($d,$state,$visible);
    $page=null; foreach($state['pages'] as $p)if($p['file']===$file){$page=$p;break;}
    if ($page) {
        if ($e=first($d,'//title')) set_text($e,$page['title']);
        if ($e=first($d,'//meta[@name="description"]')) $e->setAttribute('content',$page['description']);
        foreach($page['fields'] as $f) {
            if ($f['value']===$f['original']) continue;
            $e=first($d,$f['xpath']); if(!$e)continue;
            if ($f['type']==='image') { foreach(nodes($d,'//main//img') as $img) if($img->getAttribute('src')===$f['original'])set_image($img,$f['value']); }
            else { set_text($e,$f['value']); }
        }
    }
    // Refresh all existing product cards, including related products and custom formats.
    foreach(nodes($d,'//*['.css_class('catalog-card').' or '.css_class('game-card').']') as $card) {
        $a=$card->getElementsByTagName('a')->item(0); $href=$a?basename(parse_url($a->getAttribute('href'),PHP_URL_PATH)??''):'';
        if(in_array(basename($href,'.html'),$deleted,true)){$card->parentNode->removeChild($card);continue;}
        if(!isset($all[$href]))continue; $p=$all[$href];
        if(!$p['visible']){$card->parentNode->removeChild($card);continue;}
        $card->parentNode->replaceChild(fragment($d,card_html($p,str_contains(' '.$card->getAttribute('class').' ',' game-card '))),$card);
    }
    if(in_array($file,['wielkie-gry-planszowe.html','inne.html'],true)) {
        render_categories($d,$state,$visible,$file==='inne.html'?'custom':'boards');
    }
    if(in_array($file,['szkoly.html','firmy.html'],true)) {
        $key=$file==='szkoly.html'?'school':'company'; $cards='';foreach($visible as $p)if(in_array($key,$p['audiences'],true))$cards.=card_html($p,true);
        if($grid=first($d,'//*['.css_class('games-grid').']'))replace_children($grid,$cards?:'<p>Zapytaj nas o dostępne gry.</p>');
    }
    if($product) {
        $p=$product; foreach(nodes($d,'//body[@data-product-id]') as $e)$e->setAttribute('data-product-id',$p['id']);
        foreach(['//*[@id="product-title"]'=>$p['name'],'//*['.css_class('product-description').']'=>$p['description'],'//*['.css_class('product-summary').']'=>$p['summary']??$p['format'],'//*['.css_class('product-included').']/p'=>$p['included'],'//*['.css_class('product-detail-faq').']/details[1]//p'=>$p['material']] as $selector=>$value)foreach(nodes($d,$selector)as$e)set_text($e,$value);
        foreach(nodes($d,'//*['.css_class('product-image').']//img')as$e){set_image($e,$p['image']);$e->setAttribute('alt',$p['name']);}
        if($e=first($d,'//*['.css_class('product-facts').']')){ $facts='';foreach($p['facts']as$f)$facts.='<div><dt>'.esc($f[0]).'</dt><dd>'.esc($f[1]).'</dd></div>';replace_children($e,$facts);$e->setAttribute('data-count',(string)count($p['facts'])); }
        if($e=first($d,'//*[@data-product-offer]')){ $e->setAttribute('data-product-offer',$p['id']);$rows='';foreach($p['variants']as$i=>$v)$rows.='<tr><th scope="row"><label><input type="radio" name="product-variant" value="'.esc($v['id']).'" '.($i===0?'checked':'').'><span>'.esc($v['label']).'</span></label></th><td>'.esc(money($v['net'])).'</td><td>'.esc(money($v['gross'])).'</td></tr>';foreach(iterator_to_array($e->getElementsByTagName('tbody'))as$tbody)replace_children($tbody,$rows);foreach(iterator_to_array($e->getElementsByTagName('caption'))as$cap)set_text($cap,'Rozmiary i ceny gry '.$p['name']); }
        if($e=first($d,'//*[@data-product-price]')){ $f=fragment($d,price_html($p));$n=$f->firstChild;$n->setAttribute('data-product-price','');$e->parentNode->replaceChild($f,$e); }
        if($e=first($d,'//title'))set_text($e,$p['name'].' | Wielkie Gry Planszowe');
        if($e=first($d,'//meta[@name="description"]'))$e->setAttribute('content',mb_substr($p['description'],0,250));
        if($e=first($d,'//link[@rel="canonical"]'))$e->setAttribute('href',config()['base_url'].'/'.$p['url']);
        foreach(nodes($d,'//nav[@aria-label="Ścieżka nawigacji"]//li[last()]')as$e)set_text($e,'› '.$p['name']);
        if ($e=first($d,'//*[@data-product-total]'))set_text($e,$p['variants'][0]['label'].' · '.money($p['variants'][0]['gross']));
        // Replace static product schema rather than leaving stale prices/names in search metadata.
        foreach(nodes($d,'//script[@type="application/ld+json"]')as$e)$e->parentNode->removeChild($e);
        $schema=['@context'=>'https://schema.org','@type'=>'Product','name'=>$p['name'],'description'=>$p['description'],'image'=>config()['base_url'].'/'.$p['image'],'url'=>config()['base_url'].'/'.$p['url']];
        $e=$d->createElement('script');$e->setAttribute('type','application/ld+json');$e->appendChild($d->createTextNode(json_encode($schema,JSON_HEX_TAG|JSON_HEX_AMP|JSON_UNESCAPED_UNICODE)));$d->getElementsByTagName('head')->item(0)->appendChild($e);
    }
    // Site-wide company contact information.
    foreach(nodes($d,'//*[@data-footer-copy-email]')as$e){$e->setAttribute('data-footer-copy-email',$state['contact']['email']);$e->setAttribute('aria-label','Skopiuj adres e-mail: '.$state['contact']['email']);set_text($e,$state['contact']['email']);}
    foreach(nodes($d,'//*['.css_class('footer-phone').']')as$e)set_text($e,$state['contact']['phone']);
    foreach(nodes($d,'//*['.css_class('footer-map-link').']')as$e){if($state['contact']['address']!=='ul. Lubelska 37D, 10-408 Olsztyn')set_text($e,$state['contact']['address']);$e->setAttribute('href','https://www.google.com/maps/search/?api=1&query='.rawurlencode($state['contact']['address']));}
    foreach(nodes($d,'//a[starts-with(@href,"mailto:")]')as$e){$e->setAttribute('href','mailto:'.$state['contact']['email']);if(str_contains($e->textContent,'@'))set_text($e,$state['contact']['email']);}
    foreach(nodes($d,'//a[starts-with(@href,"tel:")]')as$e)$e->setAttribute('href','tel:'.preg_replace('/[^+0-9]/','',$state['contact']['phone']));
    foreach(iterator_to_array($xp->query('//text()[normalize-space(.)="+48 600 894 644"]'))as$e)$e->nodeValue=$state['contact']['phone'];
    foreach(nodes($d,'//main//p')as$e)if($state['contact']['address']!=='ul. Lubelska 37D, 10-408 Olsztyn'&&str_contains($e->textContent,'ul. Lubelska 37D')&&str_contains($e->textContent,'10-408 Olsztyn'))set_text($e,$state['contact']['address']);
    $updateOrganisation=function(&$v)use(&$updateOrganisation,$state){if(!is_array($v))return;if(($v['@type']??'')==='Organization'){$v['email']=$state['contact']['email'];$v['telephone']=$state['contact']['phone'];if($state['contact']['address']!=='ul. Lubelska 37D, 10-408 Olsztyn')$v['address']=$state['contact']['address'];}foreach($v as &$child)if(is_array($child))$updateOrganisation($child);};
    foreach(nodes($d,'//script[@type="application/ld+json"]')as$e){$data=json_decode($e->textContent,true);if(is_array($data)){$updateOrganisation($data);set_text($e,json_encode($data,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));}}
    $a=$state['appearance'];$seed=json_decode(file_get_contents(__DIR__.'/seed.json'),true);
    $visual=$a;$baseline=$seed['appearance'];unset($visual['featured'],$baseline['featured']);
    if($visual!==$baseline){
        $style=$d->createElement('style');$style->setAttribute('id','wgp-appearance');
        $css='body.design-a{background:'.$a['background'].'!important;color:'.$a['primary'].'}body.design-a.design-refined .button{background:'.$a['accent'].'!important;color:'.$a['primary'].'!important}body.design-a.design-refined h1,body.design-a.design-refined h2,body.design-a.design-refined h3,body.design-a.design-refined .header nav>a{color:'.$a['primary'].'!important}body.design-a.design-refined .hero-copy h1 span{color:'.$a['accent'].'!important}body.design-a.design-refined .audience,body.design-a.design-refined .hero-carousel,body.design-a.design-refined .catalog-card{border-radius:'.($a['radius']/16).'rem!important}';
        if($a['font']==='system')$css.='body.design-a,body.design-a button,body.design-a input,body.design-a select,body.design-a textarea{font-family:system-ui,sans-serif!important}';
        $style->appendChild($d->createTextNode($css));$d->getElementsByTagName('head')->item(0)->appendChild($style);
    }
    foreach(nodes($d,'//script[contains(@src,"product-catalog.js")]')as$e)$e->setAttribute('src','cms-catalog.js'.($preview?'?preview=1':''));
    if ($e=first($d,'//meta[@name="contact-api-base"]')) $e->setAttribute('content',config()['base_url'].'/');
    $title=first($d,'//title')?->textContent??''; $description=first($d,'//meta[@name="description"]')?->getAttribute('content')??'';
    foreach(nodes($d,'//meta[@property="og:title"]')as$e)$e->setAttribute('content',$title);
    foreach(nodes($d,'//meta[@property="og:description"]')as$e)$e->setAttribute('content',$description);
    foreach(nodes($d,'//meta[@property="og:url"]')as$e)$e->setAttribute('content',config()['base_url'].'/'.($file==='index.html'?'':$file));
    if($product)foreach(nodes($d,'//meta[@property="og:image"]')as$e)$e->setAttribute('content',config()['base_url'].'/'.$product['image']);
    if($preview){
        foreach(nodes($d,'//a[@href]')as$e){$href=$e->getAttribute('href');if(preg_match('~^[a-z0-9-]+\.html(?:\?[^#]*)?(?:#.*)?$~',$href)){[$base,$hash]=array_pad(explode('#',$href,2),2,'');$e->setAttribute('href',$base.(str_contains($base,'?')?'&':'?').'preview=1'.($hash?'#'.$hash:''));}}
        $banner=$d->createElement('a','Podgląd szkicu · Wróć do panelu');$banner->setAttribute('href','/panel/');$banner->setAttribute('style','position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#14257d;color:white;padding:10px 18px;border-radius:100px;font:14px system-ui;text-decoration:none;box-shadow:0 3px 20px #0003');$d->getElementsByTagName('body')->item(0)->appendChild($banner);
    }
    libxml_clear_errors();
    return str_replace('biuro@wielkiegryplanszowe.pl',esc($state['contact']['email']),$d->saveHTML());
}
