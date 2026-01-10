<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

class JWTAuth
{
    private static ?string $secretKey = null;

    public static function init(): void
    {
        self::$secretKey = Database::getConfig('JWT_SECRET');
        if (empty(self::$secretKey)) {
            throw new RuntimeException('JWT secret not configured');
        }
    }

    public static function validateToken(): ?array
    {
        if (self::$secretKey === null) {
            self::init();
        }

        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($authHeader) || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $signature = self::base64UrlDecode($signatureB64);
        $expectedSig = hash_hmac('sha256', "{$headerB64}.{$payloadB64}", self::$secretKey, true);

        if (!hash_equals($expectedSig, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payloadB64), true);

        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    public static function requireAuth(): array
    {
        $payload = self::validateToken();
        
        if ($payload === null) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }

        return $payload;
    }

    public static function requireRole(array $allowedRoles): array
    {
        $payload = self::requireAuth();
        
        if (!isset($payload['role']) || !in_array($payload['role'], $allowedRoles, true)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Forbidden']);
            exit;
        }

        return $payload;
    }

    private static function base64UrlDecode(string $data): string
    {
        $padded = str_pad($data, strlen($data) % 4, '=');
        return base64_decode(strtr($padded, '-_', '+/'));
    }
}