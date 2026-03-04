import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  showSuccess,
  showError,
  showLoading,
  showConfirm,
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
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [serverYear, setServerYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchServerYear = async () => {
      try {
        const res = await semesterPeriodsService.getServerTime();
        if (res.success && res.data?.year) {
          setServerYear(res.data.year);
        }
      } catch (e) {
        console.error("Failed to fetch server time, using local year");
      }
    };
    fetchServerYear();
  }, []);

  const getAcademicYearOptions = () => {
    const options = [];
    for (let i = 0; i < 5; i++) {
      const sy = serverYear + i;
      options.push(`${sy}-${sy + 1}`);
    }
    return options;
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
    return { min: "", max: "" };
  };

  const getEndDateConstraints = () => {
    return { min: "", max: "" };
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
        });
        setCurrentStep(1);
      } else {
        // New insert mode
        setFormData({
          academicLevel: "",
          startYear: "",
          endYear: "",
          semesterName: "",
          startDate: "",
          endDate: "",
        });
        setCurrentStep(1);
      }
      setStep1Data(null);
      setErrors({});
    }
  }, [editData, academicLevel, missingLevels, isOpen, setStep1Data]);

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

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.academicLevel) {
      newErrors.academicLevel = "Academic level is required.";
    }

    if (!formData.semesterName) {
      newErrors.semesterName = "Semester name is required.";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required.";
    } else if (formData.startYear && formData.endYear) {
      const sdYear = new Date(formData.startDate).getFullYear();
      const sy = parseInt(formData.startYear);
      const ey = parseInt(formData.endYear);
      if (sdYear !== sy && sdYear !== ey) {
        newErrors.startDate = `Start Date year must be within Academic Year ${sy}-${ey}.`;
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required.";
    } else if (formData.startYear && formData.endYear) {
      const edYear = new Date(formData.endDate).getFullYear();
      const sy = parseInt(formData.startYear);
      const ey = parseInt(formData.endYear);
      if (edYear !== sy && edYear !== ey) {
        newErrors.endDate = `End Date year must be within Academic Year ${sy}-${ey}.`;
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
  };

  const saveSemesterPeriod = async (data) => {
    const academicYear = `${data.startYear}-${data.endYear}`;

    const payload = {
      academic_level: data.academicLevel,
      academic_year: academicYear,
      semester_name: data.semesterName,
      start_date: data.startDate,
      end_date: data.endDate,
    };

    if (editData && editData.id) {
      await semesterPeriodsService.updateSemesterPeriod(editData.id, payload);
    } else {
      await semesterPeriodsService.createSemesterPeriod(payload);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const confirmResult = await showConfirm(
      editData
        ? "Are you sure you want to update this academic period?"
        : "Are you sure you want to insert this academic period?",
    );
    if (!confirmResult.isConfirmed) return;

    setSaving(true);
    try {
      showLoading("Saving...", "Please wait");

      await saveSemesterPeriod(formData);

      closeAlert();
      await showSuccess(
        "Success",
        editData
          ? "Academic period updated successfully."
          : "Academic period inserted successfully.",
      );

      if (onSave) onSave();
      onClose();
      setCurrentStep(1);
      setStep1Data(null);
    } catch (error) {
      closeAlert();
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save academic period.";
      showError("Error", msg);
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

  const isEditMode = editData !== null;

  return (
    <div className="sp-modal-backdrop" onClick={handleBackdropClick}>
      <div className="sp-modal">
        <div className="sp-modal-header">
          <h2>
            {isEditMode ? "Edit Semester Period" : "Insert Academic Period"}
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
            <select
              value={
                formData.startYear
                  ? `${formData.startYear}-${formData.endYear}`
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const [sy, ey] = val.split("-");
                  handleChange("startYear", sy);
                  handleChange("endYear", ey);
                } else {
                  handleChange("startYear", "");
                  handleChange("endYear", "");
                }
              }}
              disabled={saving}
            >
              <option value="">Select Academic Year</option>
              {getAcademicYearOptions().map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.startYear && (
              <span className="sp-error">{errors.startYear}</span>
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

          {errors.dateValidation && (
            <div className="sp-error">{errors.dateValidation}</div>
          )}
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
  missingLevels: PropTypes.arrayOf(PropTypes.string),
};

export default SemesterPeriodModal;
