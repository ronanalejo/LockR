const pool = require("../config/database");

const semesterPeriodsModel = {
  // Find all active semester periods
  findAll: async () => {
    const query = `
      SELECT *
      FROM semester_periods
      WHERE is_active = 1
      ORDER BY start_date DESC
    `;

    const [rows] = await pool.execute(query);
    return rows;
  },

  // Find active semester periods by academic level (SHS or COLLEGE)
  findByAcademicLevel: async (academicLevel) => {
    const query = `
      SELECT *
      FROM semester_periods
      WHERE academic_level = ?
      AND is_active = 1
      ORDER BY start_date DESC
    `;

    const [rows] = await pool.execute(query, [academicLevel]);
    return rows;
  },

  // Find currently active semester (status = 'ACTIVE')
  findCurrentActive: async (academicLevel = null) => {
    const query = `
      SELECT *
      FROM semester_periods
      WHERE status = 'ACTIVE'
      AND is_active = 1
      ${academicLevel ? 'AND academic_level = ?' : ''}
      ORDER BY start_date DESC
      LIMIT 1
    `;

    const queryParams = academicLevel ? [academicLevel] : [];

    const [rows] = await pool.execute(query, queryParams);
    return rows[0] || null;
  },

  // Find by ID
  findById: async (id) => {
    const query = `
      SELECT *
      FROM semester_periods
      WHERE id = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  },

  // Create new semester period
  create: async (semesterData, connection = null) => {
    const query = `
      INSERT INTO semester_periods
      (academic_level, academic_year, semester_name, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const executor = connection || pool;
    const [result] = await executor.execute(query, [
      semesterData.academic_level,
      semesterData.academic_year,
      semesterData.semester_name,
      semesterData.start_date,
      semesterData.end_date,
      semesterData.status || "UPCOMING",
    ]);

    return result.insertId;
  },

  // Update semester period
  update: async (id, updateData) => {
    const fields = [];
    const values = [];

    if (updateData.academic_level !== undefined) {
      fields.push("academic_level = ?");
      values.push(updateData.academic_level);
    }
    if (updateData.semester_name !== undefined) {
      fields.push("semester_name = ?");
      values.push(updateData.semester_name);
    }
    if (updateData.academic_year !== undefined) {
      fields.push("academic_year = ?");
      values.push(updateData.academic_year);
    }
    if (updateData.start_date !== undefined) {
      fields.push("start_date = ?");
      values.push(updateData.start_date);
    }
    if (updateData.end_date !== undefined) {
      fields.push("end_date = ?");
      values.push(updateData.end_date);
    }
    if (updateData.status !== undefined) {
      fields.push("status = ?");
      values.push(updateData.status);
    }
    if (updateData.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(updateData.is_active);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(id);
    const query = `UPDATE semester_periods SET ${fields.join(", ")} WHERE id = ?`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows;
  },

  // Update status (UPCOMING -> ACTIVE -> COMPLETED)
  updateStatus: async (id, status) => {
    const query = "UPDATE semester_periods SET status = ? WHERE id = ?";

    const [result] = await pool.execute(query, [status, id]);
    return result.affectedRows;
  },

  // Soft delete (set is_active = 0)
  softDelete: async (id) => {
    const query = "UPDATE semester_periods SET is_active = 0 WHERE id = ?";

    const [result] = await pool.execute(query, [id]);
    return result.affectedRows;
  },

  // Check if any active semester exists for academic level
  hasActiveSemester: async (academicLevel) => {
    const query = `
      SELECT COUNT(*) as count
      FROM semester_periods
      WHERE academic_level = ?
      AND status = 'ACTIVE'
      AND is_active = 1
    `;

    const [rows] = await pool.execute(query, [academicLevel]);
    return rows[0].count > 0;
  },
};

module.exports = semesterPeriodsModel;