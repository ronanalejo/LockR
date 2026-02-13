import api from "./api";

/**
 * Semester Periods Service
 * Handles all semester period API operations.
 * Follows the same pattern as adminService.js.
 */
class SemesterPeriodsService {
  constructor() {
    this.client = api;
  }

  formatError(error) {
    if (error.response) {
      return {
        success: false,
        message:
          error.response.data?.error ||
          error.response.data?.message ||
          "An error occurred",
        statusCode: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        success: false,
        message: "No response from server. Please check your connection.",
        statusCode: 0,
      };
    } else {
      return {
        success: false,
        message: error.message || "An unexpected error occurred",
        statusCode: 0,
      };
    }
  }

  formatSuccess(response, message = "Operation successful") {
    return {
      success: true,
      message: response.data?.message || message,
      data: response.data?.data || response.data,
      statusCode: response.status,
    };
  }

  /**
   * Get all semester periods (optionally filtered)
   * @param {Object} filters - { academicLevel: 'SHS'|'COLLEGE', status: 'UPCOMING'|'ACTIVE'|'COMPLETED' }
   */
  async getAllSemesterPeriods(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.academicLevel)
        params.append("academicLevel", filters.academicLevel);
      if (filters.status) params.append("status", filters.status);

      const queryString = params.toString();
      const url = `/semester-periods${queryString ? `?${queryString}` : ""}`;

      const response = await this.client.get(url);
      return this.formatSuccess(
        response,
        "Semester periods fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current active semester
   * @param {string|null} academicLevel - Optional filter by SHS or COLLEGE
   */
  async getCurrentSemester(academicLevel = null) {
    try {
      const url = academicLevel
        ? `/semester-periods/current?academicLevel=${academicLevel}`
        : "/semester-periods/current";

      const response = await this.client.get(url);
      return this.formatSuccess(
        response,
        "Current semester fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get semester by ID
   * @param {number|string} id
   */
  async getSemesterById(id) {
    try {
      const response = await this.client.get(`/semester-periods/${id}`);
      return this.formatSuccess(response, "Semester fetched successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new semester period
   * @param {Object} semesterData - { academic_level, academic_year, semester_name, start_date, end_date, status }
   */
  async createSemesterPeriod(semesterData) {
    try {
      const response = await this.client.post(
        "/semester-periods",
        semesterData,
      );
      return this.formatSuccess(
        response,
        "Semester period created successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update semester period
   * @param {number|string} id
   * @param {Object} updateData
   */
  async updateSemesterPeriod(id, updateData) {
    try {
      const response = await this.client.put(
        `/semester-periods/${id}`,
        updateData,
      );
      return this.formatSuccess(
        response,
        "Semester period updated successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update semester status
   * @param {number|string} id
   * @param {string} status - UPCOMING | ACTIVE | COMPLETED
   */
  async updateSemesterStatus(id, status) {
    try {
      const response = await this.client.patch(
        `/semester-periods/${id}/status`,
        {
          status,
        },
      );
      return this.formatSuccess(
        response,
        "Semester status updated successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete semester period (soft delete)
   * @param {number|string} id
   */
  async deleteSemesterPeriod(id) {
    try {
      const response = await this.client.delete(`/semester-periods/${id}`);
      return this.formatSuccess(
        response,
        "Semester period deleted successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if any active semester is configured
   */
  async isConfigured() {
    try {
      const response = await this.client.get("/semester-periods/check");
      return this.formatSuccess(response, "Configuration status retrieved");
    } catch (error) {
      throw error;
    }
  }
}

const semesterPeriodsService = new SemesterPeriodsService();
export default semesterPeriodsService;
