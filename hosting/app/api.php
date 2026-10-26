<?php
declare(strict_types=1);
function api(string $action): never {
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') mutation_guard();
    elseif ($_SERVER['REQUEST_METHOD']!=='GET') fail('Niedozwolona metoda.',405);
    $post=$_SERVER['REQUEST_METHOD']==='POST';
    if ($action==='boot' && !$post) out(['ok'=>true,'user'=>user(),'csrf'=>$_SESSION['csrf'],'localLogin'=>is_local() && config()['local_login']===true]);
    if ($action==='login' && $post) {
        $in=body(); $email=strtolower(trim((string)($in['email']??''))); $password=(string)($in['password']??'');
        if (strlen($email)>190 || strlen($password)>1024) fail('Sprawdź e-mail i hasło.',401);
        $key=hash_hmac('sha256',($_SERVER['REMOTE_ADDR']??'').':'.$email,config()['secret']);
        $a=query('SELECT * FROM wgp_attempts WHERE id=?',[$key])->fetch();
        if ($a && time()-(int)$a['started']<900 && (int)$a['attempts']>=8) fail('Zbyt wiele prób. Spróbuj ponownie za 15 minut.',429);
        if (!$a || time()-(int)$a['started']>=900) { query('DELETE FROM wgp_attempts WHERE id=?',[$key]); query('INSERT INTO wgp_attempts (id,started,attempts) VALUES (?,?,0)',[$key,time()]); }
        query('UPDATE wgp_attempts SET attempts=attempts+1 WHERE id=?',[$key]);
        $u=query('SELECT * FROM wgp_users WHERE email=?',[$email])->fetch();
        $valid=password_verify($password,$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (!$u || !$valid || (int)$u['active']!==1) fail('Nieprawidłowy e-mail lub hasło.',401);
        query('DELETE FROM wgp_attempts WHERE id=?',[$key]); login_user($u); audit('Logowanie do panelu',$u); out(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    if ($action==='local-login' && $post) {
        if (!is_local() || config()['local_login']!==true) fail('Niedostępne.',404);
        $u=query("SELECT * FROM wgp_users WHERE role='admin' AND active=1 ORDER BY email LIMIT 1")->fetch();
        if (!$u) fail('Nie znaleziono konta administratora.',503);
        login_user($u); out(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    if ($action==='logout' && $post) { start_session(); $_SESSION=[]; session_destroy(); out(['ok'=>true]); }
    $u=require_user();
    if ($action==='state' && !$post) {
        $d=document('draft'); $p=document('published'); out(['ok'=>true]+$d+['hasChanges'=>json_encode_safe($d['state'])!==json_encode_safe($p['state']),'publishedRevision'=>$p['revision']]);
    }
    if ($action==='save' && $post) {
        require_user('editor'); $in=body(); $state=validate_state($in['state']??[]); $rev=save_document('draft',$state,(int)($in['revision']??-1)); audit('Zapisanie szkicu',$u); out(['ok'=>true,'revision'=>$rev]);
    }
    if ($action==='publish' && $post) {
        require_user('admin'); $in=body(); db()->beginTransaction();
        $d=document('draft'); $p=document('published'); if ($d['revision']!==(int)($in['revision']??-1)) { db()->rollBack(); fail('Szkic się zmienił. Odśwież panel.',409); }
        $rev=save_document('draft',$d['state'],$d['revision']);
        query('INSERT INTO wgp_history (id,created_at,user_name,body) VALUES (?,?,?,?)',[bin2hex(random_bytes(16)),gmdate('c'),$u['name'],json_encode_safe($p['state'])]);
        save_document('published',$d['state'],$p['revision']); audit('Opublikowanie zmian',$u); db()->commit(); out(['ok'=>true,'revision'=>$rev]);
    }
    if ($action==='history' && !$post) out(['ok'=>true,'items'=>query('SELECT id,created_at,user_name FROM wgp_history ORDER BY created_at DESC LIMIT 30')->fetchAll()]);
    if ($action==='restore' && $post) {
        require_user('admin'); $in=body(); $row=query('SELECT body FROM wgp_history WHERE id=?',[(string)($in['id']??'')])->fetch(); if (!$row) fail('Nie znaleziono tej wersji.',404);
        $rev=save_document('draft',validate_state(json_decode($row['body'],true)),(int)($in['revision']??-1)); audit('Przywrócenie wersji do szkicu',$u); out(['ok'=>true,'revision'=>$rev]);
    }
    if ($action==='export' && !$post) {
        require_user('admin'); header('Content-Type: application/json; charset=utf-8'); header('Content-Disposition: attachment; filename="wgp-tresci-'.gmdate('Y-m-d').'.json"'); header('Cache-Control: no-store'); echo json_encode_safe(['format'=>'wgp-content-backup','schema'=>1,'created'=>gmdate('c'),'draft'=>document('draft')['state'],'published'=>document('published')['state']]); exit;
    }
    if ($action==='import' && $post) {
        require_user('admin'); $in=body(); $b=$in['backup']??[]; if (($b['format']??'')!=='wgp-content-backup') fail('Wybierz kopię treści WGP.');
        $state=validate_state($b['draft']??[]); $rev=save_document('draft',$state,(int)($in['revision']??-1)); audit('Wczytanie kopii do szkicu',$u); out(['ok'=>true,'revision'=>$rev]);
    }
    if ($action==='media' && !$post) {
        $items=[];
        $labels=[];foreach(document('draft')['state']['products']as$p)$labels[explode('?',$p['image'])[0]]=$p['name'];
        foreach (glob(config()['assets_dir'].'/assets/*')?:[] as $f) if (preg_match('/\.(?:webp|avif|png|jpg|jpeg|svg)$/i',$f)) {
            $url='assets/'.basename($f);$size=@getimagesize($f);
            if (!isset($labels[$url]) && (!$size || max($size[0],$size[1])<300))continue;
            $items[]=['url'=>$url,'name'=>$labels[$url]??str_replace(['-','_'], ' ',pathinfo($f,PATHINFO_FILENAME))];
        }
        foreach (glob(config()['data_dir'].'/media/*.webp')?:[] as $f) $items[]=['url'=>'media/'.basename($f),'name'=>'Przesłane zdjęcie '.substr(basename($f),0,6)];
        out(['ok'=>true,'items'=>$items]);
    }
    if ($action==='upload' && $post) {
        require_user('editor'); $f=$_FILES['image']??null;
        if (!$f || $f['error']!==UPLOAD_ERR_OK || $f['size']>5*1024*1024 || !is_uploaded_file($f['tmp_name'])) fail('Wybierz zdjęcie JPG, PNG lub WebP do 5 MB.');
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        $info=@getimagesize($f['tmp_name']);
        if (!$info || !in_array($mime,['image/jpeg','image/png','image/webp'],true) || $info[0]*$info[1]>24000000) fail('Nieprawidłowe zdjęcie. Maksymalny rozmiar to 24 mln pikseli.');
        $image=@imagecreatefromstring(file_get_contents($f['tmp_name'])); if (!$image) fail('Nie udało się odczytać zdjęcia.');
        $max=2000; if (imagesx($image)>$max || imagesy($image)>$max) { $scale=min($max/imagesx($image),$max/imagesy($image)); $small=imagescale($image,max(1,(int)round(imagesx($image)*$scale)),max(1,(int)round(imagesy($image)*$scale))); imagedestroy($image); $image=$small; }
        $dir=config()['data_dir'].'/media'; if (!is_dir($dir)) mkdir($dir,0700,true); $name=bin2hex(random_bytes(16)).'.webp';
        if (!imagewebp($image,$dir.'/'.$name,85)) fail('Nie udało się zapisać zdjęcia.',500); imagedestroy($image); audit('Dodanie zdjęcia',$u); out(['ok'=>true,'url'=>'media/'.$name]);
    }
    if ($action==='stats' && !$post) {
        $days=(int)($_GET['days']??7); if (!in_array($days,[7,30,90],true)) $days=7; $from=(new DateTimeImmutable('now',new DateTimeZone('Europe/Warsaw')))->modify('-'.($days-1).' days')->format('Y-m-d');
        out(['ok'=>true,'days'=>$days,'daily'=>query('SELECT day,SUM(total) AS total FROM wgp_views WHERE day>=? GROUP BY day ORDER BY day',[$from])->fetchAll(),'pages'=>query('SELECT path,SUM(total) AS total FROM wgp_views WHERE day>=? GROUP BY path ORDER BY total DESC LIMIT 15',[$from])->fetchAll(),'devices'=>query('SELECT device,SUM(total) AS total FROM wgp_views WHERE day>=? GROUP BY device',[$from])->fetchAll(),'sources'=>query('SELECT referrer,SUM(total) AS total FROM wgp_views WHERE day>=? GROUP BY referrer ORDER BY total DESC LIMIT 10',[$from])->fetchAll(),'activity'=>query('SELECT created_at,user_name,action FROM wgp_audit ORDER BY created_at DESC LIMIT 8')->fetchAll()]);
    }
    if ($action==='users' && !$post) { require_user('admin'); out(['ok'=>true,'items'=>query('SELECT id,email,name,role,active FROM wgp_users ORDER BY name')->fetchAll()]); }
    if ($action==='user-save' && $post) {
        require_user('admin'); $in=body(); $id=$in['id']??bin2hex(random_bytes(16)); $name=text_value($in['name']??'',100,'imię',true); $email=strtolower(text_value($in['email']??'',190,'e-mail',true));
        if (!filter_var($email,FILTER_VALIDATE_EMAIL)||!in_array($in['role']??'',['admin','editor','viewer'],true)) fail('Sprawdź e-mail i uprawnienia.');
        db()->beginTransaction();
        if (db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql') query("SELECT id FROM wgp_users WHERE role='admin' AND active=1 ORDER BY id FOR UPDATE")->fetchAll();
        if(query('SELECT id FROM wgp_users WHERE email=? AND id<>?',[$email,$id])->fetch())fail('Ten adres e-mail ma już konto.',409);
        $old=query('SELECT * FROM wgp_users WHERE id=?',[$id])->fetch(); $active=($in['active']??true)?1:0;
        if ($old && $old['role']==='admin' && ($in['role']!=='admin'||!$active) && (int)query("SELECT COUNT(*) FROM wgp_users WHERE role='admin' AND active=1")->fetchColumn()<=1) fail('Musi pozostać przynajmniej jeden aktywny administrator.');
        $pw=(string)($in['password']??''); if ((!$old||$pw!=='') && (strlen($pw)<12||strlen($pw)>200)) fail('Hasło powinno mieć od 12 do 200 znaków.');
        $hash=$pw===''?$old['password_hash']:password_hash($pw,PASSWORD_DEFAULT);
        if ($old) query('UPDATE wgp_users SET email=?,name=?,password_hash=?,role=?,active=? WHERE id=?',[$email,$name,$hash,$in['role'],$active,$id]);
        else query('INSERT INTO wgp_users (id,email,name,password_hash,role,active) VALUES (?,?,?,?,?,?)',[$id,$email,$name,$hash,$in['role'],$active]);
        audit('Zmiana konta pracownika',$u); db()->commit(); out(['ok'=>true]);
    }
    fail('Nie znaleziono tej czynności.',404);
}
function record_view(string $path): void {
    if ($_SERVER['REQUEST_METHOD']!=='GET' || isset($_GET['preview']) || isset($_COOKIE['wgp_panel']) || preg_match('/bot|crawler|spider|preview|headless/i',$_SERVER['HTTP_USER_AGENT']??'')) return;
    $day=(new DateTimeImmutable('now',new DateTimeZone('Europe/Warsaw')))->format('Y-m-d'); $device=preg_match('/mobile|android|iphone|ipad/i',$_SERVER['HTTP_USER_AGENT']??'')?'Telefon lub tablet':'Komputer';
    $host=parse_url($_SERVER['HTTP_REFERER']??'',PHP_URL_HOST); $ref=$host && $host!==parse_url(config()['base_url'],PHP_URL_HOST)?substr($host,0,190):'Bezpośrednio lub wewnątrz strony';
    $id=hash('sha256',$day.'|'.$path.'|'.$device.'|'.$ref); $mysql=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';
    $sql='INSERT INTO wgp_views (id,day,path,device,referrer,total) VALUES (?,?,?,?,?,1) '.($mysql?'ON DUPLICATE KEY UPDATE total=total+1':'ON CONFLICT(id) DO UPDATE SET total=total+1');
    query($sql,[$id,$day,$path,$device,$ref]);
}
