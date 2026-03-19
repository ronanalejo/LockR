const db = require("../config/database");

/**
 * Database query functions for locker operations
 */

const LockerModel = {
  /**
   * gets all available lockers with optional filtering and pagination
   * @param {Object} filters - filter options (status, branchID, floorNumber)
   * @param {Number} limit - number of records per page
   * @param {Number} offset - starting point for pagination
   * @returns {Promise<Array>} array of locker objects
   */
  async getAllLockers(filters = {}, limit = 50, offset = 0) {
    try {
      let query = `
        SELECT lockerID, branchID, floorNumber, wing, setName, status, createdAt, updatedAt 
        FROM locker 
        WHERE 1=1
      `;
      const params = [];

      // apply filters
      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }

      if (filters.branchID) {
        query += ` AND branchID = ?`;
        params.push(filters.branchID);
      }

      if (filters.floorNumber !== undefined) {
        query += ` AND floorNumber = ?`;
        params.push(filters.floorNumber);
      }

      // add order by and pagination
      query += ` ORDER BY floorNumber ASC, lockerID ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching lockers: ${error.message}.`);
    }
  },

  /**
   * get total count of lockers matching filters
   * @param {Object} filters - filter options
   * @returns {Promise<Number>} total count
   */
  async getLockerCount(filters = {}) {
    try {
      let query = "SELECT COUNT(*) as total FROM locker WHERE 1=1";
      const params = [];

      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }

      if (filters.branchID) {
        query += ` AND branchID = ?`;
        params.push(filters.branchID);
      }

      if (filters.floorNumber !== undefined) {
        query += ` AND floorNumber = ?`;
        params.push(filters.floorNumber);
      }

      const [rows] = await db.query(query, params);
      return parseInt(rows[0].total);
    } catch (error) {
      throw new Error(`Error counting lockers: ${error.message}.`);
    }
  },

  /**
   * gets available lockers
   * @param {Number} limit - number of records
   * @param {Number} offset - starting point
   * @returns {Promise<Array>} array of available lockers
   */
  async getAvailableLockers(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT lockerID, branchID, floorNumber, wing, setName, status, createdAt, updatedAt 
        FROM locker 
        WHERE status = 'Available'
        ORDER BY floorNumber ASC, lockerID ASC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await db.query(query, [limit, offset]);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching available lockers: ${error.message}.`);
    }
  },

  /**
   * get lockers by floor number
   * @param {String} floorNumber - floor number to filter by
   * @param {String} status - optional status filter
   * @param {Number} limit - number of records
   * @param {Number} offset - starting point
   * @returns {Promise<Array>} array of lockers on specified floor
   */
  async getLockersByFloor(floorNumber, status = null, limit = 50, offset = 0) {
    try {
      let query = `
      SELECT lockerID, branchID, floorNumber, wing, setName, status, createdAt, updatedAt 
      FROM locker 
      WHERE floorNumber = ?
    `;
      const params = [floorNumber];

      if (status) {
        query += " AND status = ? ORDER BY lockerID ASC LIMIT ? OFFSET ?";
        params.push(status, limit, offset);
      } else {
        query += " ORDER BY lockerID ASC LIMIT ? OFFSET ?";
        params.push(limit, offset);
      }

      // DEBUG LOGGING

      const [rows] = await db.query(query, params);

      // DEBUG LOGGING

      return rows;
    } catch (error) {
      throw new Error(`Error fetching lockers by floor: ${error.message}.`);
    }
  },

  /**
   * get single locker by ID
   * @param {String} lockerID - locker ID (e.g., 'L6-001')
   * @returns {Promise<Object|null>} - null if no locker is found
   */
  async getLockerById(lockerID) {
    try {
      const query = `
        SELECT lockerID, branchID, floorNumber, wing, setName, status, createdAt, updatedAt 
        FROM locker 
        WHERE lockerID = ?
      `;
      const [rows] = await db.query(query, [lockerID]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error fetching locker by ID: ${error.message}.`);
    }
  },

  /**
   * update locker status
   * @param {String} lockerID
   * @param {String} status - New status
   * @returns {Promise<Object|null>} updated locker object
   */
  async updateLockerStatus(lockerID, status) {
    try {
      const query = `
        UPDATE locker 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE lockerID = ?
      `;
      await db.query(query, [status, lockerID]);

      // Return updated locker
      return await this.getLockerById(lockerID);
    } catch (error) {
      throw new Error(`Error updating locker status: ${error.message}.`);
    }
  },

  /**
   * create a new locker
   * @param {Object} lockerData - locker data
   * @returns {Promise<Object>} created locker object
   */
  async createLocker(lockerData) {
    try {
      const {
        lockerID,
        branchID,
        floorNumber,
        wing = null,
        setName = null,
        status = "Available",
      } = lockerData;
      const query = `
        INSERT INTO locker (lockerID, branchID, floorNumber, wing, setName, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await db.query(query, [
        lockerID,
        branchID,
        floorNumber,
        wing,
        setName,
        status,
      ]);

      return await this.getLockerById(lockerID);
    } catch (error) {
      throw new Error(`Error creating locker: ${error.message}.`);
    }
  },

  /**
   * delete a locker
   * @param {String} lockerID
   * @returns {Promise<Boolean>} true if deleted successfully
   */
  async deleteLocker(lockerID) {
    try {
      const query = "DELETE FROM locker WHERE lockerID = ?";
      const [result] = await db.query(query, [lockerID]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting locker: ${error.message}.`);
    }
  },
};

module.exports = LockerModel;
