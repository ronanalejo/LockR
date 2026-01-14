<?php
declare(strict_types=1);

class Database
{
    private static ?PDO $instance = null;
    private static array $config = [];

    private function __construct() {}
    private function __clone() {}

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            self::loadConfig();
            self::connect();
        }
        return self::$instance;
    }

    private static function loadConfig(): void
    {
        $envFile = __DIR__ . '/../../../config/environments/.env.development';
        
        if (!file_exists($envFile)) {
            $envFile = __DIR__ . '/../../../.env.development';
        }
        
        if (!file_exists($envFile)) {
            throw new RuntimeException('Environment file not found');
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            $line = trim($line);
            
            if (empty($line) || $line[0] === '#') {
                continue;
            }
            
            if (strpos($line, '=') === false) {
                continue;
            }
            
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            $value = trim($value, '"\'');
            
            self::$config[$key] = $value;
        }
    }

    private static function connect(): void
    {
        $host = self::$config['DB_HOST'] ?? 'localhost';
        $port = self::$config['DB_PORT'] ?? '3306';
        $name = self::$config['DB_NAME'] ?? 'lockr_db';
        $user = self::$config['DB_USER'] ?? 'root';
        $pass = self::$config['DB_PASSWORD'] ?? '';

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            self::$instance = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            throw new RuntimeException('Database connection failed');
        }
    }

    public static function getConfig(string $key): ?string
    {
        if (empty(self::$config)) {
            self::loadConfig();
        }
        return self::$config[$key] ?? null;
    }
}