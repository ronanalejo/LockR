CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Configuration key identifier',
    config_value TEXT NOT NULL COMMENT 'Configuration value (JSON or string)',
    description VARCHAR(255) DEFAULT NULL COMMENT 'Description of this config',
    updated_by INT DEFAULT NULL COMMENT 'Admin ID who last updated this',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='System-wide configuration flags and settings';

-- Insert initial flag for semester period setup tracking
INSERT INTO system_config (config_key, config_value, description) 
VALUES ('semester_period_setup_prompted', 'false', 'Tracks if semester period setup modal has been shown to admin');