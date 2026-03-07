const db = require("../config/database");

const LockerSetModel = {
  async getSetsByFloorAndWing(floorNumber, wing) {
    try {
      const [rows] = await db.query(
        `SELECT id, floorNumber, wing, setName, createdAt, updatedAt
         FROM locker_set
         WHERE floorNumber = ? AND wing = ?
         ORDER BY setName ASC`,
        [floorNumber, wing],
      );
      return rows;
    } catch (error) {
      throw new Error(`Error fetching sets: ${error.message}.`);
    }
  },

  async getSetById(id) {
    try {
      const [rows] = await db.query(
        `SELECT id, floorNumber, wing, setName, createdAt, updatedAt FROM locker_set WHERE id = ?`,
        [id],
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error fetching set by ID: ${error.message}.`);
    }
  },

  async createSet(data) {
    try {
      const { floorNumber, wing, setName } = data;
      const [result] = await db.query(
        `INSERT INTO locker_set (floorNumber, wing, setName) VALUES (?, ?, ?)`,
        [floorNumber, wing, setName],
      );
      return await this.getSetById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating set: ${error.message}.`);
    }
  },

  async updateSet(id, setName) {
    try {
      await db.query(
        `UPDATE locker_set SET setName = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [setName, id],
      );
      return await this.getSetById(id);
    } catch (error) {
      throw new Error(`Error updating set: ${error.message}.`);
    }
  },

  async deleteSet(id) {
    try {
      const [result] = await db.query(`DELETE FROM locker_set WHERE id = ?`, [
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting set: ${error.message}.`);
    }
  },
};

module.exports = LockerSetModel;
