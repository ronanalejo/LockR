const express = require("express");
const router = express.Router();

const financeController = require("../controllers/financeController");
const authMiddleware = require("../middleware/authMiddleWare");

// ==============================
// Finance Payment Routes
// Base path: /api/finance
// ==============================

// GET /api/finance/payments/pending
router.get(
  "/payments/pending",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.getPendingPayments
);

// GET /api/finance/payments/history
router.get(
  "/payments/history",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.getPaymentHistory
);

// POST /api/finance/payments/:id/verify
router.post(
  "/payments/:id/verify",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.verifyPayment
);

// GET /api/finance/stats
router.get(
  "/stats",
  authMiddleware.verifyToken,
  authMiddleware.isFinance,
  financeController.getFinanceStats
);

module.exports = router;
