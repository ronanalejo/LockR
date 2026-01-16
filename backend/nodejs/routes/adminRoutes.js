const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// Get endorsement queue with filters and pagination
router.get(
  "/reservations/endorsement",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getEndorsementQueue
);

// Endorse a reservation (move from endorsement to approval queue)
router.put(
  "/reservations/:id/endorse",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.endorseReservation
);

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