const jwt = require("jsonwebtoken");
const authService = require("../services/authService");

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
        { expiresIn: process.env.JWT_EXPIRES_IN }
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
};

module.exports = authController;
