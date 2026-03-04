import React, { useState, useEffect, useCallback } from "react";
import semesterPeriodsService from "../../services/semesterPeriodsService";
import {
  showError,
  showConfirm,
  showSuccess,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import editIcon from "../../assets/images/icons/edit-icon.svg";
import deleteIcon from "../../assets/images/icons/delete-icon.svg";
import "../../assets/css/academicPeriodList.css";

const AcademicPeriodList = ({ onEdit, onRefreshKey }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await semesterPeriodsService.getAllSemesterPeriods();
      if (response.success) {
        setRecords(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch academic periods:", error);
      showError("Error", "Failed to load academic periods.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, onRefreshKey]);

  const handleDelete = async (record) => {
    const result = await showConfirm(
      `Are you sure you want to delete the ${record.semester_name} period for ${record.academic_level} (${record.academic_year})?`,
    );

    if (!result.isConfirmed) return;

    try {
      showLoading("Deleting...", "Please wait");
      await semesterPeriodsService.deleteSemesterPeriod(record.id);
      closeAlert();
      showSuccess("Deleted", "Academic period has been removed.");
      fetchRecords();
    } catch (error) {
      closeAlert();
      showError("Error", error?.message || "Failed to delete academic period.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return <div className="ap-loading">Loading academic periods...</div>;
  }

  if (records.length === 0) {
    return <div className="ap-empty">No academic periods found.</div>;
  }

  return (
    <div className="ap-list">
      {records.map((record) => (
        <div key={record.id} className="ap-card">
          {record.is_current && (
            <span className="ap-current-badge">CURRENT</span>
          )}
          <div className="ap-card-info">
            <div className="ap-card-title">
              {record.academic_level} - {record.semester_name}
            </div>
            <div className="ap-card-detail">
              Academic Year: {record.academic_year}
            </div>
            <div className="ap-card-detail">
              {formatDate(record.start_date)} - {formatDate(record.end_date)}
            </div>
          </div>
          <div className="ap-card-actions">
            <button
              className="ap-action-btn ap-edit-btn"
              onClick={() => onEdit(record)}
              title="Edit"
            >
              <img src={editIcon} alt="Edit" />
            </button>
            <button
              className="ap-action-btn ap-delete-btn"
              onClick={() => handleDelete(record)}
              title="Delete"
            >
              <img src={deleteIcon} alt="Delete" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AcademicPeriodList;
