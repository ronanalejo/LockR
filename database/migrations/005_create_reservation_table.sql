-- Create Reservation table
CREATE TABLE IF NOT EXISTS `reservation` (
  `referralSlipNo` INT PRIMARY KEY AUTO_INCREMENT,
  `lockerID` VARCHAR(50) NOT NULL,
  `studentID` VARCHAR(50) NOT NULL,
  `employeeID` INT DEFAULT NULL,
  `approvalDate` DATETIME DEFAULT NULL COMMENT 'When admin approved the reservation',
  `floorNumber` ENUM('6','7','9','10') NOT NULL,
  `shsTerm` ENUM('1','2') DEFAULT NULL COMMENT 'For SHS students',
  `collegeTerm` ENUM('1','2','3') DEFAULT NULL COMMENT 'For College students',
  `agreement` ENUM('1 Semester/Term','2 Semesters/Terms','1 School Year') NOT NULL,
  `duplicate` BOOLEAN DEFAULT FALSE,
  `forEndorsement` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Pending OSAS endorsement',
  `forApproval` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Pending final admin approval',
  `isActive` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Reservation is currently active',
  `lockerApplicationFormAgreement` VARCHAR(255) DEFAULT NULL COMMENT 'File path to signed agreement form',
  `dropboxReceipt` VARCHAR(255) DEFAULT NULL COMMENT 'File path to payment receipt',
  `pdfPaymentAdviceSlip` VARCHAR(255) DEFAULT NULL COMMENT 'File path to generated PDF slip',
  `reservationTimeStart` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When reservation was made',
  `reservationTimeEnd` DATETIME DEFAULT (CURDATE() + INTERVAL 16 HOUR + INTERVAL 30 MINUTE) COMMENT 'Default 4:30 PM same day',
  `agreementDateStart` DATETIME DEFAULT NULL COMMENT 'When locker usage period begins',
  `agreementDateEnd` DATETIME DEFAULT NULL COMMENT 'When locker usage period ends',
  `trimesterDateStart` DATETIME DEFAULT NULL,
  `trimesterDateEnd` DATETIME DEFAULT NULL,
  `semesterDateStart` DATETIME DEFAULT NULL,
  `semesterDateEnd` DATETIME DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_reservation_locker` 
    FOREIGN KEY (`lockerID`) 
    REFERENCES `locker`(`lockerID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_reservation_student` 
    FOREIGN KEY (`studentID`) 
    REFERENCES `student`(`studentID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_reservation_admin` 
    FOREIGN KEY (`employeeID`) 
    REFERENCES `admin`(`employeeID`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- Indexes for Performance Optimization
-- ========================================================================

-- Core relationship indexes
CREATE INDEX idx_reservation_locker ON `reservation`(`lockerID`);
CREATE INDEX idx_reservation_student ON `reservation`(`studentID`);
CREATE INDEX idx_reservation_employee ON `reservation`(`employeeID`);

-- Status flag indexes for filtering
CREATE INDEX idx_reservation_flags ON `reservation`(`forEndorsement`, `forApproval`, `isActive`);
CREATE INDEX idx_reservation_active ON `reservation`(`isActive`, `agreementDateEnd`);

-- Date range indexes
CREATE INDEX idx_reservation_dates ON `reservation`(`reservationTimeStart`, `reservationTimeEnd`);

-- ========================================================================
-- Status Logic Reference
-- ========================================================================
-- 
-- Status State           | forEndorsement | forApproval | isActive
-- -----------------------|----------------|-------------|----------
-- For Endorsement        | TRUE           | FALSE       | FALSE
-- For Approval           | FALSE          | TRUE        | FALSE
-- Active (Approved)      | FALSE          | FALSE       | TRUE
-- Rejected/Completed     | FALSE          | FALSE       | FALSE
-- 
-- ========================================================================