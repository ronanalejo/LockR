-- Create Student table
CREATE TABLE IF NOT EXISTS `student` (
  `studentID` VARCHAR(50) PRIMARY KEY,
  `branchID` VARCHAR(50) NOT NULL,
  `studentEmail` VARCHAR(255) NOT NULL UNIQUE,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
  `student_type` ENUM('SHS', 'College') NOT NULL COMMENT 'SHS for Senior High School, College for College students',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `program` VARCHAR(200) DEFAULT NULL COMMENT 'Student program/course' AFTER `student_type`,
  
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
CREATE INDEX idx_student_program ON `student`(`program`);