const pool = require("../config/database");

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
        r.referralSlipNo,            -- ✅ correct PK
        r.lockerID,
        r.floorNumber,
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
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.employeeID = a.employeeID
      WHERE r.isActive = 1
        AND r.forApproval = 1
        AND r.paymentVerified = 0
      ORDER BY r.approvalDate DESC
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
        r.dropboxReceipt,
        r.pdfPaymentAdviceSlip,
        r.paymentVerifiedAt,
        a.firstName AS verifiedByFirstName,
        a.lastName AS verifiedByLastName
      FROM reservation r
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.verifiedBy = a.employeeID
      WHERE r.isActive = 1
        AND r.paymentVerified = 1
      ORDER BY r.paymentVerifiedAt DESC
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
      [financeEmployeeID, referralSlipNo]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    await connection.commit();

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
        COUNT(*) AS total,
        SUM(paymentVerified = 0 AND isActive = 1) AS pending,
        SUM(paymentVerified = 1 AND isActive = 1) AS verified
      FROM reservation
    `);

    return res.json({
      success: true,
      message: "Finance stats retrieved",
      data: {
        total: Number(stats.total),
        pending: Number(stats.pending),
        verified: Number(stats.verified),
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
