-- Create Admin table
CREATE TABLE IF NOT EXISTS `admin` (
  `employeeID` INT PRIMARY KEY AUTO_INCREMENT,
  `branchID` VARCHAR(50) NOT NULL,
  `employeeEmail` VARCHAR(255) NOT NULL UNIQUE,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
  `department` VARCHAR(100) NOT NULL COMMENT 'OSAS or Finance',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  CONSTRAINT `fk_admin_branch` 
    FOREIGN KEY (`branchID`) 
    REFERENCES `branch`(`branchID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better query performance
CREATE INDEX idx_admin_email ON `admin`(`employeeEmail`);
CREATE INDEX idx_admin_branch ON `admin`(`branchID`);
CREATE INDEX idx_admin_department ON `admin`(`department`);