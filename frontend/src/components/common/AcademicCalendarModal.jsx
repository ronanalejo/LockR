import React, { useState } from "react";
import "../../assets/css/academicCalendarModal.css";
import {
  showSuccess,
  showError,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import academicCalendarService from "../../services/academicCalendarService";

const AcademicCalendarModal = ({ isOpen, onClose, onSaved }) => {
  const [semester, setSemester] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!semester) newErrors.semester = "Semester is required.";
    if (!startDate) newErrors.startDate = "Start date is required.";
    if (!endDate) newErrors.endDate = "End date is required.";

    if (startDate && endDate && startDate >= endDate) {
      newErrors.dateValidation = "Start date must be before end date.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      showLoading("Saving...", "Please wait while we save the calendar.");

      await academicCalendarService.createAcademicCalendar({
        semester,
        semesterStartDate: startDate,
        semesterEndDate: endDate,
      });

      closeAlert();
      await showSuccess("Success", "Academic calendar saved successfully.");

      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      closeAlert();
      showError(
        "Error",
        error?.response?.data?.message || "Failed to save academic calendar.",
      );
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="academic-modal">
        <div className="modal-header">
          <h2>Initial Academic Calendar Setup</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Semester */}
          <div className="form-group">
            <label>Current Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">Select Semester</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="3rd Semester">3rd Semester</option>
            </select>
            {errors.semester && (
              <span className="error-text">{errors.semester}</span>
            )}
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label>Semester Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            {errors.startDate && (
              <span className="error-text">{errors.startDate}</span>
            )}
          </div>

          {/* End Date */}
          <div className="form-group">
            <label>Semester End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {errors.endDate && (
              <span className="error-text">{errors.endDate}</span>
            )}
          </div>

          {/* Date Validation */}
          {errors.dateValidation && (
            <div className="error-text">{errors.dateValidation}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendarModal;
