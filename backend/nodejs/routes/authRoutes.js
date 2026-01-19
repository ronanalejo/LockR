const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/complete-registration", authController.completeRegistration);
router.get("/branches", authController.getBranches);

module.exports = router;
