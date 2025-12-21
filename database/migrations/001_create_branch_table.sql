-- Create Branch table
CREATE TABLE IF NOT EXISTS `branch` (
  `branchID` VARCHAR(50) PRIMARY KEY,
  `branchName` VARCHAR(255) NOT NULL,
  `branchAddress` VARCHAR(255) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for better query performance
CREATE INDEX idx_branch_name ON `branch`(`branchName`);