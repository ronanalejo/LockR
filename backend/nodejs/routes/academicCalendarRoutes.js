const express = require("express");
const router = express.Router();

const {
  getCurrentCalendar,
  createCalendar,
  updateCalendar,
  isConfigured,
} = require("../controllers/academicCalendarController");

const { verifyToken, isAdmin } = require("../middleware/authMiddleWare");

router.get("/", verifyToken, isAdmin, getCurrentCalendar);
router.post("/", verifyToken, isAdmin, createCalendar);
router.put("/", verifyToken, isAdmin, updateCalendar);
router.get("/check", verifyToken, isConfigured);

module.exports = router;
