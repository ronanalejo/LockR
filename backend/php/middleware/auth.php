<?php
declare(strict_types=1);

class JWTAuth
{
    private static ?string $secretKey = null;

    private static function getSecretKey(): string
    {
        if (self::$secretKey === null) {
            self::$secretKey = Database::getConfig('JWT_SECRET');
            
            if (empty(self::$secretKey)) {
                throw new RuntimeException('JWT_SECRET not configured');
            }
        }
        
        return self::$secretKey;
    }

    public static function validateToken(): ?array
    {
        $authHeader = self::getAuthorizationHeader();
        
        if (empty($authHeader)) {
            error_log('JWT: No authorization header found');
            return null;
        }

        if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            error_log('JWT: Invalid authorization header format');
            return null;
        }

        $token = $matches[1];
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            error_log('JWT: Invalid token structure');
            return null;
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        try {
            $secretKey = self::getSecretKey();
            
            $signature = self::base64UrlDecode($signatureB64);
            $expectedSignature = hash_hmac('sha256', "{$headerB64}.{$payloadB64}", $secretKey, true);

            if (!hash_equals($expectedSignature, $signature)) {
                error_log('JWT: Invalid signature');
                return null;
            }

            $payload = json_decode(self::base64UrlDecode($payloadB64), true);

            if (!$payload) {
                error_log('JWT: Invalid payload');
                return null;
            }

            if (!isset($payload['exp']) || $payload['exp'] < time()) {
                error_log('JWT: Token expired');
                return null;
            }

            error_log('JWT: Token validated successfully for user: ' . ($payload['id'] ?? 'unknown'));
            return $payload;

        } catch (Exception $e) {
            error_log('JWT validation error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get Authorization header from multiple possible sources
     * Apache/Nginx may pass it differently
     */
    private static function getAuthorizationHeader(): ?string
    {
        // Direct from $_SERVER (most common)
        if (isset($_SERVER['HTTP_AUTHORIZATION']) && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        // Redirect variable (when using CGI/FastCGI)
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        
        // getallheaders() function (if available)
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (isset($headers['Authorization']) && !empty($headers['Authorization'])) {
                return $headers['Authorization'];
            }
            if (isset($headers['authorization']) && !empty($headers['authorization'])) {
                return $headers['authorization'];
            }
        }
        
        // apache_request_headers() function (if available)
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (isset($headers['Authorization']) && !empty($headers['Authorization'])) {
                return $headers['Authorization'];
            }
            if (isset($headers['authorization']) && !empty($headers['authorization'])) {
                return $headers['authorization'];
            }
        }
        
        return null;
    }

    public static function requireAuth(): array
    {
        $payload = self::validateToken();
        
        if ($payload === null) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Unauthorized. Please log in again.'
            ]);
            exit;
        }

        return $payload;
    }

    public static function requireRole(array $allowedRoles): array
    {
        $payload = self::requireAuth();
        
        $userRole = $payload['role'] ?? $payload['userType'] ?? null;
        
        if ($userRole === null || !in_array($userRole, $allowedRoles, true)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Forbidden. You do not have permission to access this resource.'
            ]);
            exit;
        }

        return $payload;
    }

    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        
        if ($remainder) {
            $padLength = 4 - $remainder;
            $data .= str_repeat('=', $padLength);
        }
        
        return base64_decode(strtr($data, '-_', '+/'));
    }
}