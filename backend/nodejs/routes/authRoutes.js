const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/complete-registration", authController.completeRegistration);
router.get("/branches", authController.getBranches);
router.get("/me", authMiddleware.verifyToken, authController.getMe);

module.exports = router;
