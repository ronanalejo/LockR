import api from "./api";
import Swal from "sweetalert2";

const PHP_BASE_URL =
  process.env.REACT_APP_PHP_URL || "http://localhost:80/backend/php";

const reservationService = {
  createReservation: async (data) => {
    try {
      const { lockerID, agreement, floorNumber, shsTerm, collegeTerm } = data;

      if (!lockerID || !agreement || !floorNumber) {
        throw new Error(
          "Missing required fields: lockerID, agreement, and floorNumber"
        );
      }

      const validAgreements = [
        "1 Semester/Term",
        "2 Semesters/Terms",
        "1 School Year",
      ];
      if (!validAgreements.includes(agreement)) {
        throw new Error("Invalid agreement type");
      }

      const validFloors = ["6", "7", "9", "10"];
      if (!validFloors.includes(floorNumber)) {
        throw new Error("Invalid floor number");
      }

      const response = await api.post("/reservations", {
        lockerID,
        agreement,
        floorNumber,
        shsTerm: shsTerm || null,
        collegeTerm: collegeTerm || null,
      });

      if (response.data.success) {
        await Swal.fire({
          icon: "success",
          title: "Reservation Created",
          text: `Your reservation has been created successfully. Referral Slip No: ${response.data.data.referralSlipNo}`,
          confirmButtonColor: "#3085d6",
        });
      }

      return response.data;
    } catch (error) {
      console.error("Create reservation error:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to create reservation";

      await Swal.fire({
        icon: "error",
        title: "Reservation Failed",
        text: message,
        confirmButtonColor: "#d33",
      });

      throw new Error(message);
    }
  },

  getReservationById: async (id) => {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid reservation ID");
      }

      const response = await api.get(`/reservations/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch reservation");
      }

      return response.data.data;
    } catch (error) {
      console.error("Get reservation error:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch reservation";

      throw new Error(message);
    }
  },

  updateReservation: async (id, data) => {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid reservation ID");
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error("No data provided for update");
      }

      const response = await api.put(`/reservations/${id}`, data);

      if (response.data.success) {
        await Swal.fire({
          icon: "success",
          title: "Reservation Updated",
          text: "Your reservation has been updated successfully",
          confirmButtonColor: "#3085d6",
          timer: 2000,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Update reservation error:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update reservation";

      await Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: message,
        confirmButtonColor: "#d33",
      });

      throw new Error(message);
    }
  },

  uploadReceipt: async (file, reservationID, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      if (!file) {
        throw new Error("No file provided");
      }

      if (!reservationID || isNaN(reservationID)) {
        throw new Error("Invalid reservation ID");
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Allowed: JPG, PNG, WEBP, PDF");
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size exceeds 5MB limit");
      }

      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("reservation_id", reservationID);

      const token = localStorage.getItem("token");

      const response = await fetch(`${PHP_BASE_URL}/api/upload.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Upload failed with status ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Upload failed");
      }

      await Swal.fire({
        icon: "success",
        title: "Receipt Uploaded",
        text: "Your payment receipt has been uploaded successfully",
        confirmButtonColor: "#3085d6",
        timer: 2000,
      });

      return result.data;
    } catch (error) {
      console.error("Upload receipt error:", error);

      if (retryCount < MAX_RETRIES && !error.message.includes("Invalid")) {
        console.log(`Retrying upload (${retryCount + 1}/${MAX_RETRIES})...`);

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (retryCount + 1))
        );

        return reservationService.uploadReceipt(
          file,
          reservationID,
          retryCount + 1
        );
      }

      await Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: error.message || "Failed to upload receipt",
        confirmButtonColor: "#d33",
      });

      throw error;
    }
  },

  getStudentReservations: async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        throw new Error("User not authenticated");
      }

      const user = JSON.parse(userStr);
      const studentID = user.studentID;

      if (!studentID) {
        throw new Error("Student ID not found");
      }

      const response = await api.get(
        `/reservations/students/${studentID}/reservations`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch reservations"
        );
      }

      return response.data.data;
    } catch (error) {
      console.error("Get student reservations error:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch reservations";

      throw new Error(message);
    }
  },

  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const backoffDelay = delay * Math.pow(2, i);
        console.log(
          `Request failed, retrying in ${backoffDelay}ms... (${
            i + 1
          }/${maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  },
};

export default reservationService;
