<?php
declare(strict_types=1);
// Pure in-memory rendering checks; no CMS database or private configuration is loaded.
require dirname(__DIR__).'/hosting/app/visual.php';
function fixture(): DOMDocument {
    $d=new DOMDocument();$d->loadHTML('<html><head></head><body><main><section id="group"><article id="a">A</article><form id="fixed"><input name="phone" required></form><article id="b">B</article><article id="c">C</article></section><section id="other"></section></main></body></html>',LIBXML_NOERROR|LIBXML_NOWARNING);
    visual_nodes($d);return $d;
}
function key_of(DOMDocument $d,string $id): string {return $d->getElementById($id)->getAttribute('data-wgp-node');}
function order_of(DOMDocument $d,string $id): array {
    $out=[];foreach($d->getElementById($id)->childNodes as $n)if($n instanceof DOMElement)$out[]=$n->getAttribute('id');return $out;
}
function check_order(DOMDocument $d,array $orders): void {
    $order=[];foreach($orders as $parent=>$list)$order[key_of($d,$parent)]=array_map(fn($id)=>key_of($d,$id),$list);
    apply_visual($d,'test.html',['visual'=>['pages'=>['test.html'=>['changes'=>[],'added'=>[],'order'=>$order]]]]);
    foreach($orders as $parent=>$expected)if(order_of($d,$parent)!==$expected)throw new RuntimeException('Order differs in '.$parent);
    if($d->getElementById('fixed')->getAttribute('data-wgp-movable')!=='0'||!$d->getElementsByTagName('input')->item(0)->hasAttribute('required'))throw new RuntimeException('Fixed form was altered');
}
foreach([['c','a','fixed','b'],['fixed','b','c','a'],['b','c','a','fixed']] as $expected){check_order(fixture(),['group'=>$expected]);echo 'PASS fixed-sibling rendering: '.implode(',',$expected).PHP_EOL;}
$d=fixture();check_order($d,['group'=>['fixed','b','c'],'other'=>['a']]);echo 'PASS cross-container rendering preserves the form'.PHP_EOL;
$d=fixture();check_order($d,['group'=>['a','fixed','b','c']]);if($d->getElementById('group')->hasAttribute('data-wgp-arranged'))throw new RuntimeException('No-op order changes responsive layout');echo 'PASS unchanged order retains the original responsive grid'.PHP_EOL;
$d=new DOMDocument();$d->loadHTML('<html><head></head><body><main><h1 id="title">Great games<br><span id="accent">for everyone</span></h1><article id="card"><div class="card-photo" id="photo"><img id="image" src="test.webp"></div><div id="copy"><h2 id="copy-title">A card</h2></div></article><ol><li id="step"><div id="step-copy"><h3>Step title</h3><p>Description</p></div></li></ol></main></body></html>',LIBXML_NOERROR|LIBXML_NOWARNING);visual_nodes($d);
if($d->getElementById('photo')->getAttribute('data-wgp-container')!=='0'||$d->getElementById('image')->getAttribute('data-wgp-movable')!=='0'||$d->getElementById('accent')->getAttribute('data-wgp-movable')!=='0')throw new RuntimeException('Structural media or inline fragments can detach');echo 'PASS media layers and inline text fragments stay with their component'.PHP_EOL;
$accent=key_of($d,'accent');apply_visual($d,'test.html',['visual'=>['pages'=>['test.html'=>['changes'=>[key_of($d,'title')=>['text'=>'Wonderful gamesfor everyone'],key_of($d,'step')=>['text'=>'Must not replace a card']],'added'=>[],'order'=>[key_of($d,'photo')=>[key_of($d,'copy-title')]]]]]]);
if($d->getElementById('title')->textContent!=='Wonderful gamesfor everyone'||$d->getElementById('accent')->getAttribute('data-wgp-node')!==$accent||!$d->getElementById('title')->getElementsByTagName('br')->length)throw new RuntimeException('Rich heading lost text or editable structure');echo 'PASS edited headings retain the accent and line break'.PHP_EOL;
if(!$d->getElementById('step-copy')||$d->getElementById('copy-title')->parentNode!==$d->getElementById('copy'))throw new RuntimeException('Structural card or media drop corrupted text');echo 'PASS complex cards cannot be flattened or receive text inside their photo'.PHP_EOL;
$d=fixture();$group=key_of($d,'group');$model=['changes'=>[],'added'=>[],'order'=>[],'flow'=>[$group]];apply_visual($d,'test.html',['visual'=>['pages'=>['test.html'=>$model]]]);
if($d->getElementById('group')->getAttribute('data-wgp-flow')!=='1'||!str_contains($d->saveHTML(),'visual-layout.js'))throw new RuntimeException('Explicit responsive flow did not render');echo 'PASS an explicit visual order survives even without a DOM-order change'.PHP_EOL;
function fail(string $message): never {throw new InvalidArgumentException($message);}
$checked=validate_visual(['pages'=>['test.html'=>$model]],['test.html']);if($checked['pages']['test.html']['flow']!==[$group])throw new RuntimeException('Flow setting was discarded');echo 'PASS visual flow survives typed model validation'.PHP_EOL;
$bad=$model;$bad['flow']=['not-an-element'];$rejected=false;try{validate_visual(['pages'=>['test.html'=>$bad]],['test.html']);}catch(InvalidArgumentException){$rejected=true;}if(!$rejected)throw new RuntimeException('Invalid flow identity accepted');echo 'PASS invalid flow identities are rejected'.PHP_EOL;
$old=$model;unset($old['flow']);$checked=validate_visual(['pages'=>['test.html'=>$old]],['test.html']);if(array_key_exists('flow',$checked['pages']['test.html']))throw new RuntimeException('Legacy model representation changed');echo 'PASS existing model backups remain compatible'.PHP_EOL;
