const pool = require("../config/database");

const adminModel = {
  findByEmail: async (email) => {
    const query = "SELECT * FROM admin WHERE employeeEmail = ? LIMIT 1";
    const [rows] = await pool.execute(query, [email]);
    return rows[0] || null;
  },
};

module.exports = adminModel;
