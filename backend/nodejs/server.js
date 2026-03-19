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
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://lockr.fit",
        "https://www.lockr.fit",
        "https://api.lockr.fit",
        "http://lockr.fit",
        "http://www.lockr.fit",
        "lockr.fit",
      ]
    : [
        "https://lockr.fit",
        "https://www.lockr.fit",
        "https://api.lockr.fit",
        "lockr.fit",
      ];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Custom security headers for Google OAuth compatibility
app.use((req, res, next) => {
  // Allow cross-origin popups for Google OAuth
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Disable helmet's COOP to use custom
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const path = require("path");

// Serve uploaded files statically
app.use(
  "/uploads",
  (req, res, next) => {
    // Remove X-Frame-Options for PDF files so they can be displayed in iframes
    if (req.path.toLowerCase().endsWith(".pdf")) {
      res.removeHeader("X-Frame-Options");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
    }
    next();
  },
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.removeHeader("X-Frame-Options");
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
  } catch (err) {
    console.error("Database connection test failed:", err.message);
  }
})();

// Import routes
const authRoutes = require("./routes/authRoutes");
const lockerRoutes = require("./routes/lockerRoutes");
const otpRoutes = require("./routes/otpRoutes");
const financeRoutes = require("./routes/financeRoutes");
const academicCalendarRoutes = require("./routes/academicCalendarRoutes");
const semesterPeriodsRoutes = require("./routes/semesterPeriodsRoutes");
const lockerSetRoutes = require("./routes/lockerSetRoutes");

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/lockers", lockerRoutes);
const reservationRoutes = require("./routes/reservationRoutes");
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/academic-calendar", academicCalendarRoutes);
app.use("/api/semester-periods", semesterPeriodsRoutes);
app.use("/api/locker-sets", lockerSetRoutes);

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
const http = require("http");
const socketService = require("./services/socketService");

const server = http.createServer(app);

socketService.init(server, {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
});

server.listen(PORT, () => {});

const pool = require("./config/database");

setInterval(async () => {
  try {
    const [expired] = await pool.query(
      `SELECT r.referralSlipNo, r.lockerID, s.studentEmail, s.firstName as studentFirstName
       FROM reservation r
       INNER JOIN student s ON r.studentID = s.studentID
       WHERE (r.forEndorsement = 1 OR r.forApproval = 1)
         AND r.reservationTimeEnd < NOW()`,
    );
    for (const r of expired) {
      await pool.query(
        `UPDATE reservation SET forEndorsement = 0, forApproval = 0, isActive = 0 WHERE referralSlipNo = ?`,
        [r.referralSlipNo],
      );
      await pool.query(
        `UPDATE locker SET status = 'Available', updatedAt = CURRENT_TIMESTAMP WHERE lockerID = ?`,
        [r.lockerID],
      );
      socketService.emitReservationUpdate("reservation-rejected", {
        referralSlipNo: r.referralSlipNo,
      });
      socketService.emitLockerUpdate("locker-update", { lockerID: r.lockerID });
      setImmediate(async () => {
        try {
          const emailService = require("./services/emailService");
          await emailService.sendEndorsementRejectedEmail(
            r.studentEmail,
            r.studentFirstName,
            r.referralSlipNo,
            "OSAS was unable to complete your reservation.",
          );
          console.log(
            `[AutoReject] Rejection email sent to: ${r.studentEmail}`,
          );
        } catch (emailErr) {
          console.error(
            `[AutoReject] Failed to send rejection email:`,
            emailErr.message,
          );
        }
      });
    }
    if (expired.length > 0) {
      console.log(
        `[AutoReject] Rejected ${expired.length} expired reservation(s)`,
      );
    }
  } catch (err) {
    console.error("[AutoReject] Error during auto-rejection:", err.message);
  }
}, 60000);
