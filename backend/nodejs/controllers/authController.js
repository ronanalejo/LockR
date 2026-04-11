const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const authService = require("../services/authService");
const bcrypt = require("bcrypt");

const authController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const result = await authService.authenticateUser(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message,
        });
      }

      const token = jwt.sign(
        {
          id:
            result.user.userType === "student"
              ? result.user.studentID
              : result.user.employeeID,
          email: result.user.email,
          userType: result.user.userType,
          role: result.user.role,
          department: result.user.department,
          branchID: result.user.branchID,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN },
      );

      res.json({
        success: true,
        message: "Login successful",
        token: token,
        user: result.user,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred during login",
      });
    }
  },

  googleLogin: async (req, res) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          success: false,
          message: "Google credential is required",
        });
      }

      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      let payload;
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.error("Token verification error:", verifyError);
        return res.status(401).json({
          success: false,
          message: "Invalid Google token",
        });
      }

      const email = payload.email;
      const googleFirstName = payload.given_name || "User";
      const googleLastName = payload.family_name || "";

      if (!email.endsWith("@iacademy.edu.ph")) {
        return res.status(403).json({
          success: false,
          message: "Only @iacademy.edu.ph email accounts are allowed",
        });
      }

      const result = await authService.authenticateUserByEmail(email);

      if (!result.success) {
        return res.status(200).json({
          success: false,
          needsRegistration: true,
          email: email,
          firstName: googleFirstName,
          lastName: googleLastName,
          message: "Account not found. Please complete registration.",
        });
      }

      const token = jwt.sign(
        {
          id:
            result.user.userType === "student"
              ? result.user.studentID
              : result.user.employeeID,
          email: result.user.email,
          userType: result.user.userType,
          role: result.user.role,
          department: result.user.department,
          branchID: result.user.branchID,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN },
      );

      res.json({
        success: true,
        message: "Google login successful",
        token: token,
        user: result.user,
      });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({
        success: false,
        message: "Google authentication failed",
        error: error.message,
      });
    }
  },

  completeRegistration: async (req, res) => {
    try {
      const { email, password, confirmPassword, firstName, lastName } =
        req.body;

      if (!email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, password, and confirmation are required",
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Passwords do not match",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      if (!email.endsWith("@iacademy.edu.ph")) {
        return res.status(403).json({
          success: false,
          message: "Only @iacademy.edu.ph email accounts are allowed",
        });
      }

      const { identifyUserRole } = require("../utils/roleIdentifier");
      const identifiedRole = identifyUserRole(email);

      if (!identifiedRole) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format for this system",
        });
      }

      const db = require("../config/database");

      if (!req.body.branchID) {
        return res.status(400).json({
          success: false,
          message: "Branch selection is required",
        });
      }

      const [branchExists] = await db.query(
        "SELECT branchID FROM branch WHERE branchID = ?",
        [req.body.branchID],
      );

      if (branchExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch selected",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userFirstName = firstName || "User";
      const userLastName = lastName || "";

      if (
        identifiedRole === "college_student" ||
        identifiedRole === "shs_student"
      ) {
        const [existingStudent] = await db.query(
          "SELECT * FROM student WHERE studentEmail = ?",
          [email],
        );

        if (existingStudent.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Account already exists",
          });
        }

        const studentID = email.split("@")[0];
        const studentType =
          identifiedRole === "college_student" ? "College" : "SHS";

        await db.query(
          "INSERT INTO student (studentID, branchID, studentEmail, firstName, lastName, password, student_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
          [
            studentID,
            req.body.branchID,
            email,
            userFirstName,
            userLastName,
            hashedPassword,
            studentType,
          ],
        );

        const token = jwt.sign(
          {
            id: studentID,
            email: email,
            userType: "student",
            role: "Student",
            branchID: req.body.branchID,
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN },
        );

        return res.json({
          success: true,
          message: "Registration successful",
          token: token,
          user: {
            studentID: studentID,
            email: email,
            firstName: userFirstName,
            lastName: userLastName,
            userType: "student",
            studentType: studentType,
            branchID: req.body.branchID,
          },
        });
      }

      if (identifiedRole === "admin") {
        const [existingAdmin] = await db.query(
          "SELECT * FROM admin WHERE employeeEmail = ?",
          [email],
        );

        if (existingAdmin.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Account already exists",
          });
        }

        const employeeID = Date.now();

        await db.query(
          "INSERT INTO admin (employeeID, branchID, employeeEmail, firstName, lastName, password, department, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
          [
            employeeID,
            req.body.branchID,
            email,
            userFirstName,
            userLastName,
            hashedPassword,
            "OSAS",
          ],
        );

        const token = jwt.sign(
          {
            id: employeeID,
            email: email,
            userType: "admin",
            role: "OSAS",
            department: "OSAS",
            branchID: req.body.branchID,
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN },
        );

        return res.json({
          success: true,
          message: "Registration successful",
          token: token,
          user: {
            employeeID: employeeID,
            email: email,
            firstName: userFirstName,
            lastName: userLastName,
            userType: "admin",
            department: "OSAS",
            branchID: req.body.branchID,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    } catch (error) {
      console.error("Registration error details:", {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sql: error.sql,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                code: error.code,
                sqlMessage: error.sqlMessage,
              }
            : undefined,
      });
    }
  },

  getBranches: async (req, res) => {
    try {
      const db = require("../config/database");

      const [branches] = await db.query(
        "SELECT branchID, branchName, branchAddress FROM branch ORDER BY branchName ASC",
      );

      if (branches.length === 0) {
        return res.status(500).json({
          success: false,
          message: "No branches configured in system",
        });
      }

      res.json({
        success: true,
        branches: branches,
      });
    } catch (error) {
      console.error("Get branches error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve branches",
      });
    }
  },

  getMe: async (req, res) => {
    try {
      const db = require("../config/database");
      const userType = req.user.userType;

      if (userType === "student") {
        const [rows] = await db.query(
          "SELECT studentID, studentEmail, firstName, lastName, student_type, branchID FROM student WHERE studentID = ?",
          [req.user.id],
        );

        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Student not found" });
        }

        const s = rows[0];
        return res.json({
          success: true,
          user: {
            studentID: s.studentID,
            email: s.studentEmail,
            firstName: s.firstName,
            lastName: s.lastName,
            userType: "student",
            role: "Student",
            studentType: s.student_type,
            branchID: s.branchID,
          },
        });
      }

      if (userType === "admin") {
        const [rows] = await db.query(
          "SELECT employeeID, employeeEmail, firstName, lastName, department, branchID FROM admin WHERE employeeID = ?",
          [req.user.id],
        );

        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Admin not found" });
        }

        const a = rows[0];
        const { mapAdminDepartmentToRole } = require("../services/authService");
        return res.json({
          success: true,
          user: {
            employeeID: a.employeeID,
            email: a.employeeEmail,
            firstName: a.firstName,
            lastName: a.lastName,
            userType: "admin",
            role: mapAdminDepartmentToRole(a.department),
            department: a.department,
            branchID: a.branchID,
          },
        });
      }

      return res
        .status(400)
        .json({ success: false, message: "Unknown user type" });
    } catch (error) {
      console.error("getMe error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch current user" });
    }
  },
};

module.exports = authController;
