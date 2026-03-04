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
  missingLevels = [],
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState(null);

  const [formData, setFormData] = useState({
    academicLevel: "",
    startYear: "",
    endYear: "",
    semesterName: "",
    startDate: "",
    endDate: "",
    status: "UPCOMING",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const getCurrentYear = () => new Date().getFullYear();

  const getStartYearOptions = () => {
    const currentYear = getCurrentYear();
    return [currentYear - 1, currentYear];
  };

  const getEndYearOptions = () => {
    if (!formData.startYear) {
      return [];
    }
    const startYear = parseInt(formData.startYear);
    return [startYear + 1];
  };

  const getSemesterOptions = () => {
    if (formData.academicLevel === "SHS") {
      return ["1st Term", "2nd Term"];
    } else if (formData.academicLevel === "COLLEGE") {
      return ["1st Semester", "2nd Semester", "3rd Semester"];
    }
    return [];
  };

  const getStartDateConstraints = () => {
    if (!formData.startYear) {
      return { min: "", max: "" };
    }
    const year = parseInt(formData.startYear);
    return {
      min: `${year}-01-01`,
      max: `${year}-12-31`,
    };
  };

  const getEndDateConstraints = () => {
    if (!formData.endYear) {
      return { min: "", max: "" };
    }
    const year = parseInt(formData.endYear);
    return {
      min: `${year}-01-01`,
      max: `${year}-12-31`,
    };
  };

  const validateDateYear = (dateString, expectedYear, fieldName) => {
    if (!dateString || !expectedYear) {
      return null;
    }

    const date = new Date(dateString);
    const dateYear = date.getFullYear();

    if (dateYear !== parseInt(expectedYear)) {
      return `${fieldName} must be within the year ${expectedYear}.`;
    }

    return null;
  };

  useEffect(() => {
    if (isOpen) {
      // For two-step flow, determine which levels need setup
      const needsBothLevels =
        missingLevels.length === 2 || missingLevels.length === 0;

      if (editData) {
        // Edit mode - load existing data
        let startYear = "";
        let endYear = "";

        if (editData.academic_year && editData.academic_year.includes("-")) {
          const [start, end] = editData.academic_year.split("-");
          startYear = start;
          endYear = end;
        }

        setFormData({
          academicLevel: editData.academic_level || "",
          startYear: startYear,
          endYear: endYear,
          semesterName: editData.semester_name || "",
          startDate: editData.start_date
            ? editData.start_date.substring(0, 10)
            : "",
          endDate: editData.end_date ? editData.end_date.substring(0, 10) : "",
          status: editData.status || "UPCOMING",
        });
        setCurrentStep(1);
      } else {
        // New setup mode
        if (needsBothLevels) {
          // Two-step flow: Start with SHS
          setFormData({
            academicLevel: "SHS",
            startYear: "",
            endYear: "",
            semesterName: "",
            startDate: "",
            endDate: "",
            status: "UPCOMING",
          });
          setCurrentStep(1);
        } else {
          // Single step: Pre-fill with missing level
          const missingLevel = missingLevels[0] || academicLevel || "";
          setFormData({
            academicLevel: missingLevel,
            startYear: "",
            endYear: "",
            semesterName: "",
            startDate: "",
            endDate: "",
            status: "UPCOMING",
          });
          setCurrentStep(1);
        }
      }
      setStep1Data(null);
      setErrors({});
    }
  }, [editData, academicLevel, missingLevels, isOpen, setStep1Data]);

  useEffect(() => {
    if (formData.startYear && formData.endYear) {
      const startYear = parseInt(formData.startYear);
      const endYear = parseInt(formData.endYear);

      if (endYear !== startYear + 1) {
        setFormData((prev) => ({ ...prev, endYear: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startYear]);

  useEffect(() => {
    if (formData.academicLevel && formData.semesterName) {
      const validOptions = getSemesterOptions();

      if (!validOptions.includes(formData.semesterName)) {
        setFormData((prev) => ({ ...prev, semesterName: "" }));

        if (errors.semesterName) {
          setErrors((prev) => {
            const updated = { ...prev };
            delete updated.semesterName;
            return updated;
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.academicLevel]);

  useEffect(() => {
    if (formData.startYear && formData.startDate) {
      const yearError = validateDateYear(
        formData.startDate,
        formData.startYear,
        "Start Date",
      );
      if (yearError) {
        setFormData((prev) => ({ ...prev, startDate: "" }));
        if (errors.startDate) {
          setErrors((prev) => {
            const updated = { ...prev };
            delete updated.startDate;
            return updated;
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startYear]);

  useEffect(() => {
    if (formData.endYear && formData.endDate) {
      const yearError = validateDateYear(
        formData.endDate,
        formData.endYear,
        "End Date",
      );
      if (yearError) {
        setFormData((prev) => ({ ...prev, endDate: "" }));
        if (errors.endDate) {
          setErrors((prev) => {
            const updated = { ...prev };
            delete updated.endDate;
            return updated;
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.endYear]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.academicLevel) {
      newErrors.academicLevel = "Academic level is required.";
    }

    if (!formData.startYear) {
      newErrors.startYear = "Start year is required.";
    }

    if (!formData.endYear) {
      newErrors.endYear = "End year is required.";
    }

    if (formData.startYear && formData.endYear) {
      const startYear = parseInt(formData.startYear);
      const endYear = parseInt(formData.endYear);

      if (endYear !== startYear + 1) {
        newErrors.yearValidation =
          "End year must be exactly one year after start year.";
      }
    }

    if (!formData.semesterName) {
      newErrors.semesterName = "Semester name is required.";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required.";
    } else {
      const startDateYearError = validateDateYear(
        formData.startDate,
        formData.startYear,
        "Start Date",
      );
      if (startDateYearError) {
        newErrors.startDate = startDateYearError;
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required.";
    } else {
      const endDateYearError = validateDateYear(
        formData.endDate,
        formData.endYear,
        "End Date",
      );
      if (endDateYearError) {
        newErrors.endDate = endDateYearError;
      }
    }

    if (
      formData.startDate &&
      formData.endDate &&
      !newErrors.startDate &&
      !newErrors.endDate &&
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

    if (
      (field === "startYear" || field === "endYear") &&
      errors.yearValidation
    ) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.yearValidation;
        return updated;
      });
    }

    if (
      (field === "startDate" || field === "endDate") &&
      errors.dateValidation
    ) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.dateValidation;
        return updated;
      });
    }

    if (field === "startDate" && value && formData.startYear) {
      const yearError = validateDateYear(
        value,
        formData.startYear,
        "Start Date",
      );
      if (yearError) {
        setErrors((prev) => ({
          ...prev,
          startDate: yearError,
        }));
      }
    }

    if (field === "endDate" && value && formData.endYear) {
      const yearError = validateDateYear(value, formData.endYear, "End Date");
      if (yearError) {
        setErrors((prev) => ({
          ...prev,
          endDate: yearError,
        }));
      }
    }
  };

  const saveSemesterPeriod = async (data) => {
    const academicYear = `${data.startYear}-${data.endYear}`;

    const payload = {
      academic_level: data.academicLevel,
      academic_year: academicYear,
      semester_name: data.semesterName,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status,
    };

    if (editData && editData.id) {
      await semesterPeriodsService.updateSemesterPeriod(editData.id, payload);
    } else {
      await semesterPeriodsService.createSemesterPeriod(payload);
    }
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      showLoading("Saving SHS period...", "Please wait");

      await saveSemesterPeriod(formData);

      closeAlert();

      // Store step 1 data and move to step 2
      setStep1Data({ ...formData });

      // Reset form for COLLEGE
      setFormData({
        academicLevel: "COLLEGE",
        startYear: "",
        endYear: "",
        semesterName: "",
        startDate: "",
        endDate: "",
        status: "UPCOMING",
      });
      setErrors({});
      setCurrentStep(2);
    } catch (error) {
      closeAlert();
      showError(
        "Error",
        error?.message || "Failed to save SHS semester period.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      showLoading("Saving COLLEGE period...", "Please wait");

      await saveSemesterPeriod(formData);

      closeAlert();
      await showSuccess(
        "Success",
        "Semester periods for both SHS and COLLEGE have been configured successfully.",
      );

      if (onSave) onSave();
      onClose();
      setCurrentStep(1);
      setStep1Data(null);
    } catch (error) {
      closeAlert();
      showError(
        "Error",
        error?.message || "Failed to save COLLEGE semester period.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("sp-modal-backdrop")) {
      onClose();
      setCurrentStep(1);
      setStep1Data(null);
    }
  };

  const startDateConstraints = getStartDateConstraints();
  const endDateConstraints = getEndDateConstraints();

  const isEditMode = editData !== null;
  const isTwoStepMode =
    !isEditMode && (missingLevels.length === 2 || missingLevels.length === 0);

  return (
    <div className="sp-modal-backdrop" onClick={handleBackdropClick}>
      <div className="sp-modal">
        <div className="sp-modal-header">
          <h2>
            {isEditMode
              ? "Edit Semester Period"
              : isTwoStepMode
                ? `Setup Semester Periods - Step ${currentStep} of 2`
                : "Add Semester Period"}
          </h2>
          <button
            className="sp-close-btn"
            onClick={() => {
              onClose();
              setCurrentStep(1);
              setStep1Data(null);
            }}
          >
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
              disabled={saving || isTwoStepMode}
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
            <div className="sp-year-container">
              <select
                value={formData.startYear}
                onChange={(e) => handleChange("startYear", e.target.value)}
                disabled={saving}
                className="sp-year-select"
              >
                <option value="">Start Year</option>
                {getStartYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <span className="sp-year-separator">-</span>

              <select
                value={formData.endYear}
                onChange={(e) => handleChange("endYear", e.target.value)}
                disabled={saving || !formData.startYear}
                className="sp-year-select"
              >
                <option value="">End Year</option>
                {getEndYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {errors.startYear && (
              <span className="sp-error">{errors.startYear}</span>
            )}
            {errors.endYear && (
              <span className="sp-error">{errors.endYear}</span>
            )}
            {errors.yearValidation && (
              <span className="sp-error">{errors.yearValidation}</span>
            )}
          </div>

          {/* Semester Name */}
          <div className="sp-form-group">
            <label>Semester Name</label>
            <select
              value={formData.semesterName}
              onChange={(e) => handleChange("semesterName", e.target.value)}
              disabled={saving || !formData.academicLevel}
            >
              <option value="">Select Semester</option>
              {getSemesterOptions().map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
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
              disabled={saving || !formData.startYear}
              min={startDateConstraints.min}
              max={startDateConstraints.max}
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
              disabled={saving || !formData.endYear}
              min={endDateConstraints.min}
              max={endDateConstraints.max}
            />
            {errors.endDate && (
              <span className="sp-error">{errors.endDate}</span>
            )}
          </div>

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
          <button
            className="sp-btn-cancel"
            onClick={() => {
              onClose();
              setCurrentStep(1);
              setStep1Data(null);
            }}
            disabled={saving}
          >
            Cancel
          </button>

          {isTwoStepMode && currentStep === 1 ? (
            <button
              className="sp-btn-save"
              onClick={handleNext}
              disabled={saving}
            >
              {saving ? "Saving..." : "Next"}
            </button>
          ) : (
            <button
              className="sp-btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
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
  missingLevels: PropTypes.arrayOf(PropTypes.string),
};

export default SemesterPeriodModal;
