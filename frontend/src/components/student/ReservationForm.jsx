import React, { useState } from "react";
import "../../assets/css/reservationForm.css";
import {
  showLoading,
  closeAlert,
  showSuccess,
  showError,
} from "../../utils/notifications";
import { API_ENDPOINTS } from "../../config/api";

const ReservationForm = ({
  locker,
  floor,
  onConfirm,
  onCancel,
  onShowRules,
}) => {
  const [duration, setDuration] = useState("1 Semester/Term");
  const [paymentMode, setPaymentMode] = useState("");

  const handleConfirm = async () => {
    if (!paymentMode) {
      showError("Payment Required", "Please select a mode of payment");
      return;
    }

    // Get user data to determine student type
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) {
      showError(
        "Authentication Error",
        "User data not found. Please log in again.",
      );
      return;
    }

    // Determine if SHS or College based on course_strand
    const isSHS =
      user.courseStrand?.toUpperCase().includes("STEM") ||
      user.courseStrand?.toUpperCase().includes("ABM") ||
      user.courseStrand?.toUpperCase().includes("HUMSS") ||
      user.courseStrand?.toUpperCase().includes("GAS");

    try {
      showLoading("Creating Reservation", "Please wait...");

      const token = localStorage.getItem("token");

      // Prepare request body with all required fields
      const requestBody = {
        lockerID: locker.number,
        agreement: duration,
        floorNumber: floor.toString(), // ← FIX: Add missing floorNumber
        shsTerm: isSHS ? "1" : null, // ← FIX: Add term based on student type
        collegeTerm: !isSHS ? "1" : null,
      };

      console.log("Sending reservation request:", requestBody);

      const response = await fetch(API_ENDPOINTS.reservations.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Reservation response:", data);

      if (!response.ok) {
        throw new Error(data.message || data.error || "Reservation failed");
      }

      closeAlert();

      // Pass reservation data including payment mode for later use
      onConfirm({
        locker,
        duration,
        paymentMode,
        floor,
        referralSlipNo: data.data.referralSlipNo,
      });

      onShowRules();
    } catch (error) {
      console.error("Reservation error:", error);
      closeAlert();
      showError("Reservation Failed", error.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Do you want to reserve this locker?</h2>

        <div className="form-section">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Referral Slip No. :</span>
              <div className="info-value">Pending...</div>
            </div>
            <div className="info-item">
              <span className="info-label">Student ID :</span>
              <div className="info-value">
                {JSON.parse(localStorage.getItem("user") || "{}").studentID ||
                  "N/A"}
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">Reservation Date :</span>
              <div className="info-value">
                {new Date().toLocaleDateString()}
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">Locker ID :</span>
              <div className="info-value">{locker.number}</div>
            </div>
            <div className="info-item">
              <span className="info-label">Floor :</span>
              <div className="info-value">{floor}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Agreement Term</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="duration"
                  value="1 Semester/Term"
                  checked={duration === "1 Semester/Term"}
                  onChange={(e) => setDuration(e.target.value)}
                />
                1 Semester/Term
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="duration"
                  value="2 Semesters/Terms"
                  checked={duration === "2 Semesters/Terms"}
                  onChange={(e) => setDuration(e.target.value)}
                />
                2 Semesters/Terms
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="duration"
                  value="1 School Year"
                  checked={duration === "1 School Year"}
                  onChange={(e) => setDuration(e.target.value)}
                />
                1 School Year
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Choose Mode of Payment</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="select-input"
            >
              <option value="">Select Payment...</option>
              <option value="cash">Cash</option>
              <option value="card">Credit/Debit Card</option>
              <option value="bank">Bank Transfer</option>
              <option value="online">Online Payment</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button onClick={handleConfirm} className="btn btn-confirm">
            Confirm
          </button>
          <button onClick={onCancel} className="btn btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationForm;
