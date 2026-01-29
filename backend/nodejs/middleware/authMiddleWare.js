const jwt = require("jsonwebtoken");

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  },

  isStudent: (req, res, next) => {
    if (req.user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Students only",
      });
    }
    next();
  },

  isAdmin: (req, res, next) => {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only",
      });
    }
    next();
  },

  isFinance: (req, res, next) => {
    if (
      req.user.userType !== "admin" ||
      req.user.department !== "Finance"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Finance department access required.",
      });
    }
    next();
  }, 
};

module.exports = authMiddleware;
