<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

// Database connection
try {
    $db = Database::getInstance();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Ensure admin authentication
session_start();

// Check if user is logged in and is admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized access. Admin privileges required.']);
    exit;
}

$userId = $_SESSION['user_id'];

$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$floor = $path[0] ?? null;

/**
 * GET /api/admin/floor-plans - Get all floor plans
 */
if ($method === 'GET' && !$floor) {
    try {
        // Check cache first
        $cacheKey = 'floor_plans_all';
        $cached = getCache($cacheKey);
        
        if ($cached) {
            echo json_encode($cached);
            exit;
        }

        $query = "
            SELECT 
                fp.*,
                COUNT(DISTINCT l.id) as total_lockers,
                COUNT(DISTINCT CASE WHEN l.status = 'available' THEN l.id END) as available_lockers,
                COUNT(DISTINCT CASE WHEN l.status = 'occupied' THEN l.id END) as occupied_lockers,
                u.username as last_modified_by_name
            FROM floor_plans fp
            LEFT JOIN lockers l ON fp.floor_number = l.floor
            LEFT JOIN users u ON fp.last_modified_by = u.id
            WHERE fp.is_active = 1
            GROUP BY fp.id
            ORDER BY fp.floor_number ASC
        ";

        $stmt = $db->prepare($query);
        $stmt->execute();
        $floorPlans = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format response with locker layouts
        $result = array_map(function($plan) use ($db) {
            return formatFloorPlan($plan, $db);
        }, $floorPlans);

        // Cache for 5 minutes
        setCache($cacheKey, $result, 300);

        echo json_encode($result);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch floor plans: ' . $e->getMessage()]);
    }
}

/**
 * GET /api/admin/floor-plans/:floor - Get specific floor plan
 */
elseif ($method === 'GET' && $floor) {
    try {
        // Check cache first
        $cacheKey = "floor_plan_{$floor}";
        $cached = getCache($cacheKey);
        
        if ($cached) {
            echo json_encode($cached);
            exit;
        }

        $query = "
            SELECT 
                fp.*,
                u.username as last_modified_by_name
            FROM floor_plans fp
            LEFT JOIN users u ON fp.last_modified_by = u.id
            WHERE fp.floor_number = :floor AND fp.is_active = 1
        ";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':floor', $floor);
        $stmt->execute();
        $plan = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$plan) {
            http_response_code(404);
            echo json_encode(['error' => 'Floor plan not found']);
            exit;
        }

        // Get locker positions for this floor
        $lockerQuery = "
            SELECT 
                l.*,
                u.username as occupant_name,
                r.start_date,
                r.end_date
            FROM lockers l
            LEFT JOIN reservations r ON l.current_reservation_id = r.id AND r.status = 'active'
            LEFT JOIN users u ON r.user_id = u.id
            WHERE l.floor = :floor
            ORDER BY l.locker_number ASC
        ";

        $lockerStmt = $db->prepare($lockerQuery);
        $lockerStmt->bindParam(':floor', $floor);
        $lockerStmt->execute();
        $lockers = $lockerStmt->fetchAll(PDO::FETCH_ASSOC);

        $result = formatFloorPlan($plan, $db, $lockers);

        // Cache for 5 minutes
        setCache($cacheKey, $result, 300);

        echo json_encode($result);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch floor plan: ' . $e->getMessage()]);
    }
}

/**
 * PUT /api/admin/floor-plans/:floor - Update floor plan
 */
elseif ($method === 'PUT' && $floor) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        // Start transaction
        $db->beginTransaction();

        // Get current floor plan for versioning
        $currentQuery = "SELECT * FROM floor_plans WHERE floor_number = :floor AND is_active = 1";
        $currentStmt = $db->prepare($currentQuery);
        $currentStmt->bindParam(':floor', $floor);
        $currentStmt->execute();
        $currentPlan = $currentStmt->fetch(PDO::FETCH_ASSOC);

        if (!$currentPlan) {
            http_response_code(404);
            echo json_encode(['error' => 'Floor plan not found']);
            exit;
        }

        // Archive current version
        $archiveQuery = "
            INSERT INTO floor_plan_history 
            (floor_plan_id, floor_number, name, description, image_path, 
             locker_positions, metadata, version, modified_by, modified_at)
            VALUES 
            (:id, :floor, :name, :description, :image_path, 
             :positions, :metadata, :version, :user_id, NOW())
        ";

        $archiveStmt = $db->prepare($archiveQuery);
        $archiveStmt->execute([
            ':id' => $currentPlan['id'],
            ':floor' => $currentPlan['floor_number'],
            ':name' => $currentPlan['name'],
            ':description' => $currentPlan['description'],
            ':image_path' => $currentPlan['image_path'],
            ':positions' => $currentPlan['locker_positions'],
            ':metadata' => $currentPlan['metadata'],
            ':version' => $currentPlan['version'],
            ':user_id' => $userId
        ]);

        // Handle image upload if provided
        $imagePath = $currentPlan['image_path'];
        if (isset($_FILES['floor_plan_image'])) {
            $uploadResult = uploadFloorPlanImage($_FILES['floor_plan_image'], $floor);
            if ($uploadResult['success']) {
                $imagePath = $uploadResult['path'];
            }
        }

        // Update floor plan
        $updateQuery = "
            UPDATE floor_plans SET
                name = :name,
                description = :description,
                image_path = :image_path,
                locker_positions = :positions,
                metadata = :metadata,
                version = version + 1,
                last_modified_by = :user_id,
                updated_at = NOW()
            WHERE floor_number = :floor AND is_active = 1
        ";

        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute([
            ':name' => $input['name'] ?? $currentPlan['name'],
            ':description' => $input['description'] ?? $currentPlan['description'],
            ':image_path' => $imagePath,
            ':positions' => json_encode($input['locker_positions'] ?? []),
            ':metadata' => json_encode($input['metadata'] ?? []),
            ':user_id' => $userId,
            ':floor' => $floor
        ]);

        // Update individual locker positions if provided
        if (isset($input['locker_positions']) && is_array($input['locker_positions'])) {
            foreach ($input['locker_positions'] as $lockerPos) {
                $lockerUpdateQuery = "
                    UPDATE lockers SET
                        position_x = :x,
                        position_y = :y,
                        width = :width,
                        height = :height
                    WHERE locker_number = :locker_number AND floor = :floor
                ";

                $lockerUpdateStmt = $db->prepare($lockerUpdateQuery);
                $lockerUpdateStmt->execute([
                    ':x' => $lockerPos['x'],
                    ':y' => $lockerPos['y'],
                    ':width' => $lockerPos['width'] ?? 50,
                    ':height' => $lockerPos['height'] ?? 50,
                    ':locker_number' => $lockerPos['locker_number'],
                    ':floor' => $floor
                ]);
            }
        }

        $db->commit();

        // Clear cache
        clearFloorPlanCache($floor);

        // Return updated floor plan
        $stmt = $db->prepare("SELECT * FROM floor_plans WHERE floor_number = :floor AND is_active = 1");
        $stmt->bindParam(':floor', $floor);
        $stmt->execute();
        $updated = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'Floor plan updated successfully',
            'data' => formatFloorPlan($updated, $db)
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update floor plan: ' . $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

