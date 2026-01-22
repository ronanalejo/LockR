const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;

async function generateAgreementPDF(agreementData) {
  let browser = null;

  try {
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
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #333;
            font-size: 24px;
        }
        .header .subtitle {
            margin: 10px 0;
            color: #666;
            font-size: 16px;
            font-weight: bold;
        }
        .header .contact {
            font-size: 10px;
            color: #666;
            margin-top: 10px;
        }
        .form-section {
            margin: 20px 0;
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 5px;
        }
        .field {
            margin: 15px 0;
            display: flex;
            align-items: baseline;
        }
        .field-label {
            font-weight: bold;
            min-width: 180px;
            text-transform: uppercase;
            font-size: 11px;
        }
        .field-value {
            flex: 1;
            border-bottom: 1px solid #333;
            padding-bottom: 2px;
            padding-left: 10px;
        }
        .declaration {
            margin: 25px 0;
            padding: 15px;
            background-color: white;
            border-left: 4px solid #2563eb;
        }
        .declaration p {
            margin: 8px 0;
            line-height: 1.8;
        }
        .rules-section {
            margin-top: 30px;
        }
        .rules-title {
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .rules-list {
            counter-reset: rule-counter;
            list-style: none;
            padding: 0;
        }
        .rules-list > li {
            counter-increment: rule-counter;
            margin-bottom: 15px;
            position: relative;
            padding-left: 35px;
            text-align: justify;
        }
        .rules-list > li:before {
            content: counter(rule-counter) ".";
            position: absolute;
            left: 0;
            font-weight: bold;
        }
        .fee-table {
            margin: 15px 0 15px 0;
            padding: 15px;
            background-color: #f9fafb;
            border-radius: 5px;
            border-left: 3px solid #2563eb;
        }
        .fee-table p {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .fee-table ul {
            list-style-type: disc;
            padding-left: 20px;
            margin: 5px 0 10px 0;
        }
        .fee-table ul li {
            margin: 5px 0;
            font-size: 11px;
        }
        .signature-section {
            margin-top: 40px;
            text-align: right;
            page-break-inside: avoid;
        }
        .signature-box {
            display: inline-block;
            text-align: center;
        }
        .signature-image {
            max-width: 200px;
            max-height: 80px;
            height: auto;
            border: none;
            padding: 0;
            background: transparent;
            margin-bottom: 5px;
            display: block;
        }
        .signature-label {
            font-size: 11px;
            color: #666;
            border-top: 1px solid #333;
            padding-top: 5px;
            min-width: 200px;
            display: block;
        }
        .footer {
            margin-top: 50px;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
            font-size: 10px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>iACADEMY</h1>
        <div class="contact">iACADEMY NEXUS, 7434 Yakal St., Brgy. San Antonio Makati City, Philippines | (02) 8889 5555</div>
        <div class="subtitle">OFFICE OF STUDENT AFFAIRS AND SERVICES</div>
        <div class="subtitle">Application Form and Locker Usage Agreement</div>
    </div>

    <div class="form-section">
        <div class="field">
            <div class="field-label">Name of Student:</div>
            <div class="field-value">${agreementData.studentName}</div>
        </div>
        <div class="field">
            <div class="field-label">Level & Program:</div>
            <div class="field-value">${agreementData.program}</div>
        </div>
        <div class="field">
            <div class="field-label">Locker No and Duration:</div>
            <div class="field-value">${agreementData.lockerID} - ${agreementData.duration}</div>
        </div>
    </div>

    <div class="declaration">
        <p>I applied to use a locker.</p>
        <p>I promise to abide with the rules and regulations on the use of the locker.</p>
        <p>My non-compliance with the rules and regulations will deprive me of use of the iACADEMY student locker next semester, term or school year.</p>
    </div>

    <div class="rules-section">
        <div class="rules-title">Rules and Regulations:</div>
        <ol class="rules-list">
            <li>
                The locker must be used either for one semester/term, or for the
                entire school year, depending on the student's preference.
                Renewal of locker must be at least one week before the end of
                the agreement. The following non-refundable fees apply and must
                be paid in full upon reservation:
                <div class="fee-table">
                  <p>
                    <strong>For One Semester / Term:</strong>
                  </p>
                  <ul>
                    <li>Senior High School (SHS) - Php300.00</li>
                    <li>College - Php250.00</li>
                  </ul>
                  <p>
                    <strong>For the Whole School Year:</strong>
                  </p>
                  <ul>
                    <li>Senior High School (SHS) - Php600.00</li>
                    <li>College - Php600.00</li>
                  </ul>
                </div>
              </li>

              <li>A locker is given to the student upon payment of the fee.</li>

              <li>
                I understand that the locker is only accessible during regular
                school days, before and after each class.
              </li>

              <li>
                I will provide my own lock and issue a duplicate key to the
                Office of Student Affairs and Services (OSAS), or I will provide
                OSAS the number of combinations to unlock keyless locks.
              </li>

              <li>
                I will only use the locker assigned to me and will not share my
                locker with anyone.
              </li>

              <li>
                The owner of the locker has the responsibility to keep the
                locker neat and clean, both inside and outside. Only dry things
                should be kept in the lockers. Food and drinks are strictly
                prohibited. Any damage due to negligence will be charged to the
                student.
              </li>

              <li>
                I understand that the school has no responsibility for loss or
                damage of any item in the locker, locked or unlocked.
              </li>

              <li>
                I am solely responsible for the contents of the locker.
                Inappropriate valuable, illegal or dangerous goods are not to be
                kept in the locker.
              </li>

              <li>
                I will reserve the right for iACADEMY officials to search the
                locker at any time to ensure safety and security of the school
                environment.
              </li>

              <li>
                All lockers should be cleared, left open and empty on the last
                day of the semester/term. All lockers that are kept locked one
                week after the end of the agreement will be opened. Contents of
                the locker will be donated to a charity.
              </li>

              <li>
                I understand that any violation of the terms above will result
                in the revocation of the privelege to use the locker at any
                time.
              </li>

              <li>
                Present Payment Advice Slip to the Finance Office upon payment.
              </li>
        </ol>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <img src="${agreementData.signature}" class="signature-image" alt="Student Signature" />
            <div class="signature-label">Student's Signature</div>
        </div>
    </div>

    <div class="footer">
        <p><strong>Document Reference:</strong> ${agreementData.referralSlipNo}</p>
        <p><strong>Date Signed:</strong> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <p>This is an electronically signed document. For verification, contact OSAS.</p>
    </div>
</body>
</html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "30px",
        bottom: "20px",
        left: "30px",
      },
    });

    await browser.close();

    return pdfBuffer;
  } catch (error) {
    console.error("Agreement PDF Generation Error:", error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

module.exports = { generateAgreementPDF };
