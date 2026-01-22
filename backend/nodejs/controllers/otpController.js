const otpService = require("../services/otpService");
const emailService = require("../services/emailService");
const db = require("../config/database");

const otpController = {
  sendOTP: async (req, res) => {
    try {
      const studentID = req.user.id;

      // First get student email from database
      const [students] = await db.query(
        "SELECT studentEmail, firstName FROM student WHERE studentID = ?",
        [studentID],
      );

      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const { studentEmail, firstName } = students[0];

      // if (otpService.hasRecentOTP(studentEmail)) {
      //   return res.status(429).json({
      //     success: false,
      //     message: 'Please wait 1 minute before requesting a new code',
      //   });
      // }

      const otp = otpService.generateOTP();

      otpService.storeOTP(studentEmail, otp);

      await emailService.sendOTP(studentEmail, otp, firstName);

      res.json({
        success: true,
        message: "Verification code sent to your email",
        email: studentEmail,
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send verification code",
        error: error.message,
      });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const { otp } = req.body;
      const studentID = req.user.id;

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: "Verification code is required",
        });
      }

      const [students] = await db.query(
        "SELECT studentEmail FROM student WHERE studentID = ?",
        [studentID],
      );

      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const { studentEmail } = students[0];
      const result = otpService.verifyOTP(studentEmail, otp);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify code",
        error: error.message,
      });
    }
  },
};

module.exports = otpController;
