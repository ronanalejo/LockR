const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;

// Pricing structure
const PRICING = {
  "1 Semester/Term": {
    SHS: 300,
    College: 250,
  },
  "1 School Year": {
    SHS: 600,
    College: 600,
  },
  "2 Semesters/Terms": {
    SHS: 600,
    College: 500,
  },
};

function calculatePaymentAmount(agreement, studentType) {
  const normalizedType =
    studentType?.toUpperCase() === "SHS" ? "SHS" : "College";
  const pricing = PRICING[agreement];
  if (!pricing) {
    return normalizedType === "SHS" ? 300 : 250;
  }
  return pricing[normalizedType];
}

async function generatePaymentAdviceSlipWithCopy(reservation) {
  let browser = null;

  try {
    const outputDir = path.join(
      __dirname,
      "../../uploads/payment-advice-slips",
    );
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = Date.now();
    const studentFilename = `${reservation.referralSlipNo} - Payment Advice Slip - Student - ${timestamp}.pdf`;
    const osasFilename = `${reservation.referralSlipNo} - Payment Advice Slip - OSAS - ${timestamp}.pdf`;
    const studentOutputPath = path.join(outputDir, studentFilename);
    const osasOutputPath = path.join(outputDir, osasFilename);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const studentType = reservation.student_type || "College";
    const amount = calculatePaymentAmount(reservation.agreement, studentType);
    const paymentMethod = reservation.modeOfPayment || "Not specified";
    const accountNumber = reservation.accountNumber || "N/A";

    // Generate Student Copy
    const studentHtml = generatePaymentAdviceHTML(
      reservation,
      amount,
      paymentMethod,
      accountNumber,
      "Student's Copy",
    );
    await page.setContent(studentHtml, { waitUntil: "networkidle0" });
    await page.pdf({
      path: studentOutputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    // Read student copy buffer for email attachment
    const studentCopyBuffer = await fs.readFile(studentOutputPath);

    // Generate OSAS Copy
    const osasHtml = generatePaymentAdviceHTML(
      reservation,
      amount,
      paymentMethod,
      accountNumber,
      "OSAS Copy",
    );
    await page.setContent(osasHtml, { waitUntil: "networkidle0" });
    await page.pdf({
      path: osasOutputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    await browser.close();

    return {
      studentCopyPath: `payment-advice-slips/${studentFilename}`,
      osasCopyPath: `payment-advice-slips/${osasFilename}`,
      studentCopyBuffer: studentCopyBuffer,
    };
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

function generatePaymentAdviceHTML(
  reservation,
  amount,
  paymentMethod,
  accountNumber,
  copyLabel,
) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
            position: relative;
            min-height: 100vh;
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
        .amount-row {
            font-weight: bold;
            background-color: #e8f5e9;
        }
        .amount-row td {
            font-size: 1.1em;
        }
        .payment-section {
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
        }
        .payment-section h3 {
            margin-top: 0;
            color: #333;
        }
        .copy-label {
            position: absolute;
            bottom: 40px;
            right: 40px;
            font-size: 14px;
            font-weight: bold;
            color: #666;
            border: 2px solid #666;
            padding: 8px 16px;
            border-radius: 4px;
        }
        .footer {
            margin-top: 50px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
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
            <div class="info-value">${reservation.studentFirstName || ""} ${reservation.studentLastName || ""}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Student Type:</div>
            <div class="info-value">${reservation.student_type || "College"}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Locker ID:</div>
            <div class="info-value">${reservation.lockerID}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Floor Number:</div>
            <div class="info-value">${reservation.floorNumber}</div>
        </div>
    </div>

    <div class="info-section">
        <h3>Payment Information</h3>
        <table>
            <tr>
                <th>Description</th>
                <th>Duration</th>
                <th>Amount</th>
            </tr>
            <tr>
                <td>Locker Rental Fee</td>
                <td>${reservation.agreement}</td>
                <td>Php ${amount.toFixed(2)}</td>
            </tr>
            <tr class="amount-row">
                <td colspan="2"><strong>Total Amount Payable</strong></td>
                <td><strong>Php ${amount.toFixed(2)}</strong></td>
            </tr>
        </table>
    </div>

    <div class="payment-section">
        <h3>Payment Method</h3>
        <div class="info-row">
            <div class="info-label">Mode of Payment:</div>
            <div class="info-value">${paymentMethod}</div>
        </div>
        ${
          paymentMethod.toLowerCase() !== "cash"
            ? `
        <div class="info-row">
            <div class="info-label">Account Number:</div>
            <div class="info-value">${accountNumber}</div>
        </div>
        `
            : ""
        }
    </div>

    <div class="info-section">
        <h3>Agreement Period</h3>
        <table>
            <tr>
                <th>Start Date</th>
                <th>End Date</th>
            </tr>
            <tr>
                <td>${reservation.agreementDateStart ? new Date(reservation.agreementDateStart).toLocaleDateString() : "To be determined"}</td>
                <td>${reservation.agreementDateEnd ? new Date(reservation.agreementDateEnd).toLocaleDateString() : "To be determined"}</td>
            </tr>
        </table>
    </div>

    <div class="copy-label">${copyLabel}</div>

    <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Present this Payment Advice Slip to the Finance Office upon payment.</p>
        <p>For inquiries, please contact the OSAS office.</p>
    </div>
</body>
</html>
  `;
}

// Keep the original function for backward compatibility
async function generatePaymentAdviceSlip(reservation) {
  const result = await generatePaymentAdviceSlipWithCopy(reservation);
  return result.studentCopyPath;
}

module.exports = {
  generatePaymentAdviceSlip,
  generatePaymentAdviceSlipWithCopy,
  calculatePaymentAmount,
};
