<?php
declare(strict_types=1);
function captcha(string $action): never {
    header('Cache-Control: no-store'); $c=config();
    $test=is_local(); $key=$test?'1x00000000000000000000AA':($c['turnstile_sitekey']??''); $secret=$test?'1x0000000000000000000000000000000AA':($c['turnstile_secret']??'');
    if (!$key||!$secret||(!$test&&(preg_match('/^[123]x0{10}/',$key)||preg_match('/^[123]x0{10}/',$secret)))) out(['ok'=>false],503);
    if ($action==='config' && $_SERVER['REQUEST_METHOD']==='GET') out(['sitekey'=>$key,'testMode'=>$test]);
    if ($action!=='verify' || $_SERVER['REQUEST_METHOD']!=='POST') out(['ok'=>false],405);
    if (($_SERVER['HTTP_ORIGIN']??'')!==$c['base_url']) out(['ok'=>false],403);
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>4096) out(['ok'=>false],413);
    $d=body(); if (!is_string($d['token']??null)||trim($d['token'])===''||strlen($d['token'])>2048||($d['trap']??'')!=='') out(['ok'=>false],400);
    $id=hash_hmac('sha256','captcha:'.($_SERVER['REMOTE_ADDR']??''),$c['secret']);$a=query('SELECT * FROM wgp_attempts WHERE id=?',[$id])->fetch();
    if ($a && time()-(int)$a['started']<60 && (int)$a['attempts']>=10) out(['ok'=>false],429);
    if (!$a||time()-(int)$a['started']>=60){query('DELETE FROM wgp_attempts WHERE id=?',[$id]);query('INSERT INTO wgp_attempts (id,started,attempts) VALUES (?,?,0)',[$id,time()]);}
    query('UPDATE wgp_attempts SET attempts=attempts+1 WHERE id=?',[$id]);
    $ch=curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode_safe(['secret'=>$secret,'response'=>$d['token'],'remoteip'=>$_SERVER['REMOTE_ADDR']??'']),CURLOPT_TIMEOUT=>10]);
    if (PHP_OS_FAMILY==='Windows' && defined('CURLSSLOPT_NATIVE_CA'))curl_setopt($ch,CURLOPT_SSL_OPTIONS,CURLSSLOPT_NATIVE_CA);
    $raw=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
    if ($raw===false||$status!==200) out(['ok'=>false],502);
    $result=json_decode($raw,true);$valid=($result['success']??false)===true && ($test||(($result['hostname']??'')===parse_url($c['base_url'],PHP_URL_HOST)&&($result['action']??'')==='contact'));
    out(['ok'=>$valid],$valid?200:403);
}
