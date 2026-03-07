const express = require("express");
const router = express.Router();
const LockerSetController = require("../controllers/lockerSetController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware.verifyToken, LockerSetController.getSets);
router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerSetController.createSet,
);
router.put(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerSetController.updateSet,
);
router.delete(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  LockerSetController.deleteSet,
);

module.exports = router;
