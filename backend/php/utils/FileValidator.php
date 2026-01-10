<?php
declare(strict_types=1);

class FileValidator
{
    private array $file;
    private array $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
    ];
    private int $maxSize = 5242880; // 5MB

    public function __construct(array $file)
    {
        $this->file = $file;
    }

    public function validate(): array
    {
        if (!$this->validateSize()) {
            return ['valid' => false, 'error' => 'File exceeds 5MB limit'];
        }

        if (!$this->validateMimeType()) {
            return ['valid' => false, 'error' => 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF'];
        }

        if (!$this->validateExtension()) {
            return ['valid' => false, 'error' => 'File extension mismatch'];
        }

        if (!$this->validateContent()) {
            return ['valid' => false, 'error' => 'File content validation failed'];
        }

        return ['valid' => true, 'error' => null];
    }

    private function validateSize(): bool
    {
        return isset($this->file['size']) && $this->file['size'] <= $this->maxSize;
    }

    private function validateMimeType(): bool
    {
        if (!isset($this->file['tmp_name']) || !is_uploaded_file($this->file['tmp_name'])) {
            return false;
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($this->file['tmp_name']);

        return array_key_exists($detectedMime, $this->allowedMimes);
    }

    private function validateExtension(): bool
    {
        $extension = strtolower(pathinfo($this->file['name'] ?? '', PATHINFO_EXTENSION));
        $allowedExtensions = array_values($this->allowedMimes);

        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        return in_array($extension, $allowedExtensions, true);
    }

    private function validateContent(): bool
    {
        $tmpFile = $this->file['tmp_name'] ?? '';
        
        if (!file_exists($tmpFile)) {
            return false;
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmpFile);

        if (str_starts_with($mime, 'image/')) {
            $imageInfo = @getimagesize($tmpFile);
            return $imageInfo !== false;
        }

        if ($mime === 'application/pdf') {
            $handle = fopen($tmpFile, 'rb');
            $header = fread($handle, 5);
            fclose($handle);
            return $header === '%PDF-';
        }

        return false;
    }

    public function getSafeExtension(): string
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($this->file['tmp_name']);
        return $this->allowedMimes[$mime] ?? 'bin';
    }

    public function getDetectedMime(): string
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        return $finfo->file($this->file['tmp_name']);
    }
}