<?php
// Copy to private/config.php OUTSIDE the public website. Never commit credentials.
return [
    'environment' => 'production',
    'base_url' => 'https://wielkiegryplanszowe.pl',
    'aliases' => ['www.wielkiegryplanszowe.pl'],
    'dsn' => 'mysql:host=YOUR_DATABASE_HOST;dbname=YOUR_DATABASE_NAME;charset=utf8mb4',
    'db_user' => 'YOUR_DATABASE_USER',
    'db_password' => 'YOUR_DATABASE_PASSWORD',
    'secret' => 'REPLACE_WITH_RANDOM_64_HEX_CHARACTERS',
    'data_dir' => __DIR__ . '/data',
    'templates_dir' => __DIR__ . '/templates',
    'assets_dir' => dirname(__DIR__) . '/public',
    'publication_target' => 'server', // nazwa.pl: publish directly to this database.
    'turnstile_sitekey' => '',
    'turnstile_secret' => '',
];
