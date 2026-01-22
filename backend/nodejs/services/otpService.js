const crypto = require("crypto");

class OTPService {
  constructor() {
    this.otpStore = new Map();
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  storeOTP(email, otp) {
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    this.otpStore.set(email, {
      otp,
      expiresAt,
      attempts: 0,
    });
  }

  verifyOTP(email, otp) {
    const stored = this.otpStore.get(email);

    if (!stored) {
      return {
        success: false,
        message: "No OTP found. Please request a new code.",
      };
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(email);
      return {
        success: false,
        message: "OTP has expired. Please request a new code.",
      };
    }

    if (stored.attempts >= 3) {
      this.otpStore.delete(email);
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
      };
    }

    if (stored.otp !== otp) {
      stored.attempts += 1;
      return {
        success: false,
        message: "Invalid verification code. Please try again.",
      };
    }

    this.otpStore.delete(email);
    return { success: true, message: "Email verified successfully" };
  }

  hasRecentOTP(email) {
    const stored = this.otpStore.get(email);
    if (!stored) return false;

    const timeSinceCreation = Date.now() - (stored.expiresAt - 5 * 60 * 1000);
    return timeSinceCreation < 60 * 1000; // Rate limit: 1 minute
  }

  clearOTP(email) {
    this.otpStore.delete(email);
  }
}

module.exports = new OTPService();