/**
 * Helper Functions
 */

function formatFloorPlan($plan, $db, $lockers = null) {
    if (!$plan) return null;

    $formatted = [
        'id' => (int)$plan['id'],
        'floor_number' => (int)$plan['floor_number'],
        'name' => $plan['name'],
        'description' => $plan['description'],
        'image_url' => getFloorPlanImageUrl($plan['image_path']),
        'version' => (int)$plan['version'],
        'locker_positions' => json_decode($plan['locker_positions'] ?? '[]', true),
        'metadata' => json_decode($plan['metadata'] ?? '{}', true),
        'statistics' => [
            'total_lockers' => (int)($plan['total_lockers'] ?? 0),
            'available_lockers' => (int)($plan['available_lockers'] ?? 0),
            'occupied_lockers' => (int)($plan['occupied_lockers'] ?? 0)
        ],
        'last_modified_by' => $plan['last_modified_by_name'] ?? null,
        'updated_at' => $plan['updated_at'],
        'created_at' => $plan['created_at']
    ];

    if ($lockers !== null) {
        $formatted['lockers'] = array_map(function($locker) {
            return [
                'id' => (int)$locker['id'],
                'locker_number' => $locker['locker_number'],
                'status' => $locker['status'],
                'size' => $locker['size'],
                'position' => [
                    'x' => (float)$locker['position_x'],
                    'y' => (float)$locker['position_y'],
                    'width' => (float)($locker['width'] ?? 50),
                    'height' => (float)($locker['height'] ?? 50)
                ],
                'occupant' => $locker['occupant_name'] ?? null,
                'reservation_period' => $locker['start_date'] ? [
                    'start' => $locker['start_date'],
                    'end' => $locker['end_date']
                ] : null
            ];
        }, $lockers);
    }

    return $formatted;
}

function uploadFloorPlanImage($file, $floor) {
    $uploadDir = __DIR__ . '/../../uploads/floor-plans/';
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];
    if (!in_array($file['type'], $allowedTypes)) {
        return ['success' => false, 'error' => 'Invalid file type'];
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'floor_' . $floor . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        return ['success' => true, 'path' => 'floor-plans/' . $filename];
    }

    return ['success' => false, 'error' => 'Upload failed'];
}

function getFloorPlanImageUrl($path) {
    if (!$path) return null;
    $baseUrl = getenv('API_BASE_URL') ?: 'http://localhost:8000';
    return $baseUrl . '/uploads/' . $path;
}

function getCache($key) {
    $cacheFile = __DIR__ . '/../../cache/floor_plans/' . md5($key) . '.json';
    
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
        return json_decode(file_get_contents($cacheFile), true);
    }
    
    return null;
}

function setCache($key, $data, $ttl = 300) {
    $cacheDir = __DIR__ . '/../../cache/floor_plans/';
    
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }
    
    $cacheFile = $cacheDir . md5($key) . '.json';
    file_put_contents($cacheFile, json_encode($data));
}

function clearFloorPlanCache($floor = null) {
    $cacheDir = __DIR__ . '/../../cache/floor_plans/';
    
    if ($floor) {
        // Clear specific floor cache
        $keys = ["floor_plan_{$floor}", 'floor_plans_all'];
        foreach ($keys as $key) {
            $cacheFile = $cacheDir . md5($key) . '.json';
            if (file_exists($cacheFile)) {
                unlink($cacheFile);
            }
        }
    } else {
        // Clear all floor plan cache
        array_map('unlink', glob($cacheDir . '*.json'));
    }
}
?>