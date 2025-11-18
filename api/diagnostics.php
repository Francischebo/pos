<?php
// diagnostics.php
// Lightweight diagnostics endpoint for QA. REMOVE or protect in production.

// Allow CLI execution for quick checks
$isCli = (php_sapi_name() === 'cli');

if (!$isCli) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
}

$result = [
    'ok' => true,
    'ts' => date('c'),
    'php_version' => PHP_VERSION,
    'php_sapi' => php_sapi_name(),
    'php_ini' => php_ini_loaded_file() ?: null,
    'extensions' => get_loaded_extensions(),
];

// MOBET_DATA_DIR from env
$result['mobet_data_dir_env'] = getenv('MOBET_DATA_DIR') ?: null;

// Attempt to include sqlite_helper to use get_app_data_dir if available
$defaultDbPath = null;
if (file_exists(__DIR__ . '/../sqlite_helper.php')) {
    try {
        require_once __DIR__ . '/../sqlite_helper.php';
        if (function_exists('get_app_data_dir')) {
            $appDir = get_app_data_dir();
            $defaultDbPath = $appDir . DIRECTORY_SEPARATOR . 'app.db';
            $result['mobet_data_dir_detected'] = $appDir;
        } else {
            // Fallback: look for common legacy locations
            $legacy = [__DIR__ . '/../offline.db', __DIR__ . '/../database/app.db', __DIR__ . '/../app.db'];
            foreach ($legacy as $p) {
                if (file_exists($p)) { $defaultDbPath = realpath($p); break; }
            }
        }
    } catch (Throwable $e) {
        $result['sqlite_helper_error'] = $e->getMessage();
    }
} else {
    $result['sqlite_helper_present'] = false;
}

if ($defaultDbPath) {
    $result['db_path'] = $defaultDbPath;
    $result['db_exists'] = file_exists($defaultDbPath);
    if (file_exists($defaultDbPath)) {
        $result['db_size_bytes'] = filesize($defaultDbPath);
    }
} else {
    $result['db_path'] = null;
}

// Check SQLite availability
if (extension_loaded('sqlite3')) {
    try {
        $v = SQLite3::version();
        $result['sqlite3'] = ['compiled' => $v['versionString'] ?? null, 'library' => $v['libVersion'] ?? null];
    } catch (Throwable $e) {
        $result['sqlite3_error'] = $e->getMessage();
    }
} else {
    $result['sqlite3'] = null;
}

// Short runtime environment info
$result['cwd'] = getcwd();

$output = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

if ($isCli) {
    echo $output . PHP_EOL;
    exit(0);
}

echo $output;
