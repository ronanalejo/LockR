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
  const [accountNumber, setAccountNumber] = useState("");

  const handleConfirm = () => {
    if (!paymentMode) {
      showError("Payment Required", "Please select a mode of payment");
      return;
    }

    // Validate account number for non-cash payments
    if (paymentMode.toLowerCase() !== "cash" && !accountNumber.trim()) {
      showError(
        "Account Number Required",
        "Please enter your account number for the selected payment method",
      );
      return;
    }

    if (!floor) {
      showError(
        "Invalid Floor",
        "Floor information is missing. Please try again.",
      );
      return;
    }

    if (!locker || !locker.number) {
      showError("Error", "Invalid locker selected");
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

    const isSHS = user.student_type?.toUpperCase() === "SHS";

    const reservationData = {
      locker: {
        number: locker.number,
        id: locker.id,
        status: locker.status,
      },
      duration,
      paymentMode,
      accountNumber:
        paymentMode.toLowerCase() !== "cash" ? accountNumber : null,
      floor,
      lockerID: locker.number,
      agreement: duration,
      floorNumber: floor ? floor.toString() : "",
      shsTerm: isSHS ? "1" : null,
      collegeTerm: !isSHS ? "1" : null,
    };

    onConfirm(reservationData);
    onShowRules();
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
              onChange={(e) => {
                setPaymentMode(e.target.value);
                if (e.target.value.toLowerCase() === "cash") {
                  setAccountNumber("");
                }
              }}
              className="select-input"
            >
              <option value="">Select Payment...</option>
              <option value="cash">Cash</option>
              <option value="card">Credit/Debit Card</option>
              <option value="bank">Bank Transfer</option>
              <option value="online">Online Payment</option>
            </select>
          </div>

          {paymentMode && paymentMode.toLowerCase() !== "cash" && (
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="text-input"
                placeholder="Enter your account number"
              />
            </div>
          )}
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
