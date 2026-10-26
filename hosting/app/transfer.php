<?php
declare(strict_types=1);
const TRANSFER_TABLES=[
 'wgp_documents'=>['id','body','revision'],
 'wgp_users'=>['id','email','name','password_hash','role','active'],
 'wgp_history'=>['id','created_at','user_name','body'],
 'wgp_audit'=>['id','created_at','user_name','action'],
 'wgp_views'=>['id','day','path','device','referrer','total'],
];
function transfer_export(string $file): void {
    $tables=[];db()->beginTransaction();
    try{foreach(TRANSFER_TABLES as$table=>$cols)$tables[$table]=query('SELECT '.implode(',',$cols).' FROM '.$table.($table==='wgp_documents'?" WHERE id IN ('draft','published')":''))->fetchAll();db()->commit();}
    catch(Throwable $e){db()->rollBack();throw $e;}
    $zip=new ZipArchive();if($zip->open($file,ZipArchive::CREATE|ZipArchive::EXCL)!==true)throw new RuntimeException('Nie udało się przygotować paczki.');
    try{
        $zip->addFromString('wgp-data.json',json_encode_safe(['format'=>'wgp-transfer','schema'=>1,'created'=>gmdate('c'),'tables'=>$tables]));
        foreach(glob(config()['data_dir'].'/media/*.webp')?:[]as$f)$zip->addFile($f,'media/'.basename($f));
        $zip->addFromString('CZYTAJ.txt',"Prywatna kopia WGP. Zawiera konta i chronione skróty haseł. Nie wgrywać do GitHub ani publicznego katalogu WWW.\nImport: php bin/console.php transfer-import /prywatna/sciezka/dane.zip\nKonfigurację nowego serwera i połączenie MariaDB tworzy się osobno. Tokenów GitHub, kluczy CAPTCHA ani sesji nie przenosimy.\n");
    }finally{$zip->close();}
    chmod($file,0600);
}
function transfer_import(string $file): void {
    init_schema();if((int)query('SELECT COUNT(*) FROM wgp_users')->fetchColumn()>0)throw new RuntimeException('Import jest możliwy tylko do nowej instalacji bez kont. Istniejące dane nie zostały nadpisane.');
    $zip=new ZipArchive();if($zip->open($file)!==true)throw new RuntimeException('Nie można otworzyć paczki ZIP.');
    $total=0;$data=null;$media=[];
    try{
        for($i=0;$i<$zip->numFiles;$i++){
            $s=$zip->statIndex($i);$total+=$s['size'];if($total>300*1024*1024||$zip->numFiles>2002)throw new RuntimeException('Paczka przekracza limit 300 MB.');
            if($s['name']==='CZYTAJ.txt')continue;
            if($s['name']==='wgp-data.json'){
                if($s['size']>50*1024*1024)throw new RuntimeException('Zbyt duży plik danych.');
                $data=json_decode($zip->getFromIndex($i),true,64,JSON_THROW_ON_ERROR);continue;
            }
            if(!preg_match('~^media/[a-f0-9]{32}\.webp$~D',$s['name'])||$s['size']>5*1024*1024)throw new RuntimeException('Nieprawidłowy plik w paczce.');
            $bytes=$zip->getFromIndex($i);$info=@getimagesizefromstring($bytes);
            if(!$info||$info['mime']!=='image/webp'||$info[0]*$info[1]>24000000)throw new RuntimeException('Nieprawidłowe zdjęcie.');
            $media[$s['name']]=$bytes;
        }
    }finally{$zip->close();}
    if(($data['format']??'')!=='wgp-transfer'||($data['schema']??0)!==1)throw new RuntimeException('To nie jest paczka danych WGP.');
    foreach(TRANSFER_TABLES as$table=>$cols){
        if(!is_array($data['tables'][$table]??null))throw new RuntimeException('Niekompletna kopia.');
        foreach($data['tables'][$table]as$row)if(array_diff($cols,array_keys($row)))throw new RuntimeException('Niekompletny rekord.');
    }
    $admin=false;
    foreach($data['tables']['wgp_users']as$u){
        if(!filter_var($u['email'],FILTER_VALIDATE_EMAIL)||!in_array($u['role'],['admin','editor','viewer'],true)||!password_get_info($u['password_hash'])['algo'])throw new RuntimeException('Nieprawidłowe konto w kopii.');
        if($u['role']==='admin'&&(int)$u['active']===1)$admin=true;
    }
    if(!$admin)throw new RuntimeException('Brak aktywnego administratora w kopii.');
    $documents=array_column($data['tables']['wgp_documents'],null,'id');
    if(count($documents)!==2||!isset($documents['draft'],$documents['published']))throw new RuntimeException('Brak treści strony.');
    foreach($media as$name=>$bytes){$f=config()['data_dir'].'/'.$name;if(!is_dir(dirname($f)))mkdir(dirname($f),0700,true);file_put_contents($f,$bytes);}
    foreach(['draft','published']as$key)validate_state(json_decode($documents[$key]['body'],true,64,JSON_THROW_ON_ERROR));
    db()->beginTransaction();
    try{
        foreach(TRANSFER_TABLES as$table=>$cols){
            query('DELETE FROM '.$table);
            $sql='INSERT INTO '.$table.' ('.implode(',',$cols).') VALUES ('.implode(',',array_fill(0,count($cols),'?')).')';
            foreach($data['tables'][$table]as$row)query($sql,array_map(fn($c)=>$row[$c],$cols));
        }
        db()->commit();
    }catch(Throwable $e){db()->rollBack();throw$e;}
}
