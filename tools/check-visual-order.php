<?php
declare(strict_types=1);
// Pure in-memory rendering checks; no CMS database or private configuration is loaded.
require dirname(__DIR__).'/hosting/app/visual.php';
function fixture(): DOMDocument {
    $d=new DOMDocument();$d->loadHTML('<html><head></head><body><main><section id="group"><article id="a">A</article><form id="fixed"><input name="phone" required></form><article id="b">B</article><article id="c">C</article></section><section id="other"></section></main></body></html>');
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
