import React, { useState } from 'react';
import '../../assets/css/reservationForm.css';
import { showLoading, closeAlert, showSuccess, showError, showConfirm, } from "../../utils/notifications";
import RulesRegulations from "../../components/student/RulesRegulations";

const ReservationForm = ({ locker, onConfirm, onCancel, onShowRules }) => {
  const [duration, setDuration] = useState('1semester');
  const [paymentMode, setPaymentMode] = useState('');

  const handleConfirm = () => {
    if (!paymentMode) {
      showError("Payment Required", "Please select a mode of payment");
      return;
    }
    // showSuccess(`Locker ${locker.number} reserved successfully!`);
    onConfirm({ locker, duration, paymentMode });
    onShowRules();
    
  };


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          Do you want to reserve this locker?
        </h2>
        
        <div className="form-section">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Referral Slip No. :</span>
              <div className="info-value">2025110401</div>
            </div>
            <div className="info-item">
              <span className="info-label">Student ID :</span>
              <div className="info-value">202101104</div>
            </div>
            <div className="info-item">
              <span className="info-label">Reservation Date :</span>
              <div className="info-value">07-05-2025</div>
            </div>
            <div className="info-item">
              <span className="info-label">Locker ID :</span>
              <div className="info-value">{locker.number}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Choose Duration of Locker
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="duration"
                  value="1semester"
                  checked={duration === '1semester'}
                  onChange={(e) => setDuration(e.target.value)}
                  className="radio-input"
                />
                <span>1 Semester/Term</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="duration"
                  value="2semesters"
                  checked={duration === '2semesters'}
                  onChange={(e) => setDuration(e.target.value)}
                  className="radio-input"
                />
                <span>2 Semesters/Terms</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="duration"
                  value="1year"
                  checked={duration === '1year'}
                  onChange={(e) => setDuration(e.target.value)}
                  className="radio-input"
                />
                <span>1 School Year</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Choose Mode of Payment
            </label>
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