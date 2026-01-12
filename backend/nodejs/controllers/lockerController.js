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
          error: "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100",
        });
      }

      const lockers = await LockerModel.getAvailableLockers(limit, offset);
      const totalCount = await LockerModel.getLockerCount({ status: "available" });
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
      const floorNumber = parseInt(req.params.floorNumber);
      const status = req.query.status; // Optional status filter
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // validate floor number
      if (isNaN(floorNumber)) {
        return res.status(400).json({
          success: false,
          error: "Invalid floor number. Must be a valid integer",
        });
      }

      // validate status if provided
      const validStatuses = ["available", "occupied", "reserved", "unavailable"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      // validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100",
        });
      }

      const lockers = await LockerModel.getLockersByFloor(
        floorNumber,
        status,
        limit,
        offset
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
        error: "Failed to fetch lockers by floor",
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
      const lockerID = parseInt(req.params.lockerID);

      // validate locker ID
      if (isNaN(lockerID)) {
        return res.status(400).json({
          success: false,
          error: "Invalid locker ID. Must be a valid integer",
        });
      }

      const locker = await LockerModel.getLockerById(lockerID);

      if (!locker) {
        return res.status(404).json({
          success: false,
          error: "Locker not found",
          message: `No locker found with ID: ${lockerID}`,
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
        error: "Failed to fetch locker details",
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
        const validStatuses = ["available", "occupied", "reserved", "unavailable"];
        if (!validStatuses.includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          });
        }
        filters.status = req.query.status;
      }

      if (req.query.branchID) {
        const branchID = parseInt(req.query.branchID);
        if (isNaN(branchID)) {
          return res.status(400).json({
            success: false,
            error: "Invalid branchID. Must be a valid integer",
          });
        }
        filters.branchID = branchID;
      }

      if (req.query.floorNumber) {
        const floorNumber = parseInt(req.query.floorNumber);
        if (isNaN(floorNumber)) {
          return res.status(400).json({
            success: false,
            error: "Invalid floorNumber. Must be a valid integer",
          });
        }
        filters.floorNumber = floorNumber;
      }

      // validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100",
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
        error: "Failed to fetch lockers",
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
      const lockerID = parseInt(req.params.lockerID);
      const { status } = req.body;

      // validate locker ID
      if (isNaN(lockerID)) {
        return res.status(400).json({
          success: false,
          error: "Invalid locker ID. Must be a valid integer",
        });
      }

      // validate status
      const validStatuses = ["available", "occupied", "reserved", "unavailable"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      // check if locker exists
      const existingLocker = await LockerModel.getLockerById(lockerID);
      if (!existingLocker) {
        return res.status(404).json({
          success: false,
          error: "Locker not found",
          message: `No locker found with ID: ${lockerID}`,
        });
      }

      const updatedLocker = await LockerModel.updateLockerStatus(lockerID, status);

      res.json({
        success: true,
        message: "Locker status updated successfully",
        data: {
          locker: updatedLocker,
        },
      });
    } catch (error) {
      console.error("Error in updateLockerStatus:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update locker status",
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
          error: "Missing required fields: branchID and floorNumber are required",
        });
      }

      // validate status if provided
      if (status) {
        const validStatuses = ["available", "occupied", "reserved", "unavailable"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          });
        }
      }

      const newLocker = await LockerModel.createLocker({
        branchID,
        floorNumber,
        status: status || "available",
      });

      res.status(201).json({
        success: true,
        message: "Locker created successfully",
        data: {
          locker: newLocker,
        },
      });
    } catch (error) {
      console.error("Error in createLocker:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create locker",
        message: error.message,
      });
    }
  },

  /**
   * DELETE /api/lockers/:lockerID
   * Delete a locker
   */
  async deleteLocker(req, res) {
    try {
      const lockerID = parseInt(req.params.lockerID);

      // validate locker ID
      if (isNaN(lockerID)) {
        return res.status(400).json({
          success: false,
          error: "Invalid locker ID. Must be a valid integer",
        });
      }

      // check if locker exists
      const existingLocker = await LockerModel.getLockerById(lockerID);
      if (!existingLocker) {
        return res.status(404).json({
          success: false,
          error: "Locker not found",
          message: `No locker found with ID: ${lockerID}`,
        });
      }

      await LockerModel.deleteLocker(lockerID);

      res.json({
        success: true,
        message: "Locker deleted successfully",
        data: {
          lockerID,
        },
      });
    } catch (error) {
      console.error("Error in deleteLocker:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete locker",
        message: error.message,
      });
    }
  },
};

module.exports = LockerController;