<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';

setCorsHeaders();

header('Content-Type: application/json');

$tests = [];

// Test 1: Database connection
try {
    $pdo = Database::getInstance();
    $stmt = $pdo->query('SELECT 1 as connected');
    $tests['database'] = [
        'status' => 'pass',
        'message' => 'Database connected successfully'
    ];
} catch (Exception $e) {
    $tests['database'] = [
        'status' => 'fail',
        'message' => $e->getMessage()
    ];
}

// Test 2: Environment variables
try {
    $jwtSecret = Database::getConfig('JWT_SECRET');
    $dbName = Database::getConfig('DB_NAME');
    
    $tests['environment'] = [
        'status' => ($jwtSecret && $dbName) ? 'pass' : 'fail',
        'JWT_SECRET' => $jwtSecret ? 'configured' : 'missing',
        'DB_NAME' => $dbName ?? 'missing'
    ];
} catch (Exception $e) {
    $tests['environment'] = [
        'status' => 'fail',
        'message' => $e->getMessage()
    ];
}

// Test 3: Upload directory
$uploadDir = __DIR__ . '/../../uploads/receipts/';
$year = date('Y');
$month = date('m');
$fullPath = $uploadDir . "{$year}/{$month}/";

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
if (!is_dir($fullPath)) {
    mkdir($fullPath, 0755, true);
}

$tests['upload_directory'] = [
    'status' => (is_dir($fullPath) && is_writable($fullPath)) ? 'pass' : 'fail',
    'path' => $fullPath,
    'exists' => is_dir($fullPath),
    'writable' => is_writable($fullPath)
];

// Test 4: PHP configuration
$tests['php_config'] = [
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'max_execution_time' => ini_get('max_execution_time'),
    'memory_limit' => ini_get('memory_limit')
];

// Test 5: Required extensions
$tests['php_extensions'] = [
    'pdo_mysql' => extension_loaded('pdo_mysql') ? 'enabled' : 'missing',
    'fileinfo' => extension_loaded('fileinfo') ? 'enabled' : 'missing',
    'gd' => extension_loaded('gd') ? 'enabled' : 'missing'
];

echo json_encode([
    'success' => true,
    'tests' => $tests,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);