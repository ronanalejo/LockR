CREATE TABLE semester_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Academic classification
    academic_level ENUM('SHS', 'COLLEGE') NOT NULL COMMENT 'Academic level: Senior High School or College',
    
    -- Academic year and semester identification
    academic_year VARCHAR(20) NOT NULL COMMENT 'Format: YYYY-YYYY (e.g., 2024-2025)',
    semester_name VARCHAR(50) NOT NULL COMMENT 'Semester identifier (SHS: 1st Term, 2nd Term | College: 1st Semester, 2nd Semester, 3rd Semester)',
    
    -- Date range for the semester
    start_date DATE NOT NULL COMMENT 'First day of the semester',
    end_date DATE NOT NULL COMMENT 'Last day of the semester',
    
    -- Status tracking
    status ENUM('UPCOMING', 'ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'UPCOMING' COMMENT 'Current status of the semester period',
    
    -- Metadata
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Soft delete flag: 1 = active, 0 = deleted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_date_range CHECK (end_date > start_date),
    CONSTRAINT uq_semester_period UNIQUE (academic_level, academic_year, semester_name, is_active),
    
    -- Indexes for performance
    INDEX idx_academic_level_status (academic_level, status, start_date),
    INDEX idx_date_range (start_date, end_date),
    INDEX idx_academic_year (academic_year)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores semester date ranges for SHS and College academic periods';