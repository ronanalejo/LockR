-- Add wing and setName columns to locker table
ALTER TABLE `locker`
  ADD COLUMN `wing` ENUM('Left Wing', 'Right Wing') NULL AFTER `floorNumber`,
  ADD COLUMN `setName` VARCHAR(1) NULL AFTER `wing`;

CREATE INDEX idx_locker_wing ON `locker`(`wing`);
CREATE INDEX idx_locker_floor_wing_set ON `locker`(`floorNumber`, `wing`, `setName`);

-- Create locker_set table
CREATE TABLE IF NOT EXISTS `locker_set` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `floorNumber` ENUM('6','7','9','10') NOT NULL,
  `wing` ENUM('Left Wing', 'Right Wing') NOT NULL,
  `setName` CHAR(1) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uq_locker_set` UNIQUE (`floorNumber`, `wing`, `setName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_locker_set_floor_wing ON `locker_set`(`floorNumber`, `wing`);