const express = require("express");
const router = express.Router();
const controller = require("../controllers/semesterPeriodsController");

router.get("/", controller.getAllSemesterPeriods);
router.get("/current", controller.getCurrentSemester);
router.get("/check", controller.isConfigured);
router.get("/:id", controller.getSemesterById);

router.post("/", controller.createSemesterPeriod);
router.put("/:id", controller.updateSemesterPeriod);
router.patch("/:id/status", controller.updateSemesterStatus);
router.delete("/:id", controller.deleteSemesterPeriod);

module.exports = router;
