-- Store floor plan metadata and configurations

-- Main floor plans table
CREATE TABLE IF NOT EXISTS floor_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_number INT NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_path VARCHAR(255),
    locker_positions JSON COMMENT 'Array of locker positions with coordinates',
    metadata JSON COMMENT 'Additional floor plan metadata (dimensions, scale, etc)',
    version INT DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    last_modified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_floor_number (floor_number),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Floor plan history for version control
CREATE TABLE IF NOT EXISTS floor_plan_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_plan_id INT NOT NULL,
    floor_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_path VARCHAR(255),
    locker_positions JSON,
    metadata JSON,
    version INT NOT NULL,
    modified_by INT,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_notes TEXT COMMENT 'Optional notes about what changed',
    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_floor_plan_id (floor_plan_id),
    INDEX idx_version (floor_plan_id, version),
    INDEX idx_modified_at (modified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add position columns to lockers table if not exists
ALTER TABLE lockers 
ADD COLUMN IF NOT EXISTS position_x DECIMAL(10,2) DEFAULT 0 COMMENT 'X coordinate on floor plan',
ADD COLUMN IF NOT EXISTS position_y DECIMAL(10,2) DEFAULT 0 COMMENT 'Y coordinate on floor plan',
ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) DEFAULT 50 COMMENT 'Visual width on floor plan',
ADD COLUMN IF NOT EXISTS height DECIMAL(10,2) DEFAULT 50 COMMENT 'Visual height on floor plan';

-- Add indexes for performance
ALTER TABLE lockers
ADD INDEX IF NOT EXISTS idx_floor_position (floor, position_x, position_y);

-- Insert sample floor plans
INSERT INTO floor_plans (floor_number, name, description, locker_positions, metadata, version) VALUES
(1, 'Ground Floor', 'Main entrance floor with lobby lockers', 
 JSON_ARRAY(
    JSON_OBJECT('locker_number', 'L1-001', 'x', 100, 'y', 100, 'width', 50, 'height', 50),
    JSON_OBJECT('locker_number', 'L1-002', 'x', 160, 'y', 100, 'width', 50, 'height', 50),
    JSON_OBJECT('locker_number', 'L1-003', 'x', 220, 'y', 100, 'width', 50, 'height', 50)
 ),
 JSON_OBJECT('dimensions', JSON_OBJECT('width', 1000, 'height', 800), 'scale', 1, 'unit', 'pixels')
, 1),

(2, 'Second Floor', 'Academic building floor with student lockers',
 JSON_ARRAY(
    JSON_OBJECT('locker_number', 'L2-001', 'x', 50, 'y', 150, 'width', 50, 'height', 50),
    JSON_OBJECT('locker_number', 'L2-002', 'x', 110, 'y', 150, 'width', 50, 'height', 50)
 ),
 JSON_OBJECT('dimensions', JSON_OBJECT('width', 1000, 'height', 800), 'scale', 1, 'unit', 'pixels')
, 1),

(3, 'Third Floor', 'Upper floor with faculty and staff lockers',
 JSON_ARRAY(
    JSON_OBJECT('locker_number', 'L3-001', 'x', 200, 'y', 200, 'width', 50, 'height', 50)
 ),
 JSON_OBJECT('dimensions', JSON_OBJECT('width', 1000, 'height', 800), 'scale', 1, 'unit', 'pixels')
, 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Create view for floor plan statistics
CREATE OR REPLACE VIEW floor_plan_stats AS
SELECT 
    fp.id,
    fp.floor_number,
    fp.name,
    COUNT(l.id) as total_lockers,
    SUM(CASE WHEN l.status = 'available' THEN 1 ELSE 0 END) as available_lockers,
    SUM(CASE WHEN l.status = 'occupied' THEN 1 ELSE 0 END) as occupied_lockers,
    SUM(CASE WHEN l.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_lockers,
    SUM(CASE WHEN l.status = 'reserved' THEN 1 ELSE 0 END) as reserved_lockers,
    ROUND((SUM(CASE WHEN l.status = 'occupied' THEN 1 ELSE 0 END) / COUNT(l.id)) * 100, 2) as occupancy_rate,
    fp.version,
    fp.updated_at
FROM floor_plans fp
LEFT JOIN lockers l ON fp.floor_number = l.floor
WHERE fp.is_active = 1
GROUP BY fp.id, fp.floor_number, fp.name, fp.version, fp.updated_at;

-- Trigger to update locker positions when floor plan is updated
DELIMITER //

CREATE TRIGGER IF NOT EXISTS sync_locker_positions
AFTER UPDATE ON floor_plans
FOR EACH ROW
BEGIN
    DECLARE locker_data JSON;
    DECLARE i INT DEFAULT 0;
    DECLARE locker_count INT;
    
    IF NEW.locker_positions IS NOT NULL THEN
        SET locker_count = JSON_LENGTH(NEW.locker_positions);
        
        WHILE i < locker_count DO
            SET locker_data = JSON_EXTRACT(NEW.locker_positions, CONCAT('$[', i, ']'));
            
            UPDATE lockers 
            SET 
                position_x = JSON_UNQUOTE(JSON_EXTRACT(locker_data, '$.x')),
                position_y = JSON_UNQUOTE(JSON_EXTRACT(locker_data, '$.y')),
                width = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(locker_data, '$.width')), 50),
                height = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(locker_data, '$.height')), 50)
            WHERE 
                locker_number = JSON_UNQUOTE(JSON_EXTRACT(locker_data, '$.locker_number'))
                AND floor = NEW.floor_number;
            
            SET i = i + 1;
        END WHILE;
    END IF;
END//

DELIMITER ;

-- Create indexes for better query performance
CREATE INDEX idx_floor_plan_stats ON lockers(floor, status);
CREATE INDEX idx_active_floor_plans ON floor_plans(is_active, floor_number);