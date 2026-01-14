<?php
declare(strict_types=1);

// Enable error reporting for debugging (disable in production)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Set JSON header
header('Content-Type: application/json');

// Load dependencies
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../controllers/UploadController.php';

// Set CORS headers
setCorsHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use POST.'
    ]);
    exit;
}

try {
    // Authenticate and authorize user
    $user = JWTAuth::requireRole(['student']);
    
    if (!isset($user['id']) || empty($user['id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid user credentials'
        ]);
        exit;
    }

    $studentID = $user['id'];

    // Check if file was uploaded
    if (!isset($_FILES['receipt']) || $_FILES['receipt']['error'] === UPLOAD_ERR_NO_FILE) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No file uploaded. Please select a receipt file.'
        ]);
        exit;
    }

    // Get optional referral slip number
    $referralSlipNo = $_POST['referralSlipNo'] ?? null;
    
    if ($referralSlipNo !== null) {
        $referralSlipNo = trim($referralSlipNo);
        if (empty($referralSlipNo)) {
            $referralSlipNo = null;
        }
    }

    // Process upload
    $controller = new UploadController();
    $result = $controller->uploadReceipt($_FILES['receipt'], $studentID, $referralSlipNo);

    if ($result['success']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Receipt uploaded successfully',
            'data' => $result['data']
        ]);
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $result['error']
        ]);
    }

} catch (Exception $e) {
    error_log('Receipt upload API error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An unexpected error occurred. Please try again later.'
    ]);
}