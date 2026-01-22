const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// Endorsement Queue Endpoints
router.get(
  "/endorsements/pending",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getReservationsForEndorsement,
);

router.post(
  "/endorsements/:id/approve",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.approveEndorsement,
);

router.post(
  "/endorsements/:id/reject",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.rejectEndorsement,
);

// Approval Queue Endpoints
router.get(
  "/reservations/pending",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getReservationsForApproval,
);

router.get(
  "/reservations/approval",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getReservationsForApproval,
);

router.post(
  "/reservations/:id/approve",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.approveReservation,
);

router.post(
  "/reservations/:id/reject",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.rejectReservation,
);

// Reservation Management
router.get(
  "/reservations",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getAllReservations,
);

router.post(
  "/reservations/:id/cancel",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.cancelReservation,
);

// Occupied Lockers Endpoint
router.get(
  "/reservations/occupied",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getOccupiedLockers,
);

// Reservation History Endpoint
router.get(
  "/reservations/history",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  adminController.getReservationHistory,
);

module.exports = router;
