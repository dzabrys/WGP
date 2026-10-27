<?php
declare(strict_types=1);

// A portable page model, stored in the existing document JSON (SQLite or MariaDB).
// User input is typed data, never executable HTML, JavaScript, CSS or XPath.
function visual_id(mixed $id): bool { return is_string($id)&&preg_match('/^(?:n-[a-f0-9]{16}|new-[a-f0-9-]{8,48})$/D',$id)===1; }
function visual_link(mixed $value): string {
    $s=text_value($value,500,'adres przycisku');
    if($s===''||preg_match('~^(?:[a-z0-9-]+\.html(?:[?#][a-zA-Z0-9_=&%./#-]*)?|#[a-zA-Z0-9_-]+|https://[^\s<>"\\\\]+|mailto:[a-zA-Z0-9._%+@-]+|tel:[+0-9 ()-]+)$~D',$s))return $s;
    fail('Podaj adres podstrony, https://, e-mail lub telefon.');
}
function visual_style(mixed $input): array {
    if(!is_array($input)||count($input)>25)fail('Nieprawidłowy wygląd elementu.');
    $out=[];$numbers=['padding'=>[0,160],'marginTop'=>[0,160],'marginBottom'=>[0,160],'gap'=>[0,100],'fontSize'=>[10,120],'borderRadius'=>[0,100],'maxWidth'=>[100,2400]];
    $enums=['textAlign'=>['left','center','right'],'display'=>['block','flex','grid'],'flexDirection'=>['row','column'],'alignItems'=>['start','center','end','stretch'],'justifyContent'=>['start','center','end','space-between'],'width'=>['auto','25%','33.333%','50%','66.667%','75%','100%'],'objectFit'=>['cover','contain'],'fontWeight'=>['400','500','600','700','800','900'],'gridTemplateColumns'=>['1fr','repeat(2, minmax(0, 1fr))','repeat(3, minmax(0, 1fr))','repeat(4, minmax(0, 1fr))']];
    foreach($input as$key=>$value){
        if(isset($numbers[$key])){[$min,$max]=$numbers[$key];if(!is_int($value)||$value<$min||$value>$max)fail('Sprawdź rozmiar lub odstęp elementu.');}
        elseif(isset($enums[$key])){if(!is_string($value)||!in_array($value,$enums[$key],true))fail('Nieprawidłowe ustawienie układu.');}
        elseif(in_array($key,['color','backgroundColor'],true)){if(!is_string($value)||!preg_match('/^#[a-fA-F0-9]{6}$/D',$value))fail('Wybierz poprawny kolor.');}
        else fail('Niedozwolone ustawienie wyglądu.');
        $out[$key]=$value;
    }
    return $out;
}
function visual_change(mixed $change): array {
    if(!is_array($change)||array_diff(array_keys($change),['text','image','link','style','mobile','hidden']))fail('Nieprawidłowa zmiana strony.');
    $out=[];
    if(isset($change['text']))$out['text']=text_value($change['text'],6000,'tekst na stronie');
    if(isset($change['image']))$out['image']=valid_image($change['image']);
    if(isset($change['link']))$out['link']=visual_link($change['link']);
    foreach(['style','mobile']as$key)if(isset($change[$key]))$out[$key]=visual_style($change[$key]);
    if(isset($change['hidden'])){if(!is_bool($change['hidden']))fail('Sprawdź widoczność elementu.');$out['hidden']=$change['hidden'];}
    return $out;
}
function validate_visual(mixed $input,array $files): array {
    if(!is_array($input)||array_diff(array_keys($input),['pages'])||!is_array($input['pages']??[])||count($input['pages']??[])>550)fail('Nieprawidłowy układ stron.');
    $out=['pages'=>[]];
    foreach($input['pages']??[]as$file=>$model){
        if(!in_array($file,$files,true)||!is_array($model)||array_diff(array_keys($model),['changes','added','order']))fail('Nieprawidłowa strona w edytorze.');
        $page=['changes'=>[],'added'=>[],'order'=>[]];
        foreach(['changes','added','order']as$key)if(!is_array($model[$key]??[])||count($model[$key]??[])>600)fail('Na stronie jest zbyt wiele zmian.');
        foreach($model['changes']??[]as$id=>$change){if(!visual_id($id))fail('Nieprawidłowy element strony.');$page['changes'][$id]=visual_change($change);}
        $ids=[];
        foreach($model['added']??[]as$node){
            if(!is_array($node)||!is_string($node['id']??null)||!str_starts_with($node['id'],'new-')||!visual_id($node['id'])||isset($ids[$node['id']])||!visual_id($node['parent']??null)||!in_array($node['tag']??'', ['section','div','h2','h3','p','img','a'],true))fail('Nieprawidłowy nowy blok.');
            $ids[$node['id']]=true;$page['added'][]=['id'=>$node['id'],'parent'=>$node['parent'],'tag'=>$node['tag'],'content'=>visual_change($node['content']??[])];
        }
        $assigned=[];
        foreach($model['order']??[]as$parent=>$children){
            if(!visual_id($parent)||!is_array($children)||count($children)>600)fail('Nieprawidłowa kolejność elementów.');
            foreach($children as$id){if(!visual_id($id)||$id===$parent||isset($assigned[$id]))fail('Element nie może być w dwóch miejscach.');$assigned[$id]=$parent;}
            $page['order'][$parent]=array_values($children);
        }
        foreach($page['added']as$node)$assigned[$node['id']]??=$node['parent'];
        foreach($assigned as$id=>$parent){$seen=[$id=>true];while(isset($assigned[$parent])){if(isset($seen[$parent]))fail('Nie można umieścić bloku wewnątrz niego samego.');$seen[$parent]=true;$parent=$assigned[$parent];}}
        $out['pages'][$file]=$page;
    }
    return $out;
}
function visual_css(array $style): string {
    $out='';$numeric=['padding','marginTop','marginBottom','gap','fontSize','borderRadius','maxWidth'];
    foreach($style as$key=>$value){$property=strtolower(preg_replace('/[A-Z]/','-$0',$key));$out.=$property.':'.$value.(in_array($key,$numeric,true)?'px':'').'!important;';}
    return $out;
}
function visual_media(DOMElement $node): bool {
    for($p=$node;$p instanceof DOMElement;$p=$p->parentNode){
        if(preg_match('/(?:^|\s)(?:card-photo|hero-product-stage|hero-product-slide|carousel-toolbar|carousel-dots|school-scene|company-photo|custom-photo|proposal-connector|step-arrow)(?:\s|$)/',$p->getAttribute('class')))return true;
    }return false;
}
function visual_container(DOMElement $node): bool {return !visual_media($node)&&in_array(strtolower($node->tagName),['main','div','section','article','aside','figure','header','footer','nav','ul','ol','li','a'],true);}
function visual_movable(DOMElement $node,DOMElement $root): bool {
    if($node===$root||visual_media($node)||$node->getAttribute('aria-hidden')==='true'||preg_match('/(?:^|\s)visually-hidden(?:\s|$)/',$node->getAttribute('class'))||in_array(strtolower($node->tagName),['br','form','table','tbody','tr','td','th'],true))return false;
    $insideForm=false;for($p=$node->parentNode;$p instanceof DOMElement;$p=$p->parentNode)if(strtolower($p->tagName)==='form'){$insideForm=true;break;}
    if($insideForm&&(strtolower($node->tagName)==='button'||$node->getElementsByTagName('input')->length||$node->getElementsByTagName('select')->length||$node->getElementsByTagName('textarea')->length))return false;
    // Inline emphasis, button labels and line breaks travel with their complete text block.
    for($p=$node->parentNode;$p instanceof DOMElement;$p=$p->parentNode){if(in_array(strtolower($p->tagName),['h1','h2','h3','h4','p','a','button','summary','label','span','strong','em'],true))return false;if(visual_container($p))break;}
    return true;
}
function visual_text(DOMElement $node): bool {
    if(!in_array(strtolower($node->tagName),['h1','h2','h3','h4','p','span','strong','em','small','a','button','summary','label','li','dt','dd','figcaption'],true))return false;
    // Replacing a parent text must never delete separately editable descendants or a whole card.
    foreach($node->getElementsByTagName('*')as$child)if(!in_array(strtolower($child->tagName),['br','span','strong','em','small','b','i'],true))return false;
    return true;
}
function visual_set_text(DOMElement $node,string $value): void {
    $old=preg_split('//u',$node->textContent,-1,PREG_SPLIT_NO_EMPTY);$text=preg_split('//u',$value,-1,PREG_SPLIT_NO_EMPTY);if($node->textContent===$value)return;
    $leaves=iterator_to_array((new DOMXPath($node->ownerDocument))->query('.//text()',$node));
    if(!$leaves){$node->insertBefore($node->ownerDocument->createTextNode($value),$node->firstChild);return;}
    $prefix=0;$suffix=0;while($prefix<count($old)&&$prefix<count($text)&&$old[$prefix]===$text[$prefix])$prefix++;
    while($suffix<count($old)-$prefix&&$suffix<count($text)-$prefix&&$old[count($old)-1-$suffix]===$text[count($text)-1-$suffix])$suffix++;
    $insert=implode('',array_slice($text,$prefix,count($text)-$suffix-$prefix));$end=count($old)-$suffix;$offset=0;$inserted=false;
    foreach($leaves as$leaf){$chars=preg_split('//u',$leaf->nodeValue,-1,PREG_SPLIT_NO_EMPTY);$start=$offset;$offset+=count($chars);if($offset<$prefix||$start>$end)continue;
        $before=implode('',array_slice($chars,0,max(0,min(count($chars),$prefix-$start))));$after=implode('',array_slice($chars,max(0,min(count($chars),$end-$start))));
        $leaf->nodeValue=$before.(!$inserted?$insert:'').$after;$inserted=true;
    }
}
function visual_compatible(DOMElement $node,DOMElement $parent): bool {
    if(!visual_container($parent)||strtolower($parent->tagName)==='a'||$node===$parent)return false;
    for($p=$parent;$p instanceof DOMElement;$p=$p->parentNode)if($p===$node)return false;
    if(in_array(strtolower($parent->tagName),['ul','ol'],true)&&strtolower($node->tagName)!=='li')return false;
    if((strtolower($node->tagName)==='a'||$node->getElementsByTagName('a')->length)&&($parent->tagName==='a'||(new DOMXPath($parent->ownerDocument))->query('ancestor::a',$parent)->length))return false;
    return $node->getAttribute('data-wgp-root')===$parent->getAttribute('data-wgp-root');
}
function visual_nodes(DOMDocument $d): array {
    $map=[];$xp=new DOMXPath($d);
    $roots=$xp->query('//main | //header[not(ancestor::main) and not(ancestor::header)] | //footer[not(ancestor::main) and not(ancestor::footer)]');
    foreach($roots as$root){
        $rootKey=strtolower($root->tagName).':'.$root->getNodePath();$walk=function(DOMElement $node,string $path)use(&$walk,&$map,$root,$rootKey){
            $tag=strtolower($node->tagName);
            if(in_array($tag,['script','style','svg','path','source','input','textarea','select','option','noscript','template','iframe'],true))return;
            // Keyed product/slide roots stay stable when catalog entries are added or reordered.
            $path=$node->hasAttribute('id')?'id:'.$node->getAttribute('id'):($node->hasAttribute('data-wgp-key')?preg_replace('~/[^/]+$~','',$path).'/key:'.$node->getAttribute('data-wgp-key'):$path);
            $id='n-'.substr(hash('sha256',$path),0,16);$node->setAttribute('data-wgp-node',$id);$node->setAttribute('data-wgp-root',$rootKey);
            $node->setAttribute('data-wgp-container',visual_container($node)?'1':'0');
            $node->setAttribute('data-wgp-movable',visual_movable($node,$root)?'1':'0');
            $map[$id]=$node;$index=[];
            foreach(iterator_to_array($node->childNodes)as$child)if($child instanceof DOMElement){$t=strtolower($child->tagName);$index[$t]=($index[$t]??0)+1;$walk($child,$path.'/'.$t.'['.$index[$t].']');}
        };
        $walk($root,$rootKey);
    }
    return $map;
}
function apply_visual(DOMDocument $d,string $file,array $state,bool $canvas=false): void {
    $model=$state['visual']['pages'][$file]??['changes'=>[],'added'=>[],'order'=>[]];
    if(!$canvas&&!$model['changes']&&!$model['added']&&!$model['order'])return;
    $map=visual_nodes($d);$remaining=$model['added']??[];
    for($pass=0;$remaining&&$pass<30;$pass++){
        $next=[];foreach($remaining as$added){$parent=$map[$added['parent']]??null;if(!$parent){$next[]=$added;continue;}if(!visual_container($parent))continue;
            $node=$d->createElement($added['tag']);$node->setAttribute('data-wgp-node',$added['id']);$node->setAttribute('data-wgp-root',$parent->getAttribute('data-wgp-root'));$node->setAttribute('data-wgp-container',visual_container($node)?'1':'0');$node->setAttribute('data-wgp-movable','1');
            if($node->tagName==='img'){$node->setAttribute('alt','');$node->setAttribute('style','max-width:100%;height:auto');}
            if(!visual_compatible($node,$parent))continue;$map[$added['id']]=$node;$parent->appendChild($node);
        }$remaining=$next;
    }
    $originalOrders=[];foreach($map as$id=>$node)if(visual_container($node)){$originalOrders[$id]=[];foreach($node->childNodes as$child)if($child instanceof DOMElement&&$child->hasAttribute('data-wgp-node'))$originalOrders[$id][]=$child->getAttribute('data-wgp-node');}
    foreach($model['order']??[]as$parentId=>$children){
        $parent=$map[$parentId]??null;if(!$parent)continue;$anchor=null;
        // Fixed siblings remain in their own container; movable blocks can sit on either side.
        foreach(array_reverse($children)as$id){$node=$map[$id]??null;if(!$node)continue;
            if($node->getAttribute('data-wgp-movable')==='1'&&visual_compatible($node,$parent)){if($node->parentNode!==$parent)$node->setAttribute('data-wgp-transferred','1');$parent->insertBefore($node,$anchor);$anchor=$node;}
            elseif($node->parentNode===$parent)$anchor=$node;
        }
    }
    foreach($originalOrders as$id=>$original){$parent=$map[$id];$actual=[];foreach($parent->childNodes as$child)if($child instanceof DOMElement&&$child->hasAttribute('data-wgp-node'))$actual[]=$child->getAttribute('data-wgp-node');if($actual!==$original)$parent->setAttribute('data-wgp-arranged','1');else$parent->removeAttribute('data-wgp-arranged');}
    $changes=[];foreach($model['added']??[]as$node)$changes[$node['id']]=$node['content'];
    foreach($model['changes']??[]as$id=>$change)$changes[$id]=array_replace_recursive($changes[$id]??[],$change);
    $css='';$needsFlow=!empty($model['order']);
    foreach($changes as$id=>$change){$node=$map[$id]??null;if(!$node)continue;
        // Text editing never replaces a container's interactive controls or child blocks.
        if(isset($change['text'])&&visual_text($node))visual_set_text($node,$change['text']);
        if(isset($change['image'])&&strtolower($node->tagName)==='img')set_image($node,$change['image']);
        if(isset($change['link'])&&strtolower($node->tagName)==='a'){$node->setAttribute('href',$change['link']);if(str_starts_with($change['link'],'https://'))$node->setAttribute('rel','noopener');}
        if(isset($change['hidden'])&&$change['hidden'])$node->setAttribute('data-wgp-hidden','1');
        $selector='[data-wgp-node="'.$id.'"]';
        if(isset($change['style']['fontSize']))$node->setAttribute('data-wgp-font-custom','1');
        if(isset($change['mobile']['fontSize']))$node->setAttribute('data-wgp-mobile-font-custom','1');
        foreach(['style'=>'desktop','mobile'=>'mobile']as$scope=>$device)if(isset($change[$scope]['gridTemplateColumns'])||isset($change[$scope]['flexDirection'])||in_array($change[$scope]['display']??'',['grid','flex'],true)){$node->setAttribute('data-wgp-layout-'.$device,'1');$needsFlow=true;}
        if(!empty($change['style']))$css.=$selector.'{'.visual_css($change['style']).'}';
        if(!empty($change['mobile']))$css.='@media(max-width:760px){'.$selector.'{'.visual_css($change['mobile']).'}}';
    }
    if($css||$canvas||$changes||!empty($model['order'])){$style=$d->createElement('style');$style->setAttribute('id','wgp-visual-layout');$style->appendChild($d->createTextNode('[data-wgp-hidden="1"]{display:none!important}[data-wgp-arranged="1"]>[data-wgp-node]{min-width:0}[data-wgp-arranged="1"] :is(h1,h2,h3,h4,p){overflow-wrap:anywhere}'.$css));$d->getElementsByTagName('head')->item(0)->appendChild($style);}
    if($canvas){
        foreach(nodes($d,'//script')as$script)$script->parentNode->removeChild($script);
        $body=$d->getElementsByTagName('body')->item(0);$body->setAttribute('data-wgp-canvas',$file);
        $link=$d->createElement('link');$link->setAttribute('rel','stylesheet');$link->setAttribute('href','/panel/canvas.css');$d->getElementsByTagName('head')->item(0)->appendChild($link);
        $flow=$d->createElement('script');$flow->setAttribute('src','/style-a1/ui/visual-layout.js');$flow->setAttribute('defer','');$body->appendChild($flow);
        $script=$d->createElement('script');$script->setAttribute('src','/panel/canvas.js');$script->setAttribute('defer','');$body->appendChild($script);
        // The browser applies the current in-memory model to a pristine baseline.
    }elseif($needsFlow){$flow=$d->createElement('script');$flow->setAttribute('src','style-a1/ui/visual-layout.js?v=1');$flow->setAttribute('defer','');$d->getElementsByTagName('head')->item(0)->appendChild($flow);}
}
