import { API_ENDPOINTS } from "../config/api.js";

/**
 * Handles all locker-related API calls
 */
class LockerService {
  /**
   * Get authorization headers with JWT token
   * @returns {Object} Headers object with Authorization
   */
  getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * handles API response and errors
   * @param {Response} response - fetch API response
   * @returns {Promise<Object>} parsed JSON response
   * @throws {Error} error if response is false
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || errorData.error || `HTTP error ${response.status}`;
      throw new Error(errorMessage);
    }
    return response.json();
  }

  /**
   * handle network and other errors
   * @param {Error} error
   * @throws {Error} throws error message
   */
  handleError(error) {
    if (error.message === "Failed to fetch") {
      throw new Error(
        "Network error: Unable to connect to server. Please check your connection.",
      );
    }
    if (error.name === "AbortError") {
      throw new Error("Request timeout: The server took too long to respond.");
    }
    throw error;
  }

  /**
   * Fetch all available lockers
   * @returns {Promise<Object>} Response with available lockers array
   * @example
   * const result = await lockerService.getAvailableLockers();
   * // { success: true, data: [...], message: "Available lockers fetched" }
   */
  async getAvailableLockers() {
    try {
      const response = await fetch(API_ENDPOINTS.lockers.available, {
        method: "GET",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const data = await this.handleResponse(response);
      return {
        success: true,
        data: data.lockers || data,
        message: data.message || "Available lockers fetched successfully.",
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Fetch lockers for a specific floor
   * @param {number} floorNumber - Floor number to fetch lockers for
   * @returns {Promise<Object>} Response with lockers array for the floor
   * @throws {Error} If floorNumber is invalid
   * @example
   * const result = await lockerService.getLockersByFloor(2);
   * // { success: true, data: [...], message: "Lockers for floor 2 fetched" }
   */
  async getLockersByFloor(floorNumber) {
    if (!floorNumber || typeof floorNumber !== "number") {
      throw new Error("Invalid floor number: Must be a valid number.");
    }

    try {
      const url = API_ENDPOINTS.lockers.byFloor(floorNumber);

      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const data = await this.handleResponse(response);

      // Log the raw response

      // Extract lockers correctly
      let lockers;
      if (data.data && data.data.lockers) {
        // Backend sent: { success: true, data: { lockers: [...] } }
        lockers = data.data.lockers;
      } else if (Array.isArray(data.data)) {
        // Backend sent: { success: true, data: [...] }
        lockers = data.data;
      } else if (Array.isArray(data)) {
        // Backend sent: [...]
        lockers = data;
      } else {
        lockers = [];
      }

      return {
        success: true,
        data: lockers, // ← Always return the array here
        floor: floorNumber,
        message:
          data.message ||
          `Lockers for floor ${floorNumber} fetched successfully.`,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Fetch details for a specific locker
   * @param {string|number} lockerID - Locker ID to fetch
   * @returns {Promise<Object>} Response with locker details
   * @throws {Error} If lockerID is invalid
   * @example
   * const result = await lockerService.getLockerById('L101');
   * // { success: true, data: {...}, message: "Locker details fetched" }
   */
  async getLockerById(lockerID) {
    if (!lockerID) {
      throw new Error("Invalid locker ID: Locker ID is required.");
    }

    try {
      const url = API_ENDPOINTS.lockers.byId(lockerID);
      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const data = await this.handleResponse(response);
      return {
        success: true,
        data: data.locker || data,
        lockerID: lockerID,
        message: data.message || "Locker details fetched successfully.",
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Reserve a locker
   * @param {string|number} lockerID - Locker ID to reserve
   * @returns {Promise<Object>} Response with reservation details
   */
  async reserveLocker(lockerID) {
    if (!lockerID) {
      throw new Error("Invalid locker ID: Locker ID is required.");
    }

    try {
      const response = await fetch(API_ENDPOINTS.LOCKERS.RESERVE(lockerID), {
        method: "POST",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const data = await this.handleResponse(response);
      return {
        success: true,
        data: data,
        message: data.message || "Locker reserved successfully.",
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Release a locker reservation
   * @param {string|number} lockerID - Locker ID to release
   * @returns {Promise<Object>} Response with release confirmation
   */
  async releaseLocker(lockerID) {
    if (!lockerID) {
      throw new Error("Invalid locker ID: Locker ID is required.");
    }

    try {
      const response = await fetch(API_ENDPOINTS.LOCKERS.RELEASE(lockerID), {
        method: "POST",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const data = await this.handleResponse(response);
      return {
        success: true,
        data: data,
        message: data.message || "Locker released successfully.",
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get all lockers (admin function)
   * @returns {Promise<Object>} Response with all lockers
   */
  async getAllLockers() {
    try {
      const response = await fetch(API_ENDPOINTS.LOCKERS.ALL, {
        method: "GET",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const data = await this.handleResponse(response);
      return {
        success: true,
        data: data.lockers || data,
        message: data.message || "All lockers fetched successfully.",
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

// Export singleton instance
const lockerService = new LockerService();
export default lockerService;
