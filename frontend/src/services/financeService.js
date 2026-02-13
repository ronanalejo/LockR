import api from "./api";

/**
 * Finance Service
 * Handles all finance-related API operations with authentication.
 * Follows the same pattern as adminService.js.
 */
class FinanceService {
  constructor() {
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

  /**
   * Get pending payments (approved reservations awaiting payment verification)
   */
  async getPendingPayments() {
    try {
      const response = await this.client.get("/finance/payments/pending");
      return this.formatSuccess(
        response,
        "Pending payments fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment history (all completed/verified payments)
   */
  async getPaymentHistory() {
    try {
      const response = await this.client.get("/finance/payments/history");
      return this.formatSuccess(
        response,
        "Payment history fetched successfully",
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify a payment (mark as verified)
   * @param {number|string} reservationId - Referral slip number
   * @param {string} notes - Optional verification notes
   */
  async verifyPayment(reservationId, notes = "") {
    try {
      const response = await this.client.post(
        `/finance/payments/${reservationId}/verify`,
        { notes },
      );
      return this.formatSuccess(response, "Payment verified successfully");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get finance dashboard statistics
   */
  async getDashboardStats() {
    try {
      const response = await this.client.get("/finance/stats");
      return this.formatSuccess(response, "Finance stats fetched successfully");
    } catch (error) {
      throw error;
    }
  }
}

const financeService = new FinanceService();
export default financeService;
