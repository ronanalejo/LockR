const pool = require("../config/database");
const socketService = require("../services/socketService");
const LockerModel = require("../models/lockerModel");

/**
 * Request handlers for locker operations
 */

const LockerController = {
  /**
   * GET /api/lockers/available
   * Fetch all available lockers with pagination
   */
  async getAvailableLockers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid pagination parameters. Page limit must be between 1 and 100.",
        });
      }

      const lockers = await LockerModel.getAvailableLockers(limit, offset);
      const totalCount = await LockerModel.getLockerCount({
        status: "Available",
      });
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          lockers,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error in getAvailableLockers:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch available lockers",
        message: error.message,
      });
    }
  },

  /**
   * GET /api/lockers/floor/:floorNumber
   * Fetch lockers by specific floor with optional status filter
   */
  async getLockersByFloor(req, res) {
    try {
      const floorNumber = req.params.floorNumber; // Keep as string
      const status = req.query.status; // Optional status filter
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // validate floor number (must be 6, 7, 9, or 10)
      const validFloors = ["6", "7", "9", "10"];
      if (!validFloors.includes(floorNumber)) {
        return res.status(400).json({
          success: false,
          error: "Invalid floor number. Must be one of: 6, 7, 9, 10.",
        });
      }

      // validate floor number
      if (isNaN(floorNumber)) {
        return res.status(400).json({
          success: false,
          error: "Invalid floor number. Must be a valid integer.",
        });
      }

      // validate status if provided
      const validStatuses = [
        "Available",
        "Occupied",
        "Reserved",
        "Unavailable",
      ];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}.`,
        });
      }

      // validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid pagination parameters. Page limit must be between 1 and 100.",
        });
      }

      const lockers = await LockerModel.getLockersByFloor(
        floorNumber,
        status,
        limit,
        offset,
      );

      // get total count for this floor
      const filters = { floorNumber };
      if (status) filters.status = status;
      const totalCount = await LockerModel.getLockerCount(filters);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          floorNumber,
          lockers,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error in getLockersByFloor:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch lockers by floor.",
        message: error.message,
      });
    }
  },

  /**
   * GET /api/lockers/:lockerID
   * Fetch single locker details
   */
  async getLockerById(req, res) {
    try {
      const lockerID = req.params.lockerID; // Keep as string, not parseInt

      // validate locker ID format (should be like L6-001)
      if (!lockerID || lockerID.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Invalid locker ID. Locker ID is required.",
        });
      }

      const locker = await LockerModel.getLockerById(lockerID);

      if (!locker) {
        return res.status(404).json({
          success: false,
          error: "Locker not found.",
          message: `No locker found with ID: ${lockerID}.`,
        });
      }

      res.json({
        success: true,
        data: {
          locker,
        },
      });
    } catch (error) {
      console.error("Error in getLockerById:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch locker details.",
        message: error.message,
      });
    }
  },

  /**
   * GET /api/lockers
   * Fetch all lockers with optional filters and pagination
   */
  async getAllLockers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // build filters object
      const filters = {};
      if (req.query.status) {
        const validStatuses = [
          "Available",
          "Occupied",
          "Reserved",
          "Unavailable",
        ];
        if (!validStatuses.includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(
              ", ",
            )}.`,
          });
        }
        filters.status = req.query.status;
      }

      if (req.query.branchID) {
        const branchID = parseInt(req.query.branchID);
        if (isNaN(branchID)) {
          return res.status(400).json({
            success: false,
            error: "Invalid branchID. Must be a valid integer.",
          });
        }
        filters.branchID = branchID;
      }

      if (req.query.floorNumber) {
        const floorNumber = parseInt(req.query.floorNumber);
        if (isNaN(floorNumber)) {
          return res.status(400).json({
            success: false,
            error: "Invalid floorNumber. Must be a valid integer.",
          });
        }
        filters.floorNumber = floorNumber;
      }

      // validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100.",
        });
      }

      const lockers = await LockerModel.getAllLockers(filters, limit, offset);
      const totalCount = await LockerModel.getLockerCount(filters);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          lockers,
          filters,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error in getAllLockers:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch lockers.",
        message: error.message,
      });
    }
  },

  /**
   * PUT /api/lockers/:lockerID/status
   * Update locker status
   */
  async updateLockerStatus(req, res) {
    try {
      const lockerID = req.params.lockerID; // Keep as string
      const { status } = req.body;

      // validate locker ID
      if (!lockerID || lockerID.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Invalid locker ID. Locker ID is required.",
        });
      }

      // validate status
      const validStatuses = [
        "Available",
        "Occupied",
        "Reserved",
        "Unavailable",
      ];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}.`,
        });
      }

      // check if locker exists
      const existingLocker = await LockerModel.getLockerById(lockerID);
      if (!existingLocker) {
        return res.status(404).json({
          success: false,
          error: "Locker not found.",
          message: `No locker found with ID: ${lockerID}.`,
        });
      }

      const updatedLocker = await LockerModel.updateLockerStatus(
        lockerID,
        status,
      );

      res.json({
        success: true,
        message: "Locker status updated successfully.",
        data: {
          locker: updatedLocker,
        },
      });
    } catch (error) {
      console.error("Error in updateLockerStatus:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update locker status.",
        message: error.message,
      });
    }
  },

  /**
   * POST /api/lockers
   * Create a new locker
   */
  async createLocker(req, res) {
    try {
      const { branchID, floorNumber, status } = req.body;

      // validate required fields
      if (!branchID || floorNumber === undefined) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: branchID and floorNumber are required.",
        });
      }

      // validate status if provided
      if (status) {
        const validStatuses = [
          "Available",
          "Occupied",
          "Reserved",
          "Unavailable",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(
              ", ",
            )}.`,
          });
        }
      }

      const newLocker = await LockerModel.createLocker({
        branchID,
        floorNumber,
        status: status || "Available",
      });

      res.status(201).json({
        success: true,
        message: "Locker created successfully.",
        data: {
          locker: newLocker,
        },
      });
    } catch (error) {
      console.error("Error in createLocker:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create locker.",
        message: error.message,
      });
    }
  },

  /**
   * DELETE /api/lockers/:lockerID
   * Delete a locker
   */
  async updateLocker(req, res) {
    const connection = await pool.getConnection();
    try {
      const lockerID = req.params.lockerID;
      const { floorNumber, status } = req.body;

      if (!lockerID || lockerID.trim() === "") {
        return res
          .status(400)
          .json({ success: false, error: "Locker ID is required." });
      }

      const validFloors = ["6", "7", "9", "10"];
      const validStatuses = [
        "Available",
        "Reserved",
        "Unavailable",
        "Occupied",
      ];
      if (floorNumber && !validFloors.includes(String(floorNumber))) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid floor number." });
      }
      if (status && !validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid status." });
      }

      const existingLocker = await LockerModel.getLockerById(lockerID);
      if (!existingLocker) {
        return res
          .status(404)
          .json({ success: false, error: "Locker not found." });
      }

      await connection.beginTransaction();

      if (existingLocker.status === "Reserved") {
        const [reservations] = await connection.query(
          `SELECT referralSlipNo FROM reservation WHERE lockerID = ? AND (forEndorsement = 1 OR forApproval = 1) LIMIT 1`,
          [lockerID],
        );
        if (reservations.length > 0) {
          await connection.query(
            `UPDATE reservation SET forEndorsement = 0, forApproval = 0, isActive = 0 WHERE referralSlipNo = ?`,
            [reservations[0].referralSlipNo],
          );
          socketService.emitReservationUpdate("reservation-rejected", {
            referralSlipNo: reservations[0].referralSlipNo,
          });
        }
      }

      const fields = [];
      const values = [];
      if (floorNumber) {
        fields.push("floorNumber = ?");
        values.push(String(floorNumber));
      }
      if (status) {
        fields.push("status = ?");
        values.push(status);
      }
      fields.push("updatedAt = CURRENT_TIMESTAMP");
      values.push(lockerID);

      await connection.query(
        `UPDATE locker SET ${fields.join(", ")} WHERE lockerID = ?`,
        values,
      );
      await connection.commit();

      const updatedLocker = await LockerModel.getLockerById(lockerID);
      socketService.emitLockerUpdate("locker-update", { lockerID });

      res.json({
        success: true,
        message: "Locker updated successfully.",
        data: { locker: updatedLocker },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error in updateLocker:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to update locker.",
          message: error.message,
        });
    } finally {
      connection.release();
    }
  },

  async deleteLocker(req, res) {
    const connection = await pool.getConnection();
    try {
      const lockerID = req.params.lockerID;

      if (!lockerID || lockerID.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Invalid locker ID. Locker ID is required.",
        });
      }

      const existingLocker = await LockerModel.getLockerById(lockerID);
      if (!existingLocker) {
        return res.status(404).json({
          success: false,
          error: "Locker not found.",
          message: `No locker found with ID: ${lockerID}.`,
        });
      }

      await connection.beginTransaction();

      if (existingLocker.status === "Reserved") {
        const [reservations] = await connection.query(
          `SELECT referralSlipNo FROM reservation WHERE lockerID = ? AND (forEndorsement = 1 OR forApproval = 1) LIMIT 1`,
          [lockerID],
        );
        if (reservations.length > 0) {
          await connection.query(
            `UPDATE reservation SET forEndorsement = 0, forApproval = 0, isActive = 0 WHERE referralSlipNo = ?`,
            [reservations[0].referralSlipNo],
          );
          socketService.emitReservationUpdate("reservation-rejected", {
            referralSlipNo: reservations[0].referralSlipNo,
          });
        }
      }

      await connection.query("DELETE FROM locker WHERE lockerID = ?", [
        lockerID,
      ]);
      await connection.commit();

      socketService.emitLockerUpdate("locker-update", { lockerID });

      res.json({
        success: true,
        message: "Locker deleted successfully.",
        data: {
          lockerID,
        },
      });
    } catch (error) {
      console.error("Error in deleteLocker:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete locker.",
        message: error.message,
      });
    }
  },
};

module.exports = LockerController;
