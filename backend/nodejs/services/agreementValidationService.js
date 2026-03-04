const db = require("../config/database");

const AGREEMENT_REQUIREMENTS = {
  "2 Semesters/Terms": {
    SHS: { count: 2, names: ["1st Term", "2nd Term"] },
    COLLEGE: { count: 2, names: ["1st Semester", "2nd Semester"] },
  },
  "1 School Year": {
    SHS: { count: 2, names: ["1st Term", "2nd Term"] },
    COLLEGE: {
      count: 3,
      names: ["1st Semester", "2nd Semester", "3rd Semester"],
    },
  },
};

const agreementValidationService = {
  /**
   * Validate whether a selected agreement is allowed based on
   * configured Academic Periods for the student's level.
   * @param {string} agreement - "1 Semester/Term", "2 Semesters/Terms", or "1 School Year"
   * @param {string} academicLevel - "SHS" or "COLLEGE"
   * @returns {Promise<{allowed: boolean, message: string, periods: Array}>}
   */
  async validate(agreement, academicLevel) {
    try {
      // "1 Semester/Term" only needs 1 active period - always allowed if at least one exists
      if (agreement === "1 Semester/Term") {
        const [rows] = await db.query(
          `SELECT * FROM semester_periods
           WHERE academic_level = ? AND is_active = 1
           ORDER BY start_date ASC`,
          [academicLevel],
        );

        if (rows.length === 0) {
          return {
            allowed: false,
            message: `${agreement} is currently not allowed.`,
            periods: [],
          };
        }

        return {
          allowed: true,
          message: "Agreement is allowed.",
          periods: rows,
        };
      }

      // For "2 Semesters/Terms" and "1 School Year", check requirements
      const requirement = AGREEMENT_REQUIREMENTS[agreement];
      if (!requirement) {
        return {
          allowed: false,
          message: "Invalid agreement type.",
          periods: [],
        };
      }

      const levelReq = requirement[academicLevel];
      if (!levelReq) {
        return {
          allowed: false,
          message: "Invalid academic level for this agreement.",
          periods: [],
        };
      }

      // Fetch all active periods for this academic level
      const [rows] = await db.query(
        `SELECT * FROM semester_periods
         WHERE academic_level = ? AND is_active = 1
         ORDER BY start_date ASC`,
        [academicLevel],
      );

      // Check that ALL required period names exist in the configured periods
      const configuredNames = rows.map((r) => r.semester_name);
      const missingPeriods = levelReq.names.filter(
        (name) => !configuredNames.includes(name),
      );

      if (missingPeriods.length > 0) {
        return {
          allowed: false,
          message: `${agreement} is currently not allowed.`,
          periods: [],
          missingPeriods,
        };
      }

      // Collect only the matching periods in correct order
      const matchedPeriods = levelReq.names
        .map((name) => rows.find((r) => r.semester_name === name))
        .filter(Boolean);

      return {
        allowed: true,
        message: "Agreement is allowed.",
        periods: matchedPeriods,
      };
    } catch (error) {
      console.error("[AGREEMENT_VALIDATION] Error:", error);
      throw error;
    }
  },

  /**
   * Calculate the agreement date range based on matched periods.
   * Used during endorsement to set agreementDateStart and agreementDateEnd.
   * @param {string} agreement
   * @param {string} academicLevel
   * @returns {Promise<{start: string, end: string} | null>}
   */
  async calculateAgreementDateRange(agreement, academicLevel) {
    const result = await this.validate(agreement, academicLevel);

    if (!result.allowed || result.periods.length === 0) {
      return null;
    }

    if (agreement === "1 Semester/Term") {
      // Use the current active semester or the first available
      const [currentRows] = await db.query(
        `SELECT * FROM semester_periods
         WHERE academic_level = ? AND is_active = 1
         AND start_date <= CURDATE() AND end_date >= CURDATE()
         ORDER BY start_date DESC LIMIT 1`,
        [academicLevel],
      );

      const period = currentRows[0] || result.periods[0];
      return {
        start: period.start_date,
        end: period.end_date,
      };
    }

    // For multi-period agreements, span from first period start to last period end
    const periods = result.periods;
    const startDate = periods[0].start_date;
    const endDate = periods[periods.length - 1].end_date;

    return {
      start: startDate,
      end: endDate,
    };
  },
};

module.exports = agreementValidationService;
