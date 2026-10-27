<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit;
$root=dirname(__DIR__,2);chdir($root);$private=$root.'/hosting/private';$command=$argv[1]??'help';
if(!getenv('CODESPACE_NAME')||!preg_match('/^[a-z0-9-]+$/D',getenv('CODESPACE_NAME')))throw new RuntimeException('Uruchom to polecenie w GitHub Codespaces.');
$domain=getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')?:'app.github.dev';
if(!preg_match('/^[a-z0-9.-]+$/D',$domain))throw new RuntimeException('Nieprawidłowa domena chmury.');
if(!is_dir($private.'/data'))mkdir($private.'/data',0700,true);
$url='https://'.getenv('CODESPACE_NAME').'-4180.'.$domain;
if(!is_file($private.'/config.php')){
 $c=['environment'=>'production','base_url'=>$url,'dsn'=>'sqlite:'.$private.'/data/wgp.sqlite','secret'=>bin2hex(random_bytes(32)),'data_dir'=>$private.'/data','templates_dir'=>$root.'/hosting/templates','assets_dir'=>$root.'/docs','publication_target'=>'github','public_url'=>'https://dzabrys.github.io/WGP','github_repository'=>'dzabrys/WGP','github_branch'=>'main','codespaces_proxy'=>true,'turnstile_sitekey'=>'','turnstile_secret'=>''];
 file_put_contents($private.'/config.php',"<?php\nreturn ".var_export($c,true).";\n");chmod($private.'/config.php',0600);
}
if($command==='setup'){
 require $root.'/hosting/app/bootstrap.php';init_schema();
 echo "Przygotowano prywatną bazę. Zaimportuj paczkę danych poleceniem: php hosting/bin/console.php transfer-import /sciezka/do/prywatnej-paczki.zip\n";
}elseif($command==='start'){
 $pidFile=$private.'/server.pid';$pid=is_file($pidFile)?(int)file_get_contents($pidFile):0;
 if($pid&&is_dir('/proc/'.$pid)&&str_contains(file_get_contents('/proc/'.$pid.'/cmdline'),'hosting/router.php')){echo "Panel już działa: $url/panel/\n";exit;}
 $script='cd '.escapeshellarg($root).' && PHP_CLI_SERVER_WORKERS=4 XDEBUG_MODE=off nohup php -d display_errors=0 -d log_errors=1 -d upload_max_filesize=5M -d post_max_size=6M -d memory_limit=256M -S 0.0.0.0:4180 -t hosting/public hosting/router.php >'.escapeshellarg($private.'/server.log').' 2>&1 & echo $!';
 $pid=(int)shell_exec($script);file_put_contents($pidFile,(string)$pid);echo "Panel WGP: $url/panel/\nPort pozostaw jako Private. Publiczną stronę otworzysz na https://dzabrys.github.io/WGP/\n";
}else echo "Polecenia: setup, start. Dane do konta przenieś prywatną paczką lub użyj instalatora console.php init.\n";
