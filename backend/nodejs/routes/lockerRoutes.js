const express = require("express");
const router = express.Router();
const LockerController = require("../controllers/lockerController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Locker Routes
 * All routes are protected with authentication middleware
 */

// GET /api/lockers/available - Fetch all available lockers
router.get("/available", authMiddleware.verifyToken, LockerController.getAvailableLockers);

// GET /api/lockers/floor/:floorNumber - Fetch lockers by specific floor
router.get("/floor/:floorNumber", authMiddleware.verifyToken, LockerController.getLockersByFloor);

// GET /api/lockers/:lockerID - Fetch single locker details
router.get("/:lockerID", authMiddleware.verifyToken, LockerController.getLockerById);

// GET /api/lockers - Fetch all lockers with filters
router.get("/", authMiddleware.verifyToken, LockerController.getAllLockers);

// PUT /api/lockers/:lockerID/status - Update locker status (admin only)
router.put(
  "/:lockerID/status",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerController.updateLockerStatus
);

// POST /api/lockers - Create a new locker (admin only)
router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerController.createLocker
);

// DELETE /api/lockers/:lockerID - Delete a locker (admin only)
router.delete(
  "/:lockerID",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerController.deleteLocker
);

module.exports = router;