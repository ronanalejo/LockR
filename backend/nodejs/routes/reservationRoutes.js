const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const authMiddleware = require("../middleware/authMiddleWare");

router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isStudent,
  reservationController.createReservation
);

router.get(
  "/:id",
  authMiddleware.verifyToken,
  reservationController.getReservationById
);

router.put(
  "/:id",
  authMiddleware.verifyToken,
  reservationController.updateReservation
);

router.get(
  "/students/:studentID/reservations",
  authMiddleware.verifyToken,
  reservationController.getStudentReservations
);

module.exports = router;
