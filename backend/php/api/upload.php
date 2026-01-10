<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/FileValidator.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$user = JWTAuth::requireRole(['student']);

if (!isset($_FILES['receipt']) || $_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server limit',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form limit',
        UPLOAD_ERR_PARTIAL    => 'File partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Server configuration error',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
    ];
    $code = $_FILES['receipt']['error'] ?? UPLOAD_ERR_NO_FILE;
    errorResponse($errorMessages[$code] ?? 'Upload failed', 400);
}

$reservationId = filter_input(INPUT_POST, 'reservation_id', FILTER_VALIDATE_INT);
if (!$reservationId) {
    errorResponse('Invalid reservation ID', 400);
}

$file = $_FILES['receipt'];
$validator = new FileValidator($file);

$validation = $validator->validate();
if (!$validation['valid']) {
    errorResponse($validation['error'], 400);
}

$uploadDir = __DIR__ . '/../../uploads/receipts/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$extension = $validator->getSafeExtension();
$filename = sprintf('%d_%d_%s.%s', $user['id'], $reservationId, bin2hex(random_bytes(8)), $extension);
$filepath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    errorResponse('Failed to save file', 500);
}

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare('
        UPDATE Reservation 
        SET receipt_path = :path, receipt_uploaded_at = NOW(), status = :status
        WHERE id = :id AND student_id = :student_id
    ');
    $stmt->execute([
        ':path'       => 'receipts/' . $filename,
        ':status'     => 'pending_verification',
        ':id'         => $reservationId,
        ':student_id' => $user['id'],
    ]);

    if ($stmt->rowCount() === 0) {
        unlink($filepath);
        errorResponse('Reservation not found or unauthorized', 404);
    }

    successResponse(['filename' => $filename], 'Receipt uploaded successfully');

} catch (PDOException $e) {
    if (file_exists($filepath)) {
        unlink($filepath);
    }
    error_log('Upload DB error: ' . $e->getMessage());
    errorResponse('Database error', 500);
}