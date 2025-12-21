-- Create Student table
CREATE TABLE IF NOT EXISTS `student` (
  `studentID` VARCHAR(50) PRIMARY KEY,
  `branchID` VARCHAR(50) NOT NULL,
  `studentEmail` VARCHAR(255) NOT NULL UNIQUE,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
  `course_strand` VARCHAR(100) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  CONSTRAINT `fk_student_branch` 
    FOREIGN KEY (`branchID`) 
    REFERENCES `branch`(`branchID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better query performance
CREATE INDEX idx_student_email ON `student`(`studentEmail`);
CREATE INDEX idx_student_branch ON `student`(`branchID`);