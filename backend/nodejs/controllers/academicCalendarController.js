const pool = require("../config/database");

const success = (res, data, message) =>
  res.json({ success: true, message, data });

const error = (res, status, message) =>
  res.status(status).json({ success: false, message });

exports.getCurrentCalendar = async (req, res) => {
  try {
    const [[row]] = await pool.execute(`
      SELECT
        calendarID,
        semester,
        startDate,
        endDate
      FROM academic_calendar
      WHERE isActive = 1
      LIMIT 1
    `);

    if (!row) {
      return success(res, null, "No active academic calendar");
    }

    return success(res, row, "Academic calendar retrieved");
  } catch (err) {
    console.error("getCurrentCalendar:", err);
    return error(res, 500, "Failed to fetch academic calendar");
  }
};

exports.createCalendar = async (req, res) => {
  const { semester, startDate, endDate } = req.body;

  if (!semester || !startDate || !endDate) {
    return error(res, 400, "Missing required fields");
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return error(res, 400, "Start date must be before end date");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(`
      UPDATE academic_calendar
      SET isActive = 0
    `);

    await connection.execute(
      `
      INSERT INTO academic_calendar
        (semester, startDate, endDate, isActive, createdAt)
      VALUES (?, ?, ?, 1, NOW())
      `,
      [semester, startDate, endDate]
    );

    await connection.commit();

    return success(res, null, "Academic calendar created");
  } catch (err) {
    await connection.rollback();
    console.error("createCalendar:", err);
    return error(res, 500, "Failed to create academic calendar");
  } finally {
    connection.release();
  }
};

exports.updateCalendar = async (req, res) => {
  const { calendarID, semester, startDate, endDate } = req.body;

  if (!calendarID || !semester || !startDate || !endDate) {
    return error(res, 400, "Missing required fields");
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return error(res, 400, "Start date must be before end date");
  }

  try {
    const [result] = await pool.execute(
      `
      UPDATE academic_calendar
      SET
        semester = ?,
        startDate = ?,
        endDate = ?,
        updatedAt = NOW()
      WHERE calendarID = ?
      `,
      [semester, startDate, endDate, calendarID]
    );

    if (result.affectedRows === 0) {
      return error(res, 404, "Academic calendar not found");
    }

    return success(res, null, "Academic calendar updated");
  } catch (err) {
    console.error("updateCalendar:", err);
    return error(res, 500, "Failed to update academic calendar");
  }
};

exports.isConfigured = async (req, res) => {
  try {
    const [[row]] = await pool.execute(`
      SELECT COUNT(*) AS count
      FROM academic_calendar
      WHERE isActive = 1
    `);

    return success(
      res,
      { configured: row.count > 0 },
      "Configuration status retrieved"
    );
  } catch (err) {
    console.error("isConfigured:", err);
    return error(res, 500, "Failed to check calendar configuration");
  }
};
