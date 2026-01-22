require("dotenv").config({ path: "../../config/environments/.env" });
const emailService = require("./services/emailService");

async function testEmail() {
  try {
    console.log("Testing email with Brevo...");
    console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_FROM_ADDRESS:", process.env.EMAIL_FROM_ADDRESS);

    await emailService.sendOTP(
      "ronanjames.alejo725@gmail.com", // Change to your test email
      "123456",
      "Test User",
    );

    console.log("Email sent successfully! Check your inbox.");
  } catch (error) {
    console.error("Email failed:", error.message);
  }
}

testEmail();
