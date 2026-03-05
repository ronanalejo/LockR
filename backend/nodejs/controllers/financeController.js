const pool = require("../config/database");
const socketService = require("../services/socketService");

const formatSuccess = (data, message = "Success") => ({
  success: true,
  message,
  data,
});

const formatError = (message) => ({
  success: false,
  message,
});

exports.getPendingPayments = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        r.referralSlipNo,
        r.lockerID,
        r.floorNumber,
        s.firstName AS studentFirstName,
        s.lastName AS studentLastName,
        r.agreement,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.pdfPaymentAdviceSlip,
        r.pdfPaymentAdviceSlipFinance,
        r.dropboxReceipt,
        r.proofOfPayment,
        a.firstName AS endorsedByFirstName,
        a.lastName AS endorsedByLastName
      FROM reservation r
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.employeeID = a.employeeID
      WHERE r.forApproval = TRUE
        AND r.forEndorsement = FALSE
      ORDER BY r.updatedAt DESC
    `);

    return res.json({
      success: true,
      message: "Pending payments retrieved",
      data: rows,
    });
  } catch (err) {
    console.error("getPendingPayments:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load pending payments",
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
        r.referralSlipNo,
        r.lockerID,
        r.floorNumber,
        s.firstName AS studentFirstName,
        s.lastName AS studentLastName,
        r.agreement,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.pdfPaymentAdviceSlip,
        r.pdfPaymentAdviceSlipFinance,
        r.dropboxReceipt,
        r.proofOfPayment,
        r.paymentVerified,
        r.paymentVerifiedAt,
        endorsed.firstName AS endorsedByFirstName,
        endorsed.lastName AS endorsedByLastName,
        verified.firstName AS verifiedByFirstName,
        verified.lastName AS verifiedByLastName
      FROM reservation r
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin endorsed ON r.employeeID = endorsed.employeeID
      LEFT JOIN admin verified ON r.verifiedBy = verified.employeeID
      WHERE r.isActive = TRUE
      ORDER BY r.updatedAt DESC
    `);

    return res.json({
      success: true,
      message: "Payment history retrieved",
      data: rows,
    });
  } catch (err) {
    console.error("getPaymentHistory:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load payment history",
    });
  }
};

/**
 * POST /api/finance/payments/:id/verify
 */
exports.verifyPayment = async (req, res) => {
  const referralSlipNo = req.params.id;
  const financeEmployeeID = req.user.id; // ✅ correct source
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      UPDATE reservation
      SET
        paymentVerified = 1,
        paymentVerifiedAt = NOW(),
        verifiedBy = ?
      WHERE referralSlipNo = ?
      `,
      [financeEmployeeID, referralSlipNo],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    // Audit trail logging
    await connection.execute(
      `
      INSERT INTO audit_log (action, tableName, recordID, performedBy, details, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [
        "PAYMENT_VERIFIED",
        "reservation",
        referralSlipNo,
        financeEmployeeID,
        JSON.stringify({
          referralSlipNo,
          action: "Payment verified by Finance",
        }),
      ],
    );

    await connection.commit();

    socketService.emitReservationUpdate("payment-verified", {
      referralSlipNo,
    });

    return res.json({
      success: true,
      message: "Payment successfully verified",
    });
  } catch (err) {
    await connection.rollback();
    console.error("verifyPayment:", err);

    return res.status(500).json({
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
        SUM(CASE WHEN forApproval = TRUE AND forEndorsement = FALSE THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) AS verified
      FROM reservation
      WHERE (forApproval = TRUE AND forEndorsement = FALSE) OR isActive = TRUE
    `);

    return res.json({
      success: true,
      message: "Finance stats retrieved",
      data: {
        pending: Number(stats.pending) || 0,
        verified: Number(stats.verified) || 0,
      },
    });
  } catch (err) {
    console.error("getFinanceStats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load finance stats",
    });
  }
};
