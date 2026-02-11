CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL COMMENT 'Action performed (e.g., PAYMENT_VERIFIED)',
    tableName VARCHAR(100) NOT NULL COMMENT 'Table affected',
    recordID VARCHAR(100) NOT NULL COMMENT 'Primary key of the affected record',
    performedBy VARCHAR(100) NOT NULL COMMENT 'Employee ID who performed the action',
    details JSON DEFAULT NULL COMMENT 'Additional context as JSON',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_action (action),
    INDEX idx_record (tableName, recordID),
    INDEX idx_performed_by (performedBy),
    INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for admin and finance actions';