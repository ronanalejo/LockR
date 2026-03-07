import React, { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../config/api";
import editIcon from "../../assets/images/icons/edit-icon.svg";
import deleteIcon from "../../assets/images/icons/delete-icon.svg";
import settingsIcon from "../../assets/images/icons/settings-icon.svg";
import {
  showConfirm,
  showSuccess,
  showError,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import "../../assets/css/floorPlanManager.css";

const FLOORS = ["6", "7", "9", "10"];
const WINGS = ["Left Wing", "Right Wing"];
const EDITABLE_STATUSES = ["Available", "Reserved", "Unavailable"];

const FloorPlanManager = ({ onLockerChange }) => {
  const [selectedFloor, setSelectedFloor] = useState(FLOORS[0]);
  const [selectedWing, setSelectedWing] = useState(WINGS[0]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [lockers, setLockers] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [setModalOpen, setSetModalOpen] = useState(false);
  const [editLocker, setEditLocker] = useState(null);
  const [editForm, setEditForm] = useState({ floorNumber: "", status: "" });
  const [addForm, setAddForm] = useState({
    lockerID: "",
    wing: WINGS[0],
    setName: "",
    status: "Available",
  });
  const [addFormSets, setAddFormSets] = useState([]);
  const [setModalWing, setSetModalWing] = useState(WINGS[0]);
  const [setModalSets, setSetModalSets] = useState([]);
  const [newSetName, setNewSetName] = useState("");
  const [editingSetId, setEditingSetId] = useState(null);
  const [editingSetName, setEditingSetName] = useState("");

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

  const fetchSets = useCallback(async (floor, wing) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.lockerSets.byFloorAndWing(floor, wing),
        { headers: getAuthHeaders() },
      );
      const data = await response.json();
      if (data.success) {
        setSets(data.data || []);
      }
    } catch (err) {
      console.error("fetchSets error:", err);
    }
  }, []);

  const fetchSetModalSets = useCallback(async (floor, wing) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.lockerSets.byFloorAndWing(floor, wing),
        { headers: getAuthHeaders() },
      );
      const data = await response.json();
      if (data.success) {
        setSetModalSets(data.data || []);
      }
    } catch (err) {
      console.error("fetchSetModalSets error:", err);
    }
  }, []);

  const fetchAddFormSets = useCallback(async (floor, wing) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.lockerSets.byFloorAndWing(floor, wing),
        { headers: getAuthHeaders() },
      );
      const data = await response.json();
      if (data.success) {
        setAddFormSets(data.data || []);
      }
    } catch (err) {
      console.error("fetchAddFormSets error:", err);
    }
  }, []);

  useEffect(() => {
    fetchLockers(selectedFloor);
    setSelectedSet(null);
  }, [selectedFloor, fetchLockers]);

  useEffect(() => {
    fetchSets(selectedFloor, selectedWing);
    setSelectedSet(null);
  }, [selectedFloor, selectedWing, fetchSets]);

  useEffect(() => {
    if (setModalOpen) {
      fetchSetModalSets(selectedFloor, setModalWing);
    }
  }, [setModalOpen, setModalWing, selectedFloor, fetchSetModalSets]);

  useEffect(() => {
    if (addModalOpen) {
      fetchAddFormSets(selectedFloor, addForm.wing);
    }
  }, [addModalOpen, addForm.wing, selectedFloor, fetchAddFormSets]);

  const displayedLockers = lockers.filter((locker) => {
    if (locker.wing !== selectedWing) return false;
    if (selectedSet && locker.setName !== selectedSet) return false;
    return true;
  });

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedSet(null);
  };

  const handleWingSelect = (wing) => {
    setSelectedWing(wing);
    setSelectedSet(null);
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
      showError("Validation", "Locker Number is required.");
      return;
    }
    if (!addForm.wing) {
      showError("Validation", "Wing is required.");
      return;
    }
    if (!addForm.setName) {
      showError("Validation", "Set is required.");
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
          wing: addForm.wing,
          setName: addForm.setName,
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
      setAddForm({
        lockerID: "",
        wing: selectedWing,
        setName: "",
        status: "Available",
      });
      fetchLockers(selectedFloor);
      if (onLockerChange) onLockerChange();
    } catch (err) {
      closeAlert();
      console.error("handleAdd error:", err);
      showError("Error", "Failed to add locker.");
    }
  };

  const handleOpenSetModal = () => {
    setSetModalWing(selectedWing);
    setNewSetName("");
    setEditingSetId(null);
    setEditingSetName("");
    setSetModalOpen(true);
  };

  const handleAddSet = async () => {
    const trimmed = newSetName.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 1 || !/^[A-Z]$/.test(trimmed)) {
      showError(
        "Validation",
        "Set name must be a single letter (A-Z). Numbers are not allowed.",
      );
      return;
    }
    try {
      showLoading("Adding Set...", "Please wait");
      const response = await fetch(API_ENDPOINTS.lockerSets.base, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          floorNumber: selectedFloor,
          wing: setModalWing,
          setName: trimmed,
        }),
      });
      const data = await response.json();
      closeAlert();
      if (!response.ok) {
        showError("Error", data.error || data.message || "Failed to add set.");
        return;
      }
      showSuccess("Added", `Set ${trimmed} created.`);
      setNewSetName("");
      fetchSetModalSets(selectedFloor, setModalWing);
      fetchSets(selectedFloor, selectedWing);
    } catch (err) {
      closeAlert();
      console.error("handleAddSet error:", err);
      showError("Error", "Failed to add set.");
    }
  };

  const handleEditSet = (set) => {
    setEditingSetId(set.id);
    setEditingSetName(set.setName);
  };

  const handleSaveEditSet = async (setId) => {
    const trimmed = editingSetName.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 1 || !/^[A-Z]$/.test(trimmed)) {
      showError(
        "Validation",
        "Set name must be a single letter (A-Z). Numbers are not allowed.",
      );
      return;
    }
    try {
      showLoading("Saving...", "Please wait");
      const response = await fetch(
        `${API_ENDPOINTS.lockerSets.base}/${setId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ setName: trimmed }),
        },
      );
      const data = await response.json();
      closeAlert();
      if (!response.ok) {
        showError(
          "Error",
          data.error || data.message || "Failed to update set.",
        );
        return;
      }
      showSuccess("Updated", `Set updated to ${trimmed}.`);
      setEditingSetId(null);
      setEditingSetName("");
      fetchSetModalSets(selectedFloor, setModalWing);
      fetchSets(selectedFloor, selectedWing);
    } catch (err) {
      closeAlert();
      console.error("handleSaveEditSet error:", err);
      showError("Error", "Failed to update set.");
    }
  };

  const handleDeleteSet = async (set) => {
    const result = await showConfirm(
      `Delete Set ${set.setName} from Floor ${selectedFloor} — ${setModalWing}? This will not delete existing lockers in this set.`,
    );
    if (!result.isConfirmed) return;
    try {
      showLoading("Deleting...", "Please wait");
      const response = await fetch(
        `${API_ENDPOINTS.lockerSets.base}/${set.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      closeAlert();
      if (!response.ok) {
        showError("Error", data.message || "Failed to delete set.");
        return;
      }
      showSuccess("Deleted", `Set ${set.setName} has been deleted.`);
      if (selectedSet === set.setName) setSelectedSet(null);
      fetchSetModalSets(selectedFloor, setModalWing);
      fetchSets(selectedFloor, selectedWing);
    } catch (err) {
      closeAlert();
      console.error("handleDeleteSet error:", err);
      showError("Error", "Failed to delete set.");
    }
  };

  return (
    <div className="fpm-container">
      {/* Floor Navigation */}
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

      {/* Wing Navigation */}
      <div className="fpm-wing-nav">
        {WINGS.map((wing) => (
          <button
            key={wing}
            className={`fpm-wing-tab${selectedWing === wing ? " active" : ""}`}
            onClick={() => handleWingSelect(wing)}
          >
            {wing}
          </button>
        ))}
      </div>

      {/* Sets Section */}
      <div className="fpm-sets-section">
        <span className="fpm-sets-label">Sets</span>
        <button
          className="fpm-settings-btn"
          onClick={handleOpenSetModal}
          title="Manage Sets"
        >
          <img src={settingsIcon} alt="Manage Sets" />
        </button>
        {sets.map((set) => (
          <button
            key={set.id}
            className={`fpm-set-tab${selectedSet === set.setName ? " active" : ""}`}
            onClick={() =>
              setSelectedSet(selectedSet === set.setName ? null : set.setName)
            }
          >
            {set.setName}
          </button>
        ))}
      </div>

      {/* List Header */}
      <div className="fpm-list-header">
        <h3 className="fpm-list-title">
          Floor {selectedFloor} — {selectedWing}
          {selectedSet ? ` — Set ${selectedSet}` : ""} Lockers
        </h3>
        <button
          className="fpm-add-btn"
          onClick={() => {
            setAddForm({
              lockerID: "",
              wing: selectedWing,
              setName: "",
              status: "Available",
            });
            setAddModalOpen(true);
          }}
        >
          Add
        </button>
      </div>

      {/* Locker Table */}
      {loading ? (
        <div className="fpm-state-msg">Loading lockers...</div>
      ) : displayedLockers.length === 0 ? (
        <div className="fpm-state-msg">
          No lockers found for Floor {selectedFloor} — {selectedWing}
          {selectedSet ? ` — Set ${selectedSet}` : ""}.
        </div>
      ) : (
        <table className="fpm-table">
          <thead>
            <tr>
              <th>Locker Number</th>
              <th>Wing</th>
              <th>Set</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedLockers.map((locker) => (
              <tr key={locker.lockerID}>
                <td>{locker.lockerID}</td>
                <td>{locker.wing || "—"}</td>
                <td>{locker.setName || "—"}</td>
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

      {/* Edit Locker Modal */}
      {editModalOpen && editLocker && (
        <div className="fpm-overlay">
          <div className="fpm-modal">
            <h3 className="fpm-modal-title">Edit Locker</h3>
            <div className="fpm-field">
              <label>Locker Number</label>
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

      {/* Add Locker Modal */}
      {addModalOpen && (
        <div className="fpm-overlay">
          <div className="fpm-modal">
            <h3 className="fpm-modal-title">
              Add Locker — Floor {selectedFloor}
            </h3>
            <div className="fpm-field">
              <label>Locker Number</label>
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
              <label>Wing</label>
              <select
                value={addForm.wing}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    wing: e.target.value,
                    setName: "",
                  }))
                }
              >
                {WINGS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="fpm-field">
              <label>Set</label>
              <select
                value={addForm.setName}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, setName: e.target.value }))
                }
              >
                <option value="">Select a set</option>
                {addFormSets.map((s) => (
                  <option key={s.id} value={s.setName}>
                    {s.setName}
                  </option>
                ))}
              </select>
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

      {/* Set Management Modal */}
      {setModalOpen && (
        <div className="fpm-overlay">
          <div className="fpm-modal fpm-modal--sets">
            <h3 className="fpm-modal-title">
              Manage Sets — Floor {selectedFloor}
            </h3>
            <div className="fpm-field">
              <label>Wing</label>
              <select
                value={setModalWing}
                onChange={(e) => {
                  setSetModalWing(e.target.value);
                  setEditingSetId(null);
                  setNewSetName("");
                }}
              >
                {WINGS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="fpm-set-list">
              {setModalSets.length === 0 ? (
                <p className="fpm-set-empty">No sets yet for this wing.</p>
              ) : (
                setModalSets.map((set) => (
                  <div key={set.id} className="fpm-set-row">
                    {editingSetId === set.id ? (
                      <>
                        <input
                          className="fpm-set-name-input"
                          type="text"
                          maxLength={1}
                          value={editingSetName}
                          onChange={(e) => setEditingSetName(e.target.value)}
                        />
                        <button
                          className="fpm-btn fpm-btn--save fpm-btn--sm"
                          onClick={() => handleSaveEditSet(set.id)}
                        >
                          Save
                        </button>
                        <button
                          className="fpm-btn fpm-btn--cancel fpm-btn--sm"
                          onClick={() => setEditingSetId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="fpm-set-name">{set.setName}</span>
                        <div className="fpm-set-actions">
                          <button
                            className="fpm-icon-btn"
                            onClick={() => handleEditSet(set)}
                            title="Edit"
                          >
                            <img src={editIcon} alt="Edit" />
                          </button>
                          <button
                            className="fpm-icon-btn fpm-icon-btn--delete"
                            onClick={() => handleDeleteSet(set)}
                            title="Delete"
                          >
                            <img src={deleteIcon} alt="Delete" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="fpm-add-set-row">
              <input
                className="fpm-set-name-input"
                type="text"
                maxLength={1}
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="A"
              />
              <button
                className="fpm-btn fpm-btn--save fpm-btn--sm"
                onClick={handleAddSet}
              >
                Add Set
              </button>
            </div>

            <div className="fpm-modal-actions">
              <button
                className="fpm-btn fpm-btn--cancel"
                onClick={() => setSetModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanManager;
