const express = require("express");
const router = express.Router();
const LockerController = require("../controllers/lockerController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Locker Routes
 * All routes are protected with authentication middleware
 * IMPORTANT: Specific routes must come BEFORE parameterized routes
 */

// GET /api/lockers/available - Fetch all available lockers (must be before /:lockerID)
router.get(
  "/available",
  authMiddleware.verifyToken,
  LockerController.getAvailableLockers,
);

// GET /api/lockers/floor/:floorNumber - Fetch lockers by specific floor (must be before /:lockerID)
router.get(
  "/floor/:floorNumber",
  authMiddleware.verifyToken,
  LockerController.getLockersByFloor,
);

// PUT /api/lockers/:lockerID/status - Update locker status (admin only) (must be before /:lockerID)
router.put(
  "/:lockerID/status",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerController.updateLockerStatus,
);

// GET /api/lockers/:lockerID - Fetch single locker details (general route, comes after specific ones)
router.get(
  "/:lockerID",
  authMiddleware.verifyToken,
  LockerController.getLockerById,
);

// GET /api/lockers - Fetch all lockers with filters (root route comes last)
router.get("/", authMiddleware.verifyToken, LockerController.getAllLockers);

// POST /api/lockers - Create a new locker (admin only)
router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerController.createLocker,
);

// DELETE /api/lockers/:lockerID - Delete a locker (admin only)
router.delete(
  "/:lockerID",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerController.deleteLocker,
);

module.exports = router;
