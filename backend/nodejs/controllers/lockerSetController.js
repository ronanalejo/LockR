const LockerSetModel = require("../models/lockerSetModel");

const VALID_FLOORS = ["6", "7", "9", "10"];
const VALID_WINGS = ["Left Wing", "Right Wing"];

const LockerSetController = {
  async getSets(req, res) {
    try {
      const { floorNumber, wing } = req.query;
      if (!floorNumber || !VALID_FLOORS.includes(floorNumber)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid floor number." });
      }
      if (!wing || !VALID_WINGS.includes(wing)) {
        return res.status(400).json({ success: false, error: "Invalid wing." });
      }
      const sets = await LockerSetModel.getSetsByFloorAndWing(
        floorNumber,
        wing,
      );
      res.json({ success: true, data: sets });
    } catch (error) {
      console.error("getSets error:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to fetch sets.",
          message: error.message,
        });
    }
  },

  async createSet(req, res) {
    try {
      const { floorNumber, wing, setName } = req.body;
      if (!floorNumber || !VALID_FLOORS.includes(String(floorNumber))) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid floor number." });
      }
      if (!wing || !VALID_WINGS.includes(wing)) {
        return res.status(400).json({ success: false, error: "Invalid wing." });
      }
      if (
        !setName ||
        typeof setName !== "string" ||
        setName.length !== 1 ||
        !/^[a-zA-Z]$/.test(setName)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Set name must be a single letter (A-Z).",
          });
      }
      const newSet = await LockerSetModel.createSet({
        floorNumber: String(floorNumber),
        wing,
        setName: setName.toUpperCase(),
      });
      res.status(201).json({ success: true, data: newSet });
    } catch (error) {
      console.error("createSet error:", error);
      if (
        error.message.includes("ER_DUP_ENTRY") ||
        error.message.includes("Duplicate")
      ) {
        return res
          .status(409)
          .json({
            success: false,
            error:
              "A set with this name already exists for this floor and wing.",
          });
      }
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to create set.",
          message: error.message,
        });
    }
  },

  async updateSet(req, res) {
    try {
      const { id } = req.params;
      const { setName } = req.body;
      if (
        !setName ||
        typeof setName !== "string" ||
        setName.length !== 1 ||
        !/^[a-zA-Z]$/.test(setName)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Set name must be a single letter (A-Z).",
          });
      }
      const existing = await LockerSetModel.getSetById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Set not found." });
      }
      const updated = await LockerSetModel.updateSet(id, setName.toUpperCase());
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("updateSet error:", error);
      if (
        error.message.includes("ER_DUP_ENTRY") ||
        error.message.includes("Duplicate")
      ) {
        return res
          .status(409)
          .json({
            success: false,
            error:
              "A set with this name already exists for this floor and wing.",
          });
      }
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to update set.",
          message: error.message,
        });
    }
  },

  async deleteSet(req, res) {
    try {
      const { id } = req.params;
      const deleted = await LockerSetModel.deleteSet(id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, error: "Set not found." });
      }
      res.json({ success: true, message: "Set deleted successfully." });
    } catch (error) {
      console.error("deleteSet error:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to delete set.",
          message: error.message,
        });
    }
  },
};

module.exports = LockerSetController;
