const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");
const authMiddleware = require("../middleware/authMiddleware");

router.post(
  "/send",
  authMiddleware.verifyToken,
  authMiddleware.isStudent,
  otpController.sendOTP,
);
router.post(
  "/verify",
  authMiddleware.verifyToken,
  authMiddleware.isStudent,
  otpController.verifyOTP,
);

module.exports = router;
