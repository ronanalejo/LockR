-- Create Locker table
CREATE TABLE IF NOT EXISTS `locker` (
  `lockerID` VARCHAR(50) PRIMARY KEY,
  `branchID` VARCHAR(50) NOT NULL,
  `floorNumber` ENUM('6','7','9','10') NOT NULL,
  `status` ENUM('Occupied', 'Reserved', 'Unavailable', 'Available') NOT NULL DEFAULT 'Available',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  CONSTRAINT `fk_locker_branch` 
    FOREIGN KEY (`branchID`) 
    REFERENCES `branch`(`branchID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better query performance
CREATE INDEX idx_locker_branch ON `locker`(`branchID`);
CREATE INDEX idx_locker_status ON `locker`(`status`);
CREATE INDEX idx_locker_floor ON `locker`(`floorNumber`);