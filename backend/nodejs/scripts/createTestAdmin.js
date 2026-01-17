require("dotenv").config({
  path: "../config/environments/.env.development",
});
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const createTestAdmin = async () => {
  try {
    const hashedPassword = await bcrypt.hash("adminpass123", 10);

    const query = `
      INSERT INTO admin (branchID, employeeEmail, firstName, lastName, password, department) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      "MKT",
      "admin@iacademy.edu.ph",
      "Admin",
      "User",
      hashedPassword,
      "OSAS",
    ]);
    console.log("Test admin created successfully");
  } catch (error) {
    console.error("Error creating test admin:", error.message);
  } finally {
    process.exit();
  }
};

createTestAdmin();
