<?php
declare(strict_types=1);

class UploadController
{
    private PDO $db;
    private array $allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    private int $maxFileSize = 5242880; // 5MB in bytes
    private string $uploadBasePath;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->uploadBasePath = __DIR__ . '/../../uploads/receipts/';
        $this->ensureUploadDirectory();
    }

    private function ensureUploadDirectory(): void
    {
        if (!is_dir($this->uploadBasePath)) {
            mkdir($this->uploadBasePath, 0755, true);
        }

        $year = date('Y');
        $month = date('m');
        $yearPath = $this->uploadBasePath . $year . '/';
        $monthPath = $yearPath . $month . '/';

        if (!is_dir($yearPath)) {
            mkdir($yearPath, 0755, true);
        }
        if (!is_dir($monthPath)) {
            mkdir($monthPath, 0755, true);
        }
    }

    public function uploadReceipt(array $file, string $studentID, ?string $referralSlipNo = null): array
    {
        try {
            // Validate file upload
            $validation = $this->validateFile($file);
            if (!$validation['valid']) {
                return [
                    'success' => false,
                    'error' => $validation['error']
                ];
            }

            // Generate secure filename
            $filename = $this->generateSecureFilename($file['name']);
            $filepath = $this->getFilePath($filename);
            $relativePath = $this->getRelativePath($filename);

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                return [
                    'success' => false,
                    'error' => 'Failed to save file'
                ];
            }

            // Set proper permissions
            chmod($filepath, 0644);

            // Update reservation record
            $updated = $this->updateReservationReceipt($studentID, $relativePath, $referralSlipNo);

            if (!$updated) {
                // Rollback - delete uploaded file
                unlink($filepath);
                return [
                    'success' => false,
                    'error' => 'Failed to update reservation record'
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'filename' => $filename,
                    'filepath' => $relativePath,
                    'filesize' => $file['size'],
                    'mimetype' => $file['type'],
                    'uploaded_at' => date('Y-m-d H:i:s')
                ]
            ];

        } catch (Exception $e) {
            error_log('Upload error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'An unexpected error occurred during upload'
            ];
        }
    }

    private function validateFile(array $file): array
    {
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit',
                UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit',
                UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary upload directory',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION  => 'Upload stopped by PHP extension'
            ];
            return [
                'valid' => false,
                'error' => $errorMessages[$file['error']] ?? 'Unknown upload error'
            ];
        }

        // Check file size
        if ($file['size'] > $this->maxFileSize) {
            return [
                'valid' => false,
                'error' => 'File size exceeds 5MB limit'
            ];
        }

        if ($file['size'] === 0) {
            return [
                'valid' => false,
                'error' => 'File is empty'
            ];
        }

        // Validate MIME type from file content
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($file['tmp_name']);

        if (!in_array($detectedMime, $this->allowedTypes, true)) {
            return [
                'valid' => false,
                'error' => 'Invalid file type. Only JPEG, PNG, and PDF files are allowed'
            ];
        }

        // Additional validation for images
        if (strpos($detectedMime, 'image/') === 0) {
            $imageInfo = getimagesize($file['tmp_name']);
            if ($imageInfo === false) {
                return [
                    'valid' => false,
                    'error' => 'File is not a valid image'
                ];
            }
        }

        // Validate file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
        
        if (!in_array($extension, $allowedExtensions, true)) {
            return [
                'valid' => false,
                'error' => 'Invalid file extension'
            ];
        }

        return ['valid' => true];
    }

    private function generateSecureFilename(string $originalName): string
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $timestamp = time();
        $randomString = bin2hex(random_bytes(8));
        return "receipt_{$timestamp}_{$randomString}.{$extension}";
    }

    private function getFilePath(string $filename): string
    {
        $year = date('Y');
        $month = date('m');
        return $this->uploadBasePath . "{$year}/{$month}/{$filename}";
    }

    private function getRelativePath(string $filename): string
    {
        $year = date('Y');
        $month = date('m');
        return "receipts/{$year}/{$month}/{$filename}";
    }

    private function updateReservationReceipt(string $studentID, string $filepath, ?string $referralSlipNo): bool
    {
        try {
            if ($referralSlipNo) {
                // Update specific reservation by referral slip number
                $sql = "UPDATE reservation 
                        SET dropboxReceipt = :filepath,
                            updatedAt = CURRENT_TIMESTAMP
                        WHERE studentID = :studentID 
                        AND referralSlipNo = :referralSlipNo
                        AND dropboxReceipt IS NULL";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':filepath' => $filepath,
                    ':studentID' => $studentID,
                    ':referralSlipNo' => $referralSlipNo
                ]);
            } else {
                // Update most recent reservation without receipt
                $sql = "UPDATE reservation 
                        SET dropboxReceipt = :filepath,
                            updatedAt = CURRENT_TIMESTAMP
                        WHERE studentID = :studentID 
                        AND dropboxReceipt IS NULL
                        AND reservationStatus = 'For Endorsement'
                        ORDER BY createdAt DESC
                        LIMIT 1";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':filepath' => $filepath,
                    ':studentID' => $studentID
                ]);
            }

            return $stmt->rowCount() > 0;

        } catch (PDOException $e) {
            error_log('Database error updating receipt: ' . $e->getMessage());
            return false;
        }
    }

    public function getReceiptInfo(string $studentID, ?string $referralSlipNo = null): ?array
    {
        try {
            if ($referralSlipNo) {
                $sql = "SELECT referralSlipNo, dropboxReceipt, reservationStatus, updatedAt
                        FROM reservation
                        WHERE studentID = :studentID 
                        AND referralSlipNo = :referralSlipNo";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':studentID' => $studentID,
                    ':referralSlipNo' => $referralSlipNo
                ]);
            } else {
                $sql = "SELECT referralSlipNo, dropboxReceipt, reservationStatus, updatedAt
                        FROM reservation
                        WHERE studentID = :studentID 
                        ORDER BY createdAt DESC
                        LIMIT 1";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':studentID' => $studentID]);
            }

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ?: null;

        } catch (PDOException $e) {
            error_log('Database error fetching receipt info: ' . $e->getMessage());
            return null;
        }
    }
}