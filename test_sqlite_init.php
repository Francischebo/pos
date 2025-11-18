<?php
require __DIR__ . '/sqlite_helper.php';
$dir = get_app_data_dir();
$db = sqlite_init();
echo "data dir: " . $dir . PHP_EOL;
echo "db path: " . realpath($dir . DIRECTORY_SEPARATOR . 'app.db') . PHP_EOL;
echo "db exists: " . (file_exists($dir . DIRECTORY_SEPARATOR . 'app.db') ? 'yes' : 'no') . PHP_EOL;
