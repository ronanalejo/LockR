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
        SELECT lockerID, branchID, floorNumber, status, createdAt, updatedAt 
        FROM lockers 
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      // apply filters
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.branchID) {
        query += ` AND branchID = $${paramIndex}`;
        params.push(filters.branchID);
        paramIndex++;
      }

      if (filters.floorNumber !== undefined) {
        query += ` AND floorNumber = $${paramIndex}`;
        params.push(filters.floorNumber);
        paramIndex++;
      }

      // add order by and pagination
      query += ` ORDER BY floorNumber ASC, lockerID ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching lockers: ${error.message}`);
    }
  },

  /**
   * get total count of lockers matching filters
   * @param {Object} filters - filter options
   * @returns {Promise<Number>} total count
   */
  async getLockerCount(filters = {}) {
    try {
      let query = "SELECT COUNT(*) as total FROM lockers WHERE 1=1";
      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.branchID) {
        query += ` AND branchID = $${paramIndex}`;
        params.push(filters.branchID);
        paramIndex++;
      }

      if (filters.floorNumber !== undefined) {
        query += ` AND floorNumber = $${paramIndex}`;
        params.push(filters.floorNumber);
        paramIndex++;
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      throw new Error(`Error counting lockers: ${error.message}`);
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
        SELECT lockerID, branchID, floorNumber, status, createdAt, updatedAt 
        FROM lockers 
        WHERE status = 'available'
        ORDER BY floorNumber ASC, lockerID ASC
        LIMIT $1 OFFSET $2
      `;
      const result = await db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching available lockers: ${error.message}`);
    }
  },

  /**
   * get lockers by floor number
   * @param {Number} floorNumber - floor number to filter by
   * @param {String} status - optional status filter
   * @param {Number} limit - number of records
   * @param {Number} offset - starting point
   * @returns {Promise<Array>} array of lockers on specified floor
   */
  async getLockersByFloor(floorNumber, status = null, limit = 50, offset = 0) {
    try {
      let query = `
        SELECT lockerID, branchID, floorNumber, status, createdAt, updatedAt 
        FROM lockers 
        WHERE floorNumber = $1
      `;
      const params = [floorNumber];

      if (status) {
        query += " AND status = $2 ORDER BY lockerID ASC LIMIT $3 OFFSET $4";
        params.push(status, limit, offset);
      } else {
        query += " ORDER BY lockerID ASC LIMIT $2 OFFSET $3";
        params.push(limit, offset);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching lockers by floor: ${error.message}`);
    }
  },

  /**
   * get single locker by ID
   * @param {Number} lockerID
   * @returns {Promise<Object|null>} - null if no locker is found
   */
  async getLockerById(lockerID) {
    try {
      const query = `
        SELECT lockerID, branchID, floorNumber, status, createdAt, updatedAt 
        FROM lockers 
        WHERE lockerID = $1
      `;
      const result = await db.query(query, [lockerID]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error fetching locker by ID: ${error.message}`);
    }
  },

  /**
   * update locker status
   * @param {Number} lockerID
   * @param {String} status - New status
   * @returns {Promise<Object|null>} updated locker object
   */
  async updateLockerStatus(lockerID, status) {
    try {
      const query = `
        UPDATE lockers 
        SET status = $1, updatedAt = CURRENT_TIMESTAMP 
        WHERE lockerID = $2 
        RETURNING lockerID, branchID, floorNumber, status, createdAt, updatedAt
      `;
      const result = await db.query(query, [status, lockerID]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating locker status: ${error.message}`);
    }
  },

  /**
   * create a new locker
   * @param {Object} lockerData - locker data
   * @returns {Promise<Object>} created locker object
   */
  async createLocker(lockerData) {
    try {
      const { branchID, floorNumber, status = "available" } = lockerData;
      const query = `
        INSERT INTO lockers (branchID, floorNumber, status, createdAt, updatedAt)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING lockerID, branchID, floorNumber, status, createdAt, updatedAt
      `;
      const result = await db.query(query, [branchID, floorNumber, status]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating locker: ${error.message}`);
    }
  },

  /**
   * delete a locker
   * @param {Number} lockerID
   * @returns {Promise<Boolean>} true if deleted successfully
   */
  async deleteLocker(lockerID) {
    try {
      const query = "DELETE FROM lockers WHERE lockerID = $1 RETURNING lockerID";
      const result = await db.query(query, [lockerID]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting locker: ${error.message}`);
    }
  },
};

module.exports = LockerModel;