require("dotenv").config({
  path: "../config/environments/.env.development",
});
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const createTestStudent = async () => {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);

    const query = `
      INSERT INTO student (studentID, branchID, studentEmail, firstName, lastName, password, student_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      "2021-00001",
      "MKT",
      "student@example.com",
      "John",
      "Doe",
      hashedPassword,
      "BSIT",
    ]);
    console.log("Test student created successfully");
  } catch (error) {
    console.error("Error creating test student:", error.message);
  } finally {
    process.exit();
  }
};

createTestStudent();
