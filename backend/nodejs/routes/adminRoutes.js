const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/reservations/approval",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getReservationsForApproval
);

router.put(
  "/reservations/:id/approve",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.approveReservation
);

router.put(
  "/reservations/:id/reject",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.rejectReservation
);

module.exports = router;
