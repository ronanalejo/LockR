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

  async sendAgreementPDF(
    email,
    firstName,
    lastName,
    pdfBuffer,
    referralSlipNo,
  ) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: `Locker Reservation Created - ${firstName} ${lastName || ""} - ${referralSlipNo}`,
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

  async sendEndorsementApprovalEmail(
    email,
    firstName,
    referralSlipNo,
    employeeName,
    pdfBuffer,
  ) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: `Endorsement Approved - ${referralSlipNo}`,
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
            .info-box { background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Endorsement Approved</h1>
            </div>
            <div class="content">
              <h2>Good News!</h2>
              <p>Dear ${firstName},</p>
              <p>Your locker reservation endorsement has been approved by <strong>${employeeName}</strong>.</p>
              <div class="info-box">
                <p><strong>Referral Slip No:</strong> ${referralSlipNo}</p>
                <p><strong>Status:</strong> Waiting for Final Approval</p>
              </div>
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Please find your Payment Advice Slip attached to this email</li>
                <li>Present the Payment Advice Slip to the Finance Office for payment</li>
                <li>Upload your proof of payment in the system</li>
                <li>Your reservation is now pending final approval</li>
              </ul>
              <p>You will receive another notification once your reservation is fully approved.</p>
            </div>
            <div class="footer">
              <p style="color: #dc2626; font-weight: bold;">PLEASE DO NOT REPLY TO THIS EMAIL</p>
              <p>This is an automated notification from the iACADEMY Locker Reservation System.</p>
              <p>This mailbox is not monitored. For assistance, please contact:</p>
              <p><strong>OSAS Office:</strong> osas@iacademy.edu.ph</p>
              <p><strong>Phone:</strong> (02) 8889 5555</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: pdfBuffer
        ? [
            {
              filename: `Payment Advice Slip - ${referralSlipNo}.pdf`,
              content: pdfBuffer,
            },
          ]
        : [],
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendReservationApprovedEmail(
    email,
    firstName,
    referralSlipNo,
    lockerID,
    agreementDateEnd,
  ) {
    const formattedEndDate = agreementDateEnd
      ? new Date(agreementDateEnd).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: `Reservation Approved - Locker ${lockerID} - ${referralSlipNo}`,
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
            .info-box { background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .success-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reservation Approved!</h1>
            </div>
            <div class="content">
              <div class="success-icon">&#10003;</div>
              <h2>Congratulations, ${firstName}!</h2>
              <p>Your locker reservation has been <strong>fully approved</strong>.</p>
              <div class="info-box">
                <p><strong>Referral Slip No:</strong> ${referralSlipNo}</p>
                <p><strong>Locker ID:</strong> ${lockerID}</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>Valid Until:</strong> ${formattedEndDate}</p>
              </div>
              <p><strong>Important Reminders:</strong></p>
              <ul>
                <li>Your locker is now ready for use</li>
                <li>Please provide your own lock and submit a duplicate key to OSAS</li>
                <li>Keep your locker clean and follow all usage guidelines</li>
                <li>Clear your locker by the end date stated above</li>
              </ul>
              <p>If you have any questions, please visit the OSAS office.</p>
            </div>
            <div class="footer">
              <p style="color: #dc2626; font-weight: bold;">PLEASE DO NOT REPLY TO THIS EMAIL</p>
              <p>This is an automated notification from the iACADEMY Locker Reservation System.</p>
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

  async sendEndorsementRejectedEmail(email, firstName, referralSlipNo, reason) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: `Endorsement Rejected - ${referralSlipNo}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .info-box { background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Endorsement Rejected</h1>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              <p>We regret to inform you that your locker reservation endorsement has been rejected.</p>
              <div class="info-box">
                <p><strong>Referral Slip No:</strong> ${referralSlipNo}</p>
                <p><strong>Status:</strong> Rejected</p>
                <p><strong>Reason:</strong> ${reason || "No reason provided"}</p>
              </div>
              <p>You may submit a new reservation request if you wish to try again.</p>
              <p>If you have questions about this decision, please visit the OSAS office.</p>
            </div>
            <div class="footer">
              <p style="color: #dc2626; font-weight: bold;">PLEASE DO NOT REPLY TO THIS EMAIL</p>
              <p>This is an automated notification from the iACADEMY Locker Reservation System.</p>
              <p>For assistance, please contact:</p>
              <p><strong>OSAS Office:</strong> osas@iacademy.edu.ph</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendReservationRejectedEmail(email, firstName, referralSlipNo, reason) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: `Reservation Rejected - ${referralSlipNo}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .info-box { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reservation Returned for Review</h1>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              <p>Your locker reservation has been returned to the endorsement queue for further review.</p>
              <div class="info-box">
                <p><strong>Referral Slip No:</strong> ${referralSlipNo}</p>
                <p><strong>Status:</strong> Returned to Endorsement</p>
                <p><strong>Reason:</strong> ${reason || "No reason provided"}</p>
              </div>
              <p>Your reservation will be reviewed again. You will receive an update once a decision is made.</p>
            </div>
            <div class="footer">
              <p style="color: #dc2626; font-weight: bold;">PLEASE DO NOT REPLY TO THIS EMAIL</p>
              <p>This is an automated notification from the iACADEMY Locker Reservation System.</p>
              <p>For assistance, please contact:</p>
              <p><strong>OSAS Office:</strong> osas@iacademy.edu.ph</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendCancellationEmail(email, firstName, referralSlipNo, lockerID) {
    const mailOptions = {
      from: this.fromAddress,
      to: email,
      subject: "Locker Reservation Cancelled - Confirmation",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .info-box { background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reservation Cancelled</h1>
            </div>
            <div class="content">
              <h2>Cancellation Confirmed</h2>
              <p>Dear ${firstName},</p>
              <p>Your locker reservation has been successfully cancelled.</p>
              <div class="info-box">
                <p><strong>Referral Slip No:</strong> ${referralSlipNo}</p>
                <p><strong>Locker ID:</strong> ${lockerID}</p>
                <p><strong>Status:</strong> Cancelled</p>
              </div>
              <p>You may now create a new reservation if needed.</p>
              <p>If you did not request this cancellation, please contact the OSAS office immediately.</p>
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
    };

    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
