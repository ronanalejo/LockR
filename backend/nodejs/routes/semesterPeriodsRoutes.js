const express = require("express");
const router = express.Router();
const controller = require("../controllers/semesterPeriodsController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (any authenticated user)
router.get(
  "/current",
  authMiddleware.verifyToken,
  controller.getCurrentSemester,
);

router.get("/check", authMiddleware.verifyToken, controller.isConfigured);

// Admin-only routes
router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  controller.getAllSemesterPeriods,
);

router.get(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  controller.getSemesterById,
);

router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  controller.createSemesterPeriod,
);

router.put(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  controller.updateSemesterPeriod,
);

router.patch(
  "/:id/status",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  controller.updateSemesterStatus,
);

router.delete(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  controller.deleteSemesterPeriod,
);

module.exports = router;
