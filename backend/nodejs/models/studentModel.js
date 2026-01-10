const pool = require("../config/database");

const studentModel = {
  findByEmail: async (email) => {
    const query = "SELECT * FROM student WHERE studentEmail = ? LIMIT 1";
    const [rows] = await pool.execute(query, [email]);
    return rows[0] || null;
  },
};

module.exports = studentModel;
