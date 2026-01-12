require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import database connection
const db = require("./config/database");

// Test database connection on startup
(async () => {
  try {
    await db.query("SELECT 1");
    console.log("Database connection verified");
  } catch (err) {
    console.error("Database connection test failed:", err.message);
  }
})();

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
const reservationRoutes = require("./routes/reservationRoutes");
app.use("/api/reservations", reservationRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "LockR API Server is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "OK",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "ERROR",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`LockR API Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
