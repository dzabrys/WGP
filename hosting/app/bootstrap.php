<?php
declare(strict_types=1);

function config(): array {
    static $c;
    if ($c !== null) return $c;
    $file = getenv('WGP_CONFIG') ?: dirname(__DIR__) . '/private/config.php';
    if (!is_file($file)) throw new RuntimeException('Panel nie jest jeszcze skonfigurowany.');
    $c = require $file;
    if (!is_array($c) || strlen($c['secret'] ?? '') < 48) throw new RuntimeException('Nieprawidłowa konfiguracja serwera.');
    $base = parse_url($c['base_url']);
    if (!isset($base['host']) || !in_array($base['scheme'] ?? '', ['http','https'], true) || !empty($base['path'])) throw new RuntimeException('Nieprawidłowy adres strony.');
    if ($c['environment'] !== 'development' && $base['scheme'] !== 'https') throw new RuntimeException('Wymagany HTTPS.');
    if ($c['environment'] === 'development' && !in_array($base['host'], ['127.0.0.1','localhost'], true)) throw new RuntimeException('Podgląd lokalny wymaga adresu lokalnego.');
    return $c;
}
function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $c = config();
    $pdo = new PDO($c['dsn'], $c['db_user'] ?? '', $c['db_password'] ?? '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') { $pdo->exec('PRAGMA busy_timeout=5000'); $pdo->exec('PRAGMA journal_mode=WAL'); }
    return $pdo;
}
function query(string $sql, array $args=[]): PDOStatement { $s=db()->prepare($sql); $s->execute($args); return $s; }
function json_encode_safe(mixed $v): string { return json_encode($v, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); }
function out(array $data, int $code=200): never { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); echo json_encode_safe($data); exit; }
function fail(string $message, int $code=400): never { out(['ok'=>false,'message'=>$message], $code); }
function body(): array {
    if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) fail('Nieprawidłowy format danych.',415);
    $raw=file_get_contents('php://input',false,null,0,2100000);
    if (strlen($raw)>2000000) fail('Zmiany są zbyt duże.',413);
    try { $d=json_decode($raw,true,64,JSON_THROW_ON_ERROR); } catch (Throwable) { fail('Nie udało się odczytać danych.'); }
    if (!is_array($d)) fail('Nieprawidłowe dane.');
    return $d;
}
function document(string $key): array {
    $row=query('SELECT body, revision FROM wgp_documents WHERE id=?',[$key])->fetch();
    if (!$row) throw new RuntimeException('Uruchom instalację panelu.');
    $state=json_decode($row['body'],true,64,JSON_THROW_ON_ERROR);
    $seed=array_column(json_decode(file_get_contents(__DIR__.'/seed.json'),true)['products'],null,'id');
    foreach($state['products'] as &$p){$p['summary']??=$seed[$p['id']]['summary']??$p['format'];$p['shortDescription']??=$seed[$p['id']]['shortDescription']??mb_substr($p['description'],0,200);}unset($p);
    return ['state'=>$state,'revision'=>(int)$row['revision']];
}
function save_document(string $key, array $state, int $expected): int {
    $s=query('UPDATE wgp_documents SET body=?,revision=revision+1 WHERE id=? AND revision=?',[json_encode_safe($state),$key,$expected]);
    if ($s->rowCount()!==1) fail('Ktoś zapisał zmiany w tym samym czasie. Odśwież panel przed ponowną edycją.',409);
    return $expected+1;
}
function is_local(): bool { return config()['environment']==='development' && in_array($_SERVER['REMOTE_ADDR'] ?? '',['127.0.0.1','::1'],true) && ($_SERVER['HTTP_HOST'] ?? '')===parse_url(config()['base_url'],PHP_URL_HOST).':'.parse_url(config()['base_url'],PHP_URL_PORT); }
function start_session(): void {
    if (session_status()===PHP_SESSION_ACTIVE) return;
    $dir=config()['data_dir'].'/sessions'; if (!is_dir($dir)) mkdir($dir,0700,true);
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1'); ini_set('session.save_path',$dir);
    session_name('wgp_panel');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>config()['environment']!=='development','httponly'=>true,'samesite'=>'Strict']);
    session_start();
    if (isset($_SESSION['last']) && (time()-$_SESSION['last']>3600 || time()-($_SESSION['created']??0)>43200)) { $_SESSION=[]; session_regenerate_id(true); }
    $_SESSION['last']=time(); $_SESSION['created']??=time(); $_SESSION['csrf']??=bin2hex(random_bytes(32));
}
function user(): ?array {
    start_session();
    if (empty($_SESSION['uid'])) return null;
    $u=query('SELECT id,email,name,role,active,password_hash FROM wgp_users WHERE id=?',[$_SESSION['uid']])->fetch();
    if (!$u || (int)$u['active']!==1 || !hash_equals($_SESSION['auth_fingerprint']??'',hash('sha256',$u['password_hash']))) return null;
    unset($u['password_hash']); return $u;
}
function require_user(string $role='viewer'): array {
    $u=user(); if (!$u) fail('Zaloguj się ponownie.',401);
    $r=['viewer'=>0,'editor'=>1,'admin'=>2];
    if (($r[$u['role']]??-1)<$r[$role]) fail('Nie masz uprawnień do tej czynności.',403);
    return $u;
}
function mutation_guard(): void {
    start_session();
    if (($_SERVER['HTTP_ORIGIN']??'')!==config()['base_url'] || !hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) {
        if (config()['environment']==='development') error_log('WGP CSRF diagnostic: origin='.($_SERVER['HTTP_ORIGIN']??'missing').'; cookie='.(isset($_COOKIE['wgp_panel'])?'present':'missing').'; token='.(isset($_SERVER['HTTP_X_CSRF_TOKEN'])?'present':'missing'));
        fail('Odśwież panel i spróbuj ponownie.',403);
    }
}
function login_user(array $u): void { session_regenerate_id(true); $_SESSION['uid']=$u['id']; $_SESSION['auth_fingerprint']=hash('sha256',$u['password_hash']); $_SESSION['created']=time(); $_SESSION['csrf']=bin2hex(random_bytes(32)); }
function audit(string $action, array $u): void { query('INSERT INTO wgp_audit (id,created_at,user_name,action) VALUES (?,?,?,?)',[bin2hex(random_bytes(16)),gmdate('c'),$u['name'],$action]); }
function init_schema(): void {
    $mysql=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'; $text=$mysql?'LONGTEXT':'TEXT';
    db()->exec("CREATE TABLE IF NOT EXISTS wgp_documents (id VARCHAR(64) PRIMARY KEY,body $text NOT NULL,revision INTEGER NOT NULL)");
    db()->exec('CREATE TABLE IF NOT EXISTS wgp_users (id VARCHAR(64) PRIMARY KEY,email VARCHAR(190) NOT NULL UNIQUE,name VARCHAR(100) NOT NULL,password_hash VARCHAR(255) NOT NULL,role VARCHAR(20) NOT NULL,active INTEGER NOT NULL)');
    db()->exec('CREATE TABLE IF NOT EXISTS wgp_attempts (id VARCHAR(64) PRIMARY KEY,started INTEGER NOT NULL,attempts INTEGER NOT NULL)');
    db()->exec("CREATE TABLE IF NOT EXISTS wgp_history (id VARCHAR(64) PRIMARY KEY,created_at VARCHAR(40) NOT NULL,user_name VARCHAR(100) NOT NULL,body $text NOT NULL)");
    db()->exec('CREATE TABLE IF NOT EXISTS wgp_audit (id VARCHAR(64) PRIMARY KEY,created_at VARCHAR(40) NOT NULL,user_name VARCHAR(100) NOT NULL,action VARCHAR(255) NOT NULL)');
    db()->exec('CREATE TABLE IF NOT EXISTS wgp_views (id VARCHAR(64) PRIMARY KEY,day VARCHAR(10) NOT NULL,path VARCHAR(190) NOT NULL,device VARCHAR(20) NOT NULL,referrer VARCHAR(190) NOT NULL,total INTEGER NOT NULL)');
    $seed=json_decode(file_get_contents(__DIR__.'/seed.json'),true,64,JSON_THROW_ON_ERROR);
    foreach (['draft','published'] as $key) if (!query('SELECT id FROM wgp_documents WHERE id=?',[$key])->fetch()) query('INSERT INTO wgp_documents (id,body,revision) VALUES (?,?,1)',[$key,json_encode_safe($seed)]);
}
