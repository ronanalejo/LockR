const db = require("../config/database");

const semesterPeriodCheckService = {
  /**
   * Check if semester periods exist for a specific academic level
   * @param {string} academicLevel - 'SHS' or 'COLLEGE'
   * @returns {Promise<boolean>}
   */
  async hasSemesterPeriods(academicLevel) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count 
         FROM semester_periods 
         WHERE is_active = 1
         AND academic_level = ?`,
        [academicLevel],
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("Error checking semester periods:", error);
      throw error;
    }
  },

  /**
   * Check if semester periods exist for BOTH SHS and COLLEGE
   * @returns {Promise<{hasSHS: boolean, hasCOLLEGE: boolean, hasBoth: boolean, missing: string[]}>}
   */
  async checkBothLevels() {
    try {
      const hasSHS = await this.hasSemesterPeriods("SHS");
      const hasCOLLEGE = await this.hasSemesterPeriods("COLLEGE");

      const missing = [];
      if (!hasSHS) missing.push("SHS");
      if (!hasCOLLEGE) missing.push("COLLEGE");

      return {
        hasSHS,
        hasCOLLEGE,
        hasBoth: hasSHS && hasCOLLEGE,
        missing,
      };
    } catch (error) {
      console.error("Error checking both levels:", error);
      throw error;
    }
  },

  /**
   * Check if initial setup prompt has been shown
   * @returns {Promise<boolean>}
   */
  async hasBeenPromptedForInitialSetup() {
    try {
      const configKey = "semester_period_initial_setup_prompted";
      const [rows] = await db.query(
        `SELECT config_value 
         FROM system_config 
         WHERE config_key = ?`,
        [configKey],
      );

      if (rows.length === 0) {
        return false;
      }

      return rows[0].config_value === "true";
    } catch (error) {
      console.error("Error checking initial setup prompt status:", error);
      throw error;
    }
  },

  /**
   * Mark initial setup prompt as shown
   * @param {number} adminId - ID of admin who triggered the prompt
   * @returns {Promise<void>}
   */
  async markInitialSetupAsPrompted(adminId) {
    try {
      const configKey = "semester_period_initial_setup_prompted";

      const [existing] = await db.query(
        `SELECT id FROM system_config WHERE config_key = ?`,
        [configKey],
      );

      if (existing.length > 0) {
        await db.query(
          `UPDATE system_config 
           SET config_value = 'true', updated_by = ? 
           WHERE config_key = ?`,
          [adminId, configKey],
        );
      } else {
        await db.query(
          `INSERT INTO system_config (config_key, config_value, description, updated_by) 
           VALUES (?, 'true', ?, ?)`,
          [
            configKey,
            "Tracks if semester period initial setup (both SHS and COLLEGE) has been prompted",
            adminId,
          ],
        );
      }
    } catch (error) {
      console.error("Error marking initial setup as prompted:", error);
      throw error;
    }
  },

  /**
   * Validate semester period requirement for endorsement
   * Checks BOTH SHS and COLLEGE levels
   * @param {string} studentAcademicLevel - Student's academic level
   * @param {number} adminId - ID of admin attempting endorsement
   * @returns {Promise<{canEndorse: boolean, showModal: boolean, message: string, missingLevels: string[]}>}
   */
  async validateForEndorsement(studentAcademicLevel, adminId) {
    try {
      const levelCheck = await this.checkBothLevels();

      if (levelCheck.hasBoth) {
        return {
          canEndorse: true,
          showModal: false,
          message: "Validation passed",
          missingLevels: [],
        };
      }

      const hasBeenPrompted = await this.hasBeenPromptedForInitialSetup();

      if (!hasBeenPrompted) {
        await this.markInitialSetupAsPrompted(adminId);

        const missingText =
          levelCheck.missing.length === 2
            ? "SHS and COLLEGE"
            : levelCheck.missing[0];

        return {
          canEndorse: false,
          showModal: true,
          message: `Semester periods must be configured for both SHS and COLLEGE. Missing: ${missingText}. Please complete the setup.`,
          missingLevels: levelCheck.missing,
        };
      }

      const missingText =
        levelCheck.missing.length === 2
          ? "SHS and COLLEGE"
          : levelCheck.missing[0];

      return {
        canEndorse: false,
        showModal: false,
        message: `Cannot approve endorsement: Semester periods are not fully configured. Missing: ${missingText}. Please contact system administrator to complete semester period setup for all academic levels.`,
        missingLevels: levelCheck.missing,
      };
    } catch (error) {
      console.error("Error validating for endorsement:", error);
      throw error;
    }
  },
};

module.exports = semesterPeriodCheckService;
