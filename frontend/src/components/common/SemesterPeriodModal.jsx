import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  showSuccess,
  showError,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import semesterPeriodsService from "../../services/semesterPeriodsService";
import "../../assets/css/semesterPeriodModal.css";

const SemesterPeriodModal = ({
  isOpen,
  onClose,
  onSave,
  editData = null,
  academicLevel = "",
}) => {
  const [formData, setFormData] = useState({
    academicLevel: "",
    academicYear: "",
    semesterName: "",
    startDate: "",
    endDate: "",
    status: "UPCOMING",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        academicLevel: editData.academic_level || "",
        academicYear: editData.academic_year || "",
        semesterName: editData.semester_name || "",
        startDate: editData.start_date
          ? editData.start_date.substring(0, 10)
          : "",
        endDate: editData.end_date ? editData.end_date.substring(0, 10) : "",
        status: editData.status || "UPCOMING",
      });
    } else {
      setFormData({
        academicLevel: academicLevel || "",
        academicYear: "",
        semesterName: "",
        startDate: "",
        endDate: "",
        status: "UPCOMING",
      });
    }
    setErrors({});
  }, [editData, academicLevel, isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.academicLevel) {
      newErrors.academicLevel = "Academic level is required.";
    }

    if (!formData.academicYear) {
      newErrors.academicYear = "Academic year is required.";
    } else if (!/^\d{4}-\d{4}$/.test(formData.academicYear)) {
      newErrors.academicYear = "Format must be YYYY-YYYY (e.g., 2025-2026).";
    }

    if (!formData.semesterName) {
      newErrors.semesterName = "Semester name is required.";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required.";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required.";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate >= formData.endDate
    ) {
      newErrors.dateValidation = "Start date must be before end date.";
    }

    if (!formData.status) {
      newErrors.status = "Status is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      showLoading(
        "Saving...",
        "Please wait while we save the semester period.",
      );

      const payload = {
        academic_level: formData.academicLevel,
        academic_year: formData.academicYear,
        semester_name: formData.semesterName,
        start_date: formData.startDate,
        end_date: formData.endDate,
        status: formData.status,
      };

      if (editData && editData.id) {
        await semesterPeriodsService.updateSemesterPeriod(editData.id, payload);
      } else {
        await semesterPeriodsService.createSemesterPeriod(payload);
      }

      closeAlert();
      await showSuccess(
        "Success",
        editData
          ? "Semester period updated successfully."
          : "Semester period created successfully.",
      );

      if (onSave) onSave();
      onClose();
    } catch (error) {
      closeAlert();
      showError("Error", error?.message || "Failed to save semester period.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("sp-modal-backdrop")) {
      onClose();
    }
  };

  return (
    <div className="sp-modal-backdrop" onClick={handleBackdropClick}>
      <div className="sp-modal">
        <div className="sp-modal-header">
          <h2>{editData ? "Edit Semester Period" : "Add Semester Period"}</h2>
          <button className="sp-close-btn" onClick={onClose}>
            X
          </button>
        </div>

        <div className="sp-modal-body">
          {/* Academic Level */}
          <div className="sp-form-group">
            <label>Academic Level</label>
            <select
              value={formData.academicLevel}
              onChange={(e) => handleChange("academicLevel", e.target.value)}
              disabled={saving}
            >
              <option value="">Select Level</option>
              <option value="SHS">SHS</option>
              <option value="COLLEGE">COLLEGE</option>
            </select>
            {errors.academicLevel && (
              <span className="sp-error">{errors.academicLevel}</span>
            )}
          </div>

          {/* Academic Year */}
          <div className="sp-form-group">
            <label>Academic Year</label>
            <input
              type="text"
              placeholder="e.g., 2025-2026"
              value={formData.academicYear}
              onChange={(e) => handleChange("academicYear", e.target.value)}
              disabled={saving}
            />
            {errors.academicYear && (
              <span className="sp-error">{errors.academicYear}</span>
            )}
          </div>

          {/* Semester Name */}
          <div className="sp-form-group">
            <label>Semester Name</label>
            <select
              value={formData.semesterName}
              onChange={(e) => handleChange("semesterName", e.target.value)}
              disabled={saving}
            >
              <option value="">Select Semester</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer/3rd Term">Summer/3rd Term</option>
            </select>
            {errors.semesterName && (
              <span className="sp-error">{errors.semesterName}</span>
            )}
          </div>

          {/* Start Date */}
          <div className="sp-form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              disabled={saving}
            />
            {errors.startDate && (
              <span className="sp-error">{errors.startDate}</span>
            )}
          </div>

          {/* End Date */}
          <div className="sp-form-group">
            <label>End Date</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              disabled={saving}
            />
            {errors.endDate && (
              <span className="sp-error">{errors.endDate}</span>
            )}
          </div>

          {/* Date Validation Error */}
          {errors.dateValidation && (
            <div className="sp-error">{errors.dateValidation}</div>
          )}

          {/* Status */}
          <div className="sp-form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              disabled={saving}
            >
              <option value="UPCOMING">UPCOMING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            {errors.status && <span className="sp-error">{errors.status}</span>}
          </div>
        </div>

        <div className="sp-modal-footer">
          <button className="sp-btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="sp-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

SemesterPeriodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  editData: PropTypes.object,
  academicLevel: PropTypes.oneOf(["SHS", "COLLEGE", ""]),
};

export default SemesterPeriodModal;
