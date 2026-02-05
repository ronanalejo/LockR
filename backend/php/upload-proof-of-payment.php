<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Database connection
$host = 'localhost';
$dbname = 'lockr';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

// Validate required fields
if (!isset($_FILES['proofOfPayment']) || !isset($_POST['referralSlipNo'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$referralSlipNo = $_POST['referralSlipNo'];
$file = $_FILES['proofOfPayment'];

// Validate file
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
$maxSize = 5 * 1024 * 1024; // 5MB

if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.']);
    exit();
}

if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File too large. Maximum size is 5MB.']);
    exit();
}

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File upload error']);
    exit();
}

// Create upload directory if it doesn't exist
$uploadDir = __DIR__ . '/../nodejs/uploads/proof-of-payment/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'proof-' . $referralSlipNo . '-' . time() . '-' . uniqid() . '.' . $extension;
$uploadPath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save file']);
    exit();
}

// Update database
$relativePath = 'proof-of-payment/' . $filename;

try {
    $stmt = $pdo->prepare("UPDATE reservation SET proofOfPayment = ? WHERE referralSlipNo = ?");
    $stmt->execute([$relativePath, $referralSlipNo]);

    if ($stmt->rowCount() === 0) {
        // Delete uploaded file if reservation not found
        unlink($uploadPath);
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Reservation not found']);
        exit();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Proof of payment uploaded successfully',
        'data' => [
            'proofOfPayment' => $relativePath
        ]
    ]);

} catch (PDOException $e) {
    // Delete uploaded file on database error
    unlink($uploadPath);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database update failed']);
}
?>