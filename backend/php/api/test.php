<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$test = $_GET['test'] ?? 'all';

$results = [];

// Test 1: Database Connection
if ($test === 'all' || $test === 'db') {
    try {
        $pdo = Database::getInstance();
        $stmt = $pdo->query('SELECT 1 as connected');
        $row = $stmt->fetch();
        $results['database'] = [
            'status' => 'ok',
            'message' => 'Database connected successfully'
        ];
    } catch (Exception $e) {
        $results['database'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
}

// Test 2: Environment Variables
if ($test === 'all' || $test === 'env') {
    $dbHost = Database::getConfig('DB_HOST');
    $jwtSecret = Database::getConfig('JWT_SECRET');
    $results['environment'] = [
        'status' => ($dbHost && $jwtSecret) ? 'ok' : 'error',
        'DB_HOST' => $dbHost ? 'set' : 'missing',
        'JWT_SECRET' => $jwtSecret ? 'set' : 'missing'
    ];
}

// Test 3: Upload Directory
if ($test === 'all' || $test === 'upload') {
    $uploadDir = __DIR__ . '/../../uploads/receipts/';
    $exists = is_dir($uploadDir);
    $writable = $exists && is_writable($uploadDir);
    
    if (!$exists) {
        mkdir($uploadDir, 0755, true);
        $exists = is_dir($uploadDir);
        $writable = is_writable($uploadDir);
    }
    
    $results['upload_directory'] = [
        'status' => $writable ? 'ok' : 'error',
        'path' => $uploadDir,
        'exists' => $exists,
        'writable' => $writable
    ];
}

// Test 4: JWT Auth (optional - only if Authorization header present)
if ($test === 'all' || $test === 'auth') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!empty($authHeader)) {
        $payload = JWTAuth::validateToken();
        $results['jwt_auth'] = [
            'status' => $payload ? 'ok' : 'error',
            'message' => $payload ? 'Token valid' : 'Token invalid or expired',
            'payload' => $payload ? ['id' => $payload['id'] ?? null, 'role' => $payload['role'] ?? null] : null
        ];
    } else {
        $results['jwt_auth'] = [
            'status' => 'skipped',
            'message' => 'No Authorization header provided'
        ];
    }
}

// Test 5: PHP Extensions
if ($test === 'all' || $test === 'extensions') {
    $required = ['pdo', 'pdo_mysql', 'fileinfo', 'json'];
    $loaded = [];
    foreach ($required as $ext) {
        $loaded[$ext] = extension_loaded($ext);
    }
    $results['php_extensions'] = [
        'status' => !in_array(false, $loaded, true) ? 'ok' : 'error',
        'extensions' => $loaded
    ];
}

successResponse($results, 'PHP Backend Test Results');
