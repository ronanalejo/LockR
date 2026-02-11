const db = require("../config/database");

/*
Status flow:
UPCOMING -> ACTIVE -> COMPLETED
Only one ACTIVE per academic_level.
Soft delete via is_active = 0
*/

exports.getAllSemesterPeriods = async (req, res) => {
  try {
    const { academicLevel, status } = req.query;

    let query = `
      SELECT *
      FROM semester_periods
      WHERE is_active = 1
    `;
    const params = [];

    if (academicLevel) {
      query += " AND academic_level = ?";
      params.push(academicLevel);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY start_date DESC";

    const [rows] = await db.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch semesters" });
  }
};

exports.getCurrentSemester = async (req, res) => {
  try {
    const { academicLevel } = req.query;

    let query = `
      SELECT *
      FROM semester_periods
      WHERE status = 'ACTIVE'
        AND is_active = 1
    `;
    const params = [];

    if (academicLevel) {
      query += " AND academic_level = ?";
      params.push(academicLevel);
    }

    const [rows] = await db.query(query, params);

    res.json({
      success: true,
      data: rows.length ? rows[0] : null,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch current semester" });
  }
};

exports.isConfigured = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) AS count
      FROM semester_periods
      WHERE status = 'ACTIVE'
        AND is_active = 1
    `);

    res.json({
      success: true,
      configured: rows[0].count > 0,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to check configuration" });
  }
};

exports.getSemesterById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM semester_periods WHERE id = ? AND is_active = 1`,
      [req.params.id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Semester not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch semester" });
  }
};

exports.createSemesterPeriod = async (req, res) => {
  try {
    const {
      academic_level,
      academic_year,
      semester_name,
      start_date,
      end_date,
      status,
    } = req.body;

    if (
      !academic_level ||
      !academic_year ||
      !semester_name ||
      !start_date ||
      !end_date
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    if (!["SHS", "COLLEGE"].includes(academic_level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic level. Must be SHS or COLLEGE",
      });
    }

    if (status && !["UPCOMING", "ACTIVE", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be UPCOMING, ACTIVE, or COMPLETED",
      });
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date range" });
    }

    const [result] = await db.query(
      `
      INSERT INTO semester_periods
      (academic_level, academic_year, semester_name, start_date, end_date, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
      [
        academic_level,
        academic_year,
        semester_name,
        start_date,
        end_date,
        status || "UPCOMING",
      ],
    );

    res.status(201).json({
      success: true,
      message: "Semester period created successfully",
      data: {
        id: result.insertId,
        academic_level,
        academic_year,
        semester_name,
        start_date,
        end_date,
        status: status || "UPCOMING",
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create semester" });
  }
};

exports.updateSemesterPeriod = async (req, res) => {
  try {
    const { academic_year, semester_name, start_date, end_date } = req.body;

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date range" });
    }

    await db.query(
      `
      UPDATE semester_periods
      SET academic_year = COALESCE(?, academic_year),
          semester_name = COALESCE(?, semester_name),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date)
      WHERE id = ? AND is_active = 1
      `,
      [academic_year, semester_name, start_date, end_date, req.params.id],
    );

    res.json({ success: true, message: "Semester updated" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update semester" });
  }
};

exports.updateSemesterStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { status } = req.body;
    const semesterId = req.params.id;

    if (!["UPCOMING", "ACTIVE", "COMPLETED"].includes(status)) {
      connection.release();
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    await connection.beginTransaction();

    if (status === "ACTIVE") {
      const [rows] = await connection.query(
        `SELECT academic_level FROM semester_periods WHERE id = ? AND is_active = 1`,
        [semesterId],
      );

      if (!rows.length) {
        await connection.rollback();
        connection.release();
        return res
          .status(404)
          .json({ success: false, message: "Semester not found" });
      }

      await connection.query(
        `
        UPDATE semester_periods
        SET status = 'COMPLETED'
        WHERE academic_level = ?
          AND status = 'ACTIVE'
          AND is_active = 1
          AND id != ?
        `,
        [rows[0].academic_level, semesterId],
      );
    }

    await connection.query(
      `
      UPDATE semester_periods
      SET status = ?
      WHERE id = ? AND is_active = 1
      `,
      [status, semesterId],
    );

    await connection.commit();

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    await connection.rollback();
    console.error("updateSemesterStatus:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  } finally {
    connection.release();
  }
};

exports.deleteSemesterPeriod = async (req, res) => {
  try {
    await db.query(
      `
      UPDATE semester_periods
      SET is_active = 0
      WHERE id = ?
      `,
      [req.params.id],
    );

    res.json({ success: true, message: "Semester deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete semester" });
  }
};
