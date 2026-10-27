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
    $enums=['textAlign'=>['left','center','right'],'display'=>['block','flex','grid'],'flexDirection'=>['row','column'],'alignItems'=>['start','center','end','stretch'],'justifyContent'=>['start','center','end','space-between'],'width'=>['auto','25%','33.333%','50%','66.667%','75%','100%'],'objectFit'=>['cover','contain'],'fontWeight'=>['400','500','600','700','800'],'gridTemplateColumns'=>['1fr','repeat(2, minmax(0, 1fr))','repeat(3, minmax(0, 1fr))','repeat(4, minmax(0, 1fr))']];
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
function visual_container(DOMElement $node): bool {return in_array(strtolower($node->tagName),['main','div','section','article','aside','figure','header','footer','nav','ul','ol','li','a'],true);}
function visual_compatible(DOMElement $node,DOMElement $parent): bool {
    if(!visual_container($parent)||$node===$parent)return false;
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
            $node->setAttribute('data-wgp-movable',$node===$root||in_array($tag,['form','table','tbody','tr','td','th'],true)?'0':'1');
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
    foreach($model['order']??[]as$parentId=>$children){$parent=$map[$parentId]??null;if(!$parent)continue;$parent->setAttribute('data-wgp-arranged','1');foreach($children as$id){$node=$map[$id]??null;if($node&&$node->getAttribute('data-wgp-movable')==='1'&&visual_compatible($node,$parent))$parent->appendChild($node);}}
    $changes=[];foreach($model['added']??[]as$node)$changes[$node['id']]=$node['content'];
    foreach($model['changes']??[]as$id=>$change)$changes[$id]=array_replace_recursive($changes[$id]??[],$change);
    $css='';
    foreach($changes as$id=>$change){$node=$map[$id]??null;if(!$node)continue;
        // Text editing never replaces a container's interactive controls or child blocks.
        if(isset($change['text'])&&$node->getElementsByTagName('form')->length===0&&$node->getElementsByTagName('input')->length===0){$tag=strtolower($node->tagName);if(in_array($tag,['h1','h2','h3','h4','p','span','strong','em','small','a','button','summary','label','li'],true)&&!$node->getElementsByTagName('img')->length)set_text($node,$change['text']);}
        if(isset($change['image'])&&strtolower($node->tagName)==='img')set_image($node,$change['image']);
        if(isset($change['link'])&&strtolower($node->tagName)==='a'){$node->setAttribute('href',$change['link']);if(str_starts_with($change['link'],'https://'))$node->setAttribute('rel','noopener');}
        if(isset($change['hidden'])&&$change['hidden'])$node->setAttribute('data-wgp-hidden','1');
        $selector='[data-wgp-node="'.$id.'"]';
        if(!empty($change['style']))$css.=$selector.'{'.visual_css($change['style']).'}';
        if(!empty($change['mobile']))$css.='@media(max-width:760px){'.$selector.'{'.visual_css($change['mobile']).'}}';
    }
    if($css||$canvas||$changes||!empty($model['order'])){$style=$d->createElement('style');$style->setAttribute('id','wgp-visual-layout');$style->appendChild($d->createTextNode('[data-wgp-hidden="1"]{display:none!important}[data-wgp-arranged="1"]>[data-wgp-node]{grid-area:auto!important;order:initial!important}'.$css));$d->getElementsByTagName('head')->item(0)->appendChild($style);}
    if($canvas){
        foreach(nodes($d,'//script')as$script)$script->parentNode->removeChild($script);
        $body=$d->getElementsByTagName('body')->item(0);$body->setAttribute('data-wgp-canvas',$file);
        $link=$d->createElement('link');$link->setAttribute('rel','stylesheet');$link->setAttribute('href','/panel/canvas.css');$d->getElementsByTagName('head')->item(0)->appendChild($link);
        $script=$d->createElement('script');$script->setAttribute('src','/panel/canvas.js');$script->setAttribute('defer','');$body->appendChild($script);
        // The browser applies the current in-memory model to a pristine baseline.
    }
}
