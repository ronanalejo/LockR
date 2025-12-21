require("dotenv").config();
const mysql = require("mysql2/promise");

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lockr_db_dev",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
pool
  .getConnection()
  .then((connection) => {
    console.log(`Connected to database: ${dbConfig.database}`);
    connection.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });

module.exports = pool;
