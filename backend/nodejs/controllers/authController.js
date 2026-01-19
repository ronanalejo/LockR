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

      const hashedPassword = await bcrypt.hash(password, 10);
      const db = require("../config/database");

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
        const defaultBranch = "BRANCH-MKT";

        await db.query(
          "INSERT INTO student (studentID, branchID, studentEmail, firstName, lastName, password, course_strand, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
          [
            studentID,
            defaultBranch,
            email,
            userFirstName,
            userLastName,
            hashedPassword,
            "Pending",
          ],
        );

        const token = jwt.sign(
          {
            id: studentID,
            email: email,
            userType: "student",
            branchID: defaultBranch,
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
            studentType:
              identifiedRole === "college_student" ? "College" : "SHS",
            branchID: defaultBranch,
            courseStrand: "Pending",
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
        const defaultBranch = "BRANCH-MKT";

        await db.query(
          "INSERT INTO admin (employeeID, branchID, employeeEmail, firstName, lastName, password, department, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
          [
            employeeID,
            defaultBranch,
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
            branchID: defaultBranch,
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
            branchID: defaultBranch,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error.message,
      });
    }
  },
};

module.exports = authController;
