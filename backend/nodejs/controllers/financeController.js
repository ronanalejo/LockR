const pool = require("../config/database");

/**
 * GET /api/finance/payments/pending
 */
exports.getPendingPayments = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        r.reservationID,
        r.referralSlipNo,
        r.lockerID,
        l.floorNumber,
        s.firstName AS studentFirstName,
        s.lastName AS studentLastName,
        r.agreement,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.dropboxReceipt,
        r.pdfPaymentAdviceSlip,
        a.firstName AS endorsedByFirstName,
        a.lastName AS endorsedByLastName
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.employeeID = a.employeeID
      WHERE r.isActive = TRUE
        AND r.paymentVerified = FALSE
      ORDER BY r.approvalDate DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getPendingPayments error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending payments",
    });
  }
};

/**
 * GET /api/finance/payments/history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        r.reservationID,
        r.referralSlipNo,
        r.lockerID,
        l.floorNumber,
        s.firstName AS studentFirstName,
        s.lastName AS studentLastName,
        r.agreement,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.dropboxReceipt,
        r.pdfPaymentAdviceSlip,
        r.paymentVerifiedAt,
        f.firstName AS verifiedByFirstName,
        f.lastName AS verifiedByLastName
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin f ON r.verifiedBy = f.employeeID
      WHERE r.paymentVerified = TRUE
      ORDER BY r.paymentVerifiedAt DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getPaymentHistory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
};

/**
 * POST /api/finance/payments/:id/verify
 */
exports.verifyPayment = async (req, res) => {
  const reservationId = req.params.id;
  const financeEmployeeId = req.user.employeeID;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE reservation
      SET
        paymentVerified = TRUE,
        paymentVerifiedAt = NOW(),
        verifiedBy = ?
      WHERE reservationID = ?
      `,
      [financeEmployeeId, reservationId]
    );

    await connection.execute(
      `
      INSERT INTO audit_logs (employeeID, action, createdAt)
      VALUES (?, ?, NOW())
      `,
      [
        financeEmployeeId,
        `Verified payment for reservation ${reservationId}`,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Payment successfully verified",
    });
  } catch (err) {
    await connection.rollback();
    console.error("verifyPayment error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/finance/stats
 */
exports.getFinanceStats = async (req, res) => {
  try {
    const [[stats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(paymentVerified = FALSE) AS pending,
        SUM(paymentVerified = TRUE) AS verified
      FROM reservation
      WHERE isActive = TRUE
    `);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("getFinanceStats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance stats",
    });
  }
};
