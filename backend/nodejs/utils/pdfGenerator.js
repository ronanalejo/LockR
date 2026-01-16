const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;

async function generatePaymentAdviceSlip(reservation) {
  let browser = null;

  try {
    const outputDir = path.join(
      __dirname,
      "../../uploads/payment-advice-slips"
    );

    await fs.mkdir(outputDir, { recursive: true });

    const filename = `payment-advice-${
      reservation.referralSlipNo
    }-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #333;
        }
        .header h2 {
            margin: 5px 0;
            color: #666;
            font-weight: normal;
        }
        .info-section {
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            margin: 10px 0;
        }
        .info-label {
            font-weight: bold;
            width: 200px;
        }
        .info-value {
            flex: 1;
        }
        .footer {
            margin-top: 50px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>iACADEMY</h1>
        <h2>Payment Advice Slip</h2>
        <p>Locker Reservation System</p>
    </div>

    <div class="info-section">
        <h3>Reservation Details</h3>
        <div class="info-row">
            <div class="info-label">Referral Slip No:</div>
            <div class="info-value">${reservation.referralSlipNo}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Student Name:</div>
            <div class="info-value">${reservation.studentFirstName} ${
      reservation.studentLastName
    }</div>
        </div>
        <div class="info-row">
            <div class="info-label">Student ID:</div>
            <div class="info-value">${reservation.studentID}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Course/Strand:</div>
            <div class="info-value">${reservation.course_strand || "N/A"}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Locker ID:</div>
            <div class="info-value">${reservation.lockerID}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Floor Number:</div>
            <div class="info-value">${reservation.floorNumber}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Agreement:</div>
            <div class="info-value">${reservation.agreement}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Status:</div>
            <div class="info-value">${
              reservation.isActive
                ? "Active"
                : reservation.forApproval
                ? "For Approval"
                : reservation.forEndorsement
                ? "For Endorsement"
                : "Completed"
            }</div>
        </div>
        <div class="info-row">
            <div class="info-label">Date Approved:</div>
            <div class="info-value">${new Date().toLocaleString()}</div>
        </div>
    </div>

    <div class="info-section">
        <h3>Agreement Period</h3>
        <table>
            <tr>
                <th>Start Date</th>
                <th>End Date</th>
            </tr>
            <tr>
                <td>${
                  reservation.agreementDateStart
                    ? new Date(
                        reservation.agreementDateStart
                      ).toLocaleDateString()
                    : "N/A"
                }</td>
                <td>${
                  reservation.agreementDateEnd
                    ? new Date(
                        reservation.agreementDateEnd
                      ).toLocaleDateString()
                    : "N/A"
                }</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>For inquiries, please contact the OSAS office.</p>
    </div>
</body>
</html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    return `payment-advice-slips/${filename}`;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

module.exports = { generatePaymentAdviceSlip };
