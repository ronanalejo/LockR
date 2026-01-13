<?php
declare(strict_types=1);

function setCorsHeaders(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    $allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    ];

    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
    } else {
        header('Access-Control-Allow-Origin: http://localhost:3000');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function errorResponse(string $message, int $statusCode = 400): void
{
    jsonResponse([
        'success' => false,
        'error' => $message
    ], $statusCode);
}

function successResponse(array $data = [], string $message = 'Success'): void
{
    jsonResponse([
        'success' => true,
        'message' => $message,
        'data' => $data
    ], 200);
}