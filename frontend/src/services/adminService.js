import api from "./api";

/**
 * Admin Service
 * Handles all admin-related API operations with authentication
 */
class AdminService {
  constructor() {
    // Use the centralized API instance which already has:
    // - Correct base URL (with environment detection)
    // - JWT token interceptor
    // - Error handling
    this.client = api;
  }

  /**
   * Format error responses consistently
   */
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

  /**
   * Format success responses consistently
   */
  formatSuccess(response, message = "Operation successful") {
    return {
      success: true,
      message: response.data?.message || message,
      data: response.data?.data || response.data,
      statusCode: response.status,
    };
  }

  // ==================== ENDORSEMENT QUEUE ====================

  /**
   * Get endorsement queue (pending endorsements)
   * @returns {Promise<Object>} List of reservations pending endorsement
   */
  async getEndorsementQueue() {
    try {
      const response = await this.client.get("/admin/endorsements/pending");
      return this.formatSuccess(
        response,
        "Endorsement queue fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve an endorsement
   * @param {number|string} reservationId - Reservation ID
   * @param {string} notes - Optional approval notes
   * @returns {Promise<Object>}
   */
  async approveEndorsement(reservationId, notes = "") {
    try {
      const response = await this.client.post(
        `/admin/endorsements/${reservationId}/approve`,
        { notes },
      );
      return this.formatSuccess(response, "Endorsement approved successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject an endorsement
   * @param {number|string} reservationId - Reservation ID
   * @param {string} reason - Rejection reason (required)
   * @returns {Promise<Object>}
   */
  async rejectEndorsement(reservationId, reason) {
    try {
      if (!reason || reason.trim() === "") {
        throw new Error("Rejection reason is required");
      }

      const response = await this.client.post(
        `/admin/endorsements/${reservationId}/reject`,
        { reason },
      );
      return this.formatSuccess(response, "Endorsement rejected successfully");
    } catch (error) {
      throw error;
    }
  }

  // ==================== APPROVAL QUEUE ====================

  /**
   * Get approval queue (pending final approvals)
   * @returns {Promise<Object>} List of reservations pending approval
   */
  async getApprovalQueue() {
    try {
      const response = await this.client.get("/admin/reservations/pending");
      return this.formatSuccess(
        response,
        "Approval queue fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve a reservation
   * @param {number|string} reservationId - Reservation ID
   * @param {string} notes - Optional approval notes
   * @returns {Promise<Object>}
   */
  async approveReservation(reservationId, notes = "") {
    try {
      const response = await this.client.post(
        `/admin/reservations/${reservationId}/approve`,
        { notes },
      );
      return this.formatSuccess(response, "Reservation approved successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject a reservation
   * @param {number|string} reservationId - Reservation ID
   * @param {string} reason - Rejection reason (required)
   * @returns {Promise<Object>}
   */
  async rejectReservation(reservationId, reason) {
    try {
      if (!reason || reason.trim() === "") {
        throw new Error("Rejection reason is required");
      }

      const response = await this.client.post(
        `/admin/reservations/${reservationId}/reject`,
        { reason },
      );
      return this.formatSuccess(response, "Reservation rejected successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a reservation
   * @param {number|string} reservationId - Reservation ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>}
   */
  async cancelReservation(reservationId, reason) {
    try {
      const response = await this.client.post(
        `/admin/reservations/${reservationId}/cancel`,
        { reason },
      );
      return this.formatSuccess(response, "Reservation cancelled successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark or unmark a reservation as duplicate
   * @param {number|string} reservationId - Reservation ID
   * @param {boolean} isDuplicate - Whether the reservation is a duplicate
   * @returns {Promise<Object>}
   */
  async markDuplicate(reservationId, isDuplicate) {
    try {
      const response = await this.client.patch(
        `/admin/reservations/${reservationId}/duplicate`,
        { duplicate: isDuplicate },
      );
      return this.formatSuccess(
        response,
        `Reservation marked as ${isDuplicate ? "duplicate" : "not duplicate"}`,
      );
    } catch (error) {
      throw error;
    }
  }

  // ==================== RESERVATIONS ====================

  /**
   * Get all reservations with optional filters
   * @param {Object} filters - Filter parameters (status, floor, date range, etc.)
   * @returns {Promise<Object>}
   */
  async getReservations(filters = {}) {
    try {
      const response = await this.client.get("/admin/reservations", {
        params: filters,
      });
      return this.formatSuccess(response, "Reservations fetched successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get reservation by ID
   * @param {number|string} reservationId
   * @returns {Promise<Object>}
   */
  async getReservationById(reservationId) {
    try {
      const response = await this.client.get(
        `/admin/reservations/${reservationId}`,
      );
      return this.formatSuccess(
        response,
        "Reservation details fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  // ==================== FLOOR PLANS ====================

  /**
   * Get all floor plans
   * @returns {Promise<Object>} List of floor plans with locker layouts
   */
  async getFloorPlans() {
    try {
      const response = await this.client.get("/admin/floor-plans");
      return this.formatSuccess(response, "Floor plans fetched successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get specific floor plan
   * @param {number|string} floor - Floor number
   * @returns {Promise<Object>} Floor plan with detailed locker positions
   */
  async getFloorPlan(floor) {
    try {
      const response = await this.client.get(`/admin/floor-plans/${floor}`);
      return this.formatSuccess(response, "Floor plan fetched successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update floor plan configuration
   * @param {number|string} floor - Floor number
   * @param {Object} data - Floor plan data
   * @returns {Promise<Object>}
   */
  async updateFloorPlan(floor, data) {
    try {
      const response = await this.client.put(
        `/admin/floor-plans/${floor}`,
        data,
      );
      return this.formatSuccess(response, "Floor plan updated successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload floor plan image
   * @param {number|string} floor - Floor number
   * @param {File} imageFile - Image file
   * @returns {Promise<Object>}
   */
  async uploadFloorPlanImage(floor, imageFile) {
    try {
      const formData = new FormData();
      formData.append("floor_plan_image", imageFile);

      const response = await this.client.post(
        `/admin/floor-plans/${floor}/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return this.formatSuccess(
        response,
        "Floor plan image uploaded successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get admin dashboard statistics
   * @returns {Promise<Object>}
   */
  async getDashboardStats() {
    try {
      const response = await this.client.get("/admin/statistics/dashboard");
      return this.formatSuccess(
        response,
        "Dashboard statistics fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get locker occupancy statistics
   * @returns {Promise<Object>}
   */
  async getOccupancyStats() {
    try {
      const response = await this.client.get("/admin/statistics/occupancy");
      return this.formatSuccess(
        response,
        "Occupancy statistics fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  // ==================== OPTIMISTIC UPDATES HELPER ====================

  /**
   * Helper for optimistic UI updates
   * @param {Function} apiCall - The API call to execute
   * @param {Function} optimisticUpdate - Function to update UI optimistically
   * @param {Function} rollback - Function to rollback on error
   * @returns {Promise<Object>}
   */
  async withOptimisticUpdate(apiCall, optimisticUpdate, rollback) {
    // Apply optimistic update immediately
    if (optimisticUpdate) {
      optimisticUpdate();
    }

    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      // Rollback on error
      if (rollback) {
        rollback();
      }
      throw error;
    }
  }

  async getOccupiedLockers() {
    try {
      const response = await this.client.get("/admin/reservations/occupied");
      return this.formatSuccess(
        response,
        "Occupied lockers fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  async getReservationHistory() {
    try {
      const response = await this.client.get("/admin/reservations/history");
      return this.formatSuccess(
        response,
        "Reservation history fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const adminService = new AdminService();
export default adminService;

// Named exports for specific methods (optional, for convenience)
export const {
  getEndorsementQueue,
  approveEndorsement,
  rejectEndorsement,
  getApprovalQueue,
  approveReservation,
  rejectReservation,
  cancelReservation,
  getReservations,
  getReservationById,
  getFloorPlans,
  getFloorPlan,
  updateFloorPlan,
  uploadFloorPlanImage,
  getDashboardStats,
  getOccupancyStats,
} = adminService;
