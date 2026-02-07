const express = require("express");
const router = express.Router();

const financeController = require("../controllers/financeController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/payments/pending",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.getPendingPayments,
);

router.get(
  "/payments/history",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.getPaymentHistory,
);

router.post(
  "/payments/:id/verify",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.verifyPayment,
);

router.get(
  "/stats",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.getFinanceStats,
);

module.exports = router;
