const nodemailer = require("nodemailer");
const dns = require("dns");

// Force IPv4 DNS resolution
dns.setDefaultResultOrder("ipv4first");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      family: 4,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    this.fromAddress = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`;
  }

  async sendOTP(email, otp, firstName) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: "Email Verification - LockR",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; 
                        letter-spacing: 5px; padding: 20px; background: white; border-radius: 8px; 
                        margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>iACADEMY Locker System</h1>
            </div>
            <div class="content">
              <h2>Email Verification Required</h2>
              <p>Hello ${firstName},</p>
              <p>You are attempting to sign the Locker Usage Agreement. Please use the verification code below to confirm your identity:</p>
              <div class="otp-code">${otp}</div>
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 5 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you did not request this, please ignore this email</li>
              </ul>
            </div>
            <div class="footer">
              <p style="color: #dc2626; font-weight: bold;">⚠️ PLEASE DO NOT REPLY TO THIS EMAIL</p>
              <p>This is an automated message from the iACADEMY Locker Reservation System.</p>
              <p>This mailbox is not monitored. For assistance, please contact:</p>
              <p><strong>OSAS Office:</strong> osas@iacademy.edu.ph</p>
              <p><strong>Phone:</strong> (02) 8889 5555</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendAgreementPDF(email, firstName, pdfBuffer, referralSlipNo) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: "Locker Usage Agreement - Confirmation Copy",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Agreement Confirmed</h1>
            </div>
            <div class="content">
              <h2>Locker Usage Agreement</h2>
              <p>Dear ${firstName},</p>
              <p>Your Locker Usage Agreement has been successfully submitted and confirmed.</p>
              <p><strong>Referral Slip No:</strong> ${referralSlipNo}</p>
              <p>Please find your signed agreement form attached to this email for your records.</p>
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Your reservation is now pending OSAS endorsement</li>
                <li>You will be notified once your reservation is approved</li>
                <li>Keep this document for your records</li>
              </ul>
            </div>
            <div class="footer">
              <p style="color: #dc2626; font-weight: bold;">⚠️ PLEASE DO NOT REPLY TO THIS EMAIL</p>
              <p>This is an automated confirmation from the iACADEMY Locker Reservation System.</p>
              <p>This mailbox is not monitored. For assistance, please contact:</p>
              <p><strong>OSAS Office:</strong> osas@iacademy.edu.ph</p>
              <p><strong>Phone:</strong> (02) 8889 5555</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Application Form and Locker Usage Agreement - ${referralSlipNo}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
