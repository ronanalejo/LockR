import React, { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../config/api";
import editIcon from "../../assets/images/icons/edit-icon.svg";
import deleteIcon from "../../assets/images/icons/delete-icon.svg";
import {
  showConfirm,
  showSuccess,
  showError,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import "../../assets/css/floorPlanManager.css";

const FLOORS = ["6", "7", "9", "10"];
const EDITABLE_STATUSES = ["Available", "Reserved", "Unavailable"];

const FloorPlanManager = ({ onLockerChange }) => {
  const [selectedFloor, setSelectedFloor] = useState(FLOORS[0]);
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editLocker, setEditLocker] = useState(null);
  const [editForm, setEditForm] = useState({ floorNumber: "", status: "" });
  const [addForm, setAddForm] = useState({ lockerID: "", status: "Available" });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchLockers = useCallback(async (floor) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.lockers.byFloor(floor), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setLockers(data.data?.lockers || []);
      } else {
        showError("Error", data.message || "Failed to load lockers.");
      }
    } catch (err) {
      console.error("fetchLockers error:", err);
      showError("Error", "Failed to load lockers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLockers(selectedFloor);
  }, [selectedFloor, fetchLockers]);

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
  };

  const handleEdit = (locker) => {
    setEditLocker(locker);
    setEditForm({ floorNumber: locker.floorNumber, status: locker.status });
    setEditModalOpen(true);
  };

  const handleDelete = async (locker) => {
    const isReserved = locker.status === "Reserved";
    const msg = isReserved
      ? `Locker ${locker.lockerID} currently has an active reservation. Deleting it will reject that reservation. Are you sure?`
      : `Are you sure you want to delete locker ${locker.lockerID}?`;

    const result = await showConfirm(msg);
    if (!result.isConfirmed) return;

    try {
      showLoading("Deleting...", "Please wait");
      const response = await fetch(
        API_ENDPOINTS.lockers.byId(locker.lockerID),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      closeAlert();
      if (!response.ok) {
        showError("Error", data.message || "Failed to delete locker.");
        return;
      }
      showSuccess("Deleted", `Locker ${locker.lockerID} has been deleted.`);
      fetchLockers(selectedFloor);
      if (onLockerChange) onLockerChange();
    } catch (err) {
      closeAlert();
      console.error("handleDelete error:", err);
      showError("Error", "Failed to delete locker.");
    }
  };

  const handleEditSave = async () => {
    if (!editLocker) return;

    const isReserved = editLocker.status === "Reserved";
    if (isReserved) {
      const result = await showConfirm(
        `Locker ${editLocker.lockerID} currently has an active reservation. Saving changes will reject that reservation. Are you sure?`,
      );
      if (!result.isConfirmed) return;
    }

    try {
      showLoading("Saving...", "Please wait");
      const response = await fetch(
        API_ENDPOINTS.lockers.byId(editLocker.lockerID),
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            floorNumber: editForm.floorNumber,
            status: editForm.status,
          }),
        },
      );
      const data = await response.json();
      closeAlert();
      if (!response.ok) {
        showError("Error", data.message || "Failed to update locker.");
        return;
      }
      showSuccess("Updated", `Locker ${editLocker.lockerID} has been updated.`);
      setEditModalOpen(false);
      fetchLockers(selectedFloor);
      if (onLockerChange) onLockerChange();
    } catch (err) {
      closeAlert();
      console.error("handleEditSave error:", err);
      showError("Error", "Failed to update locker.");
    }
  };

  const handleAdd = async () => {
    const trimmedID = addForm.lockerID.trim();
    if (!trimmedID) {
      showError("Validation", "Locker ID is required.");
      return;
    }

    const branchID = lockers[0]?.branchID || "IAC-MAIN";

    try {
      showLoading("Adding...", "Please wait");
      const response = await fetch(API_ENDPOINTS.lockers.base, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lockerID: trimmedID,
          branchID,
          floorNumber: selectedFloor,
          status: addForm.status,
        }),
      });
      const data = await response.json();
      closeAlert();
      if (!response.ok) {
        showError("Error", data.message || "Failed to add locker.");
        return;
      }
      showSuccess("Added", `Locker ${trimmedID} has been added.`);
      setAddModalOpen(false);
      setAddForm({ lockerID: "", status: "Available" });
      fetchLockers(selectedFloor);
      if (onLockerChange) onLockerChange();
    } catch (err) {
      closeAlert();
      console.error("handleAdd error:", err);
      showError("Error", "Failed to add locker.");
    }
  };

  return (
    <div className="fpm-container">
      <div className="fpm-floor-nav">
        <span className="fpm-floors-label">Floors</span>
        {FLOORS.map((floor) => (
          <button
            key={floor}
            className={`fpm-floor-tab${selectedFloor === floor ? " active" : ""}`}
            onClick={() => handleFloorSelect(floor)}
          >
            {floor}
          </button>
        ))}
      </div>

      <div className="fpm-list-header">
        <h3 className="fpm-list-title">Floor {selectedFloor} Lockers</h3>
        <button className="fpm-add-btn" onClick={() => setAddModalOpen(true)}>
          Add
        </button>
      </div>

      {loading ? (
        <div className="fpm-state-msg">Loading lockers...</div>
      ) : lockers.length === 0 ? (
        <div className="fpm-state-msg">
          No lockers found for Floor {selectedFloor}.
        </div>
      ) : (
        <table className="fpm-table">
          <thead>
            <tr>
              <th>Locker ID</th>
              <th>Floor</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lockers.map((locker) => (
              <tr key={locker.lockerID}>
                <td>{locker.lockerID}</td>
                <td>{locker.floorNumber}</td>
                <td>
                  <span
                    className={`fpm-status-badge fpm-status--${locker.status.toLowerCase()}`}
                  >
                    {locker.status}
                  </span>
                </td>
                <td className="fpm-actions-cell">
                  {locker.status !== "Occupied" && (
                    <>
                      <button
                        className="fpm-icon-btn"
                        onClick={() => handleEdit(locker)}
                        title="Edit"
                      >
                        <img src={editIcon} alt="Edit" />
                      </button>
                      <button
                        className="fpm-icon-btn fpm-icon-btn--delete"
                        onClick={() => handleDelete(locker)}
                        title="Delete"
                      >
                        <img src={deleteIcon} alt="Delete" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editModalOpen && editLocker && (
        <div className="fpm-overlay">
          <div className="fpm-modal">
            <h3 className="fpm-modal-title">Edit Locker</h3>
            <div className="fpm-field">
              <label>Locker ID</label>
              <input type="text" value={editLocker.lockerID} disabled />
            </div>
            <div className="fpm-field">
              <label>Floor Number</label>
              <select
                value={editForm.floorNumber}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    floorNumber: e.target.value,
                  }))
                }
              >
                {FLOORS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="fpm-field">
              <label>Status</label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {EDITABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="fpm-modal-actions">
              <button
                className="fpm-btn fpm-btn--save"
                onClick={handleEditSave}
              >
                Save
              </button>
              <button
                className="fpm-btn fpm-btn--cancel"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div className="fpm-overlay">
          <div className="fpm-modal">
            <h3 className="fpm-modal-title">
              Add Locker — Floor {selectedFloor}
            </h3>
            <div className="fpm-field">
              <label>Locker ID</label>
              <input
                type="text"
                value={addForm.lockerID}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, lockerID: e.target.value }))
                }
                placeholder={`e.g. L${selectedFloor}-031`}
              />
            </div>
            <div className="fpm-field">
              <label>Status</label>
              <select
                value={addForm.status}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {EDITABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="fpm-modal-actions">
              <button className="fpm-btn fpm-btn--save" onClick={handleAdd}>
                Add
              </button>
              <button
                className="fpm-btn fpm-btn--cancel"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanManager;
