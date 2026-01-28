
// backend/nodejs/controllers/financeController.js

exports.getPendingPayments = async (req, res) => {
  try {
    // TEMP: return empty array so frontend + Postman work
    res.status(200).json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    res.status(200).json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;

    res.status(200).json({
      success: true,
      paymentId: id,
      message: "Payment verified (stub)",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFinanceStats = async (req, res) => {
  try {
    res.status(200).json({
      totalReservations: 0,
      pendingPayments: 0,
      verifiedPayments: 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
