require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins =
  process.env.NODE_ENV === "development"
    ? ["https://lockr.fit", "https://www.lockr.fit"]
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
      ];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS Request from origin:", origin);
    console.log("Environment:", process.env.NODE_ENV);
    console.log("Allowed origins:", allowedOrigins);

    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      console.log("No origin - allowing request");
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log("Origin allowed");
      callback(null, true);
    } else {
      console.log("Origin blocked:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path = require("path");

// Serve uploaded files statically
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  }),
);

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

// Import routes
const authRoutes = require("./routes/authRoutes");
const lockerRoutes = require("./routes/lockerRoutes");
const otpRoutes = require("./routes/otpRoutes");

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/lockers", lockerRoutes);
const reservationRoutes = require("./routes/reservationRoutes");
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpRoutes);

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
