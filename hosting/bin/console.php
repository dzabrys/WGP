<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/app/bootstrap.php';
require dirname(__DIR__).'/app/validation.php';
require dirname(__DIR__).'/app/render.php';
require dirname(__DIR__).'/app/github.php';
require dirname(__DIR__).'/app/transfer.php';
$command=$argv[1]??'help';
try {
    if ($command==='init') {
        init_schema(); $in=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);
        if (!filter_var($in['email']??'',FILTER_VALIDATE_EMAIL)||strlen($in['password']??'')<12) throw new RuntimeException('Podaj e-mail i hasło co najmniej 12 znaków przez standardowe wejście JSON.');
        if (query('SELECT id FROM wgp_users WHERE email=?',[strtolower($in['email'])])->fetch()) throw new RuntimeException('Konto już istnieje; instalacja go nie nadpisze.');
        query('INSERT INTO wgp_users (id,email,name,password_hash,role,active) VALUES (?,?,?,?,?,1)',[bin2hex(random_bytes(16)),strtolower($in['email']),$in['name']??'Administrator WGP',password_hash($in['password'],PASSWORD_DEFAULT),'admin']);
        echo "Zainstalowano panel i zaimportowano katalog.\n";
    } elseif ($command==='reset-password') {
        $in=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR); if (strlen($in['password']??'')<12) throw new RuntimeException('Hasło musi mieć co najmniej 12 znaków.');
        $s=query('UPDATE wgp_users SET password_hash=? WHERE email=?',[password_hash($in['password'],PASSWORD_DEFAULT),strtolower($in['email']??'')]); if (!$s->rowCount()) throw new RuntimeException('Nie znaleziono konta.'); echo "Zmieniono hasło.\n";
    } elseif ($command==='transfer-export') { transfer_export($argv[2]??throw new RuntimeException('Podaj ścieżkę prywatnego pliku ZIP.'));echo "Zapisano prywatną paczkę danych.\n";
    } elseif ($command==='transfer-import') { transfer_import($argv[2]??throw new RuntimeException('Podaj ścieżkę prywatnego pliku ZIP.'));echo "Przeniesiono treści, zdjęcia, konta, historię i statystyki.\n";
    } elseif ($command==='github-publish') { $d=document('published');$r=publish_github($d['state'],$d['revision']);echo json_encode_safe($r)."\n";
    } elseif ($command==='cleanup') { query('DELETE FROM wgp_views WHERE day<?',[gmdate('Y-m-d',time()-90*86400)]); query('DELETE FROM wgp_attempts WHERE started<?',[time()-86400]); echo "Usunięto stare statystyki i próby logowania.\n";
    } elseif ($command==='check') { echo json_encode_safe(['php'=>PHP_VERSION,'driver'=>db()->getAttribute(PDO::ATTR_DRIVER_NAME),'products'=>count(document('published')['state']['products']),'pages'=>count(document('published')['state']['pages']),'environment'=>config()['environment']])."\n";
    } else { echo "Polecenia: init, check, reset-password, cleanup. Dane kont podawaj jako JSON przez stdin.\n"; }
} catch (Throwable $e) { fwrite(STDERR,$e->getMessage()."\n"); exit(1); }
