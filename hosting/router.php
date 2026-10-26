<?php
// Router for PHP's local development server only. Production uses public/.htaccess.
declare(strict_types=1);
require __DIR__.'/app/bootstrap.php';
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(is_string($path) && !str_contains($path,'..') && !str_contains($path,'\\') && !str_contains($path,'%') && !preg_match('~\.(?:php|html)$~i',$path) && !in_array($path,['/cms-catalog.js','/style-a1/ui/contact.js','/style-a1/ui/contact-designs.js'],true)) {
    $root=str_starts_with($path,'/panel/')?__DIR__.'/public':config()['assets_dir'];$f=realpath($root.$path);
    if($f && is_file($f) && str_starts_with($f,realpath($root).DIRECTORY_SEPARATOR)){
        $types=['css'=>'text/css','js'=>'application/javascript','svg'=>'image/svg+xml','webp'=>'image/webp','avif'=>'image/avif','jpg'=>'image/jpeg','png'=>'image/png','woff2'=>'font/woff2'];$ext=strtolower(pathinfo($f,PATHINFO_EXTENSION));
        if(isset($types[$ext])){header('X-Content-Type-Options: nosniff');header('Content-Type: '.$types[$ext]);header('Cache-Control: no-store');readfile($f);return;}
    }
}
require __DIR__.'/public/index.php';
