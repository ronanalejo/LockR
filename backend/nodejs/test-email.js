require("dotenv").config({ path: "../../config/environments/.env" });
const emailService = require("./services/emailService");

async function testEmail() {
  try {
    await emailService.sendOTP(
      "ronanjames.alejo725@gmail.com", // Change to your test email
      "123456",
      "Test User",
    );
  } catch (error) {
    console.error("Email failed:", error.message);
  }
}

testEmail();
