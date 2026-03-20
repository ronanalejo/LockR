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
import ModifyLocationModal from "./ModifyLocationModal";

const FLOORS = ["6", "7", "9", "10"];
const WINGS = ["Left Wing", "Right Wing"];
const EDITABLE_STATUSES = ["Available", "Reserved", "Unavailable"];
const ROWS_PER_PAGE = 10;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rowDropdowns, setRowDropdowns] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [modifyLocationModalOpen, setModifyLocationModalOpen] = useState(false);
  const [modifyLocationLocker, setModifyLocationLocker] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const toggleRowDropdown = (lockerID) => {
    setRowDropdowns((prev) => ({
      ...prev,
      [lockerID]: !prev[lockerID],
    }));
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFloor, selectedWing, selectedSet, searchQuery, sortConfig]);

  const filteredLockers = lockers.filter((locker) => {
    if (locker.wing !== selectedWing) return false;
    if (selectedSet && locker.setName !== selectedSet) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesID = locker.lockerID?.toLowerCase().includes(q);
      const matchesSet = locker.setName?.toLowerCase().includes(q);
      const matchesStatus = locker.status?.toLowerCase().includes(q);
      if (!matchesID && !matchesSet && !matchesStatus) return false;
    }
    return true;
  });

  const sortedLockers = sortConfig.key
    ? [...filteredLockers].sort((a, b) => {
        const valA = (a[sortConfig.key] ?? "").toString().toLowerCase();
        const valB = (b[sortConfig.key] ?? "").toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      })
    : filteredLockers;

  const totalPages = Math.ceil(sortedLockers.length / ROWS_PER_PAGE);
  const paginatedLockers = sortedLockers.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedSet(null);
  };

  const handleWingSelect = (wing) => {
    setSelectedWing(wing);
    setSelectedSet(null);
  };

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
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
      {/* Table Header */}
      <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
        {/* Search Bar */}
        <div className="w-full md:w-1/2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2"
              placeholder="Search lockers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
          {/* Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="w-full md:w-auto flex items-center justify-center py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200"
              onClick={() => {
                setActionsOpen(!actionsOpen);
                setFilterOpen(false);
              }}
            >
              Actions
              <svg
                className="-mr-1 ml-1.5 w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                />
              </svg>
            </button>
            {actionsOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 bg-white rounded divide-y divide-gray-100 shadow">
                <ul className="py-1 text-sm text-gray-900 list-none p-0 m-0">
                  <li>
                    <button
                      type="button"
                      className="block w-full text-left py-2 px-4 text-sm text-gray-900 hover:bg-gray-100 focus:outline-none"
                      onClick={() => {
                        setAddForm({
                          lockerID: "",
                          wing: selectedWing,
                          setName: "",
                          status: "Available",
                        });
                        setAddModalOpen(true);
                        setActionsOpen(false);
                      }}
                    >
                      Add Locker
                    </button>
                  </li>
                </ul>
                <div className="py-1">
                  <button
                    type="button"
                    className="block w-full text-left py-2 px-4 text-sm text-gray-900 hover:bg-gray-100 focus:outline-none"
                    onClick={() => {
                      handleOpenSetModal();
                      setActionsOpen(false);
                    }}
                  >
                    Modify Sets
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left py-2 px-4 text-sm text-gray-900 hover:bg-gray-100 focus:outline-none"
                    onClick={() => {
                      setModifyLocationLocker({
                        floorNumber: selectedFloor,
                        wing: selectedWing,
                      });
                      setModifyLocationModalOpen(true);
                      setActionsOpen(false);
                    }}
                  >
                    Modify Location
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="w-full md:w-auto flex items-center justify-center py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:ring-4 focus:ring-gray-200"
              onClick={() => {
                setFilterOpen(!filterOpen);
                setActionsOpen(false);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="h-4 w-4 mr-2 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                  clipRule="evenodd"
                />
              </svg>
              Filter
              <svg
                className="-mr-1 ml-1.5 w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                />
              </svg>
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-10 z-20 w-64 p-3 bg-white rounded-lg shadow">
                {/* Floor Navigation */}
                <div className="mb-4">
                  <h6 className="mb-2 text-sm font-semibold text-gray-900">
                    Floor
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    {FLOORS.map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${selectedFloor === floor ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                        onClick={() => handleFloorSelect(floor)}
                      >
                        {floor}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wing Navigation */}
                <div className="mb-4">
                  <h6 className="mb-2 text-sm font-semibold text-gray-900">
                    Wing
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    {WINGS.map((wing) => (
                      <button
                        key={wing}
                        type="button"
                        className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${selectedWing === wing ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                        onClick={() => handleWingSelect(wing)}
                      >
                        {wing}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sets Section */}
                <div>
                  <h6 className="mb-2 text-sm font-semibold text-gray-900">
                    Set
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${selectedSet === null ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                      onClick={() => setSelectedSet(null)}
                    >
                      All
                    </button>
                    {sets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${selectedSet === set.setName ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                        onClick={() =>
                          setSelectedSet(
                            selectedSet === set.setName ? null : set.setName,
                          )
                        }
                      >
                        {set.setName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 table-fixed">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {[
                { key: "lockerID", label: "Locker Number", className: "w-48" },
                { key: "wing", label: "Wing", className: "w-36" },
                { key: "setName", label: "Set", className: "w-20" },
                { key: "status", label: "Status", className: "w-32" },
              ].map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 ${col.className} cursor-pointer select-none hover:bg-gray-100`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <svg
                      className={`w-3 h-3 transition-transform ${
                        sortConfig.key === col.key
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {sortConfig.key === col.key &&
                      sortConfig.direction === "asc" ? (
                        <path
                          fillRule="evenodd"
                          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      ) : (
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      )}
                    </svg>
                  </span>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  Loading lockers...
                </td>
              </tr>
            ) : filteredLockers.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No lockers found for Floor {selectedFloor} &mdash;{" "}
                  {selectedWing}
                  {selectedSet ? ` — Set ${selectedSet}` : ""}.
                </td>
              </tr>
            ) : (
              paginatedLockers.map((locker) => (
                <tr key={locker.lockerID} className="border-b border-gray-200">
                  <th
                    scope="row"
                    className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap"
                  >
                    {locker.lockerID}
                  </th>
                  <td className="px-4 py-3">{locker.wing || "—"}</td>
                  <td className="px-4 py-3">{locker.setName || "—"}</td>
                  <td className="px-4 py-3 w-36">
                    <span
                      className={`fpm-status-badge fpm-status--${locker.status.toLowerCase()}`}
                    >
                      {locker.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-16">
                    {locker.status !== "Occupied" && (
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex items-center p-1 text-sm font-medium text-center text-gray-900 bg-transparent border-0 rounded-lg hover:bg-gray-100 focus:outline-none"
                          onClick={() => toggleRowDropdown(locker.lockerID)}
                        >
                          <svg
                            className="w-5 h-5"
                            aria-hidden="true"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </button>
                        {rowDropdowns[locker.lockerID] && (
                          <div className="absolute right-0 z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow">
                            <ul className="py-1 text-sm text-gray-900 list-none p-0 m-0">
                              <li>
                                <button
                                  type="button"
                                  className="block w-full text-left py-2 px-4 hover:bg-gray-100 focus:outline-none"
                                  onClick={() => {
                                    handleEdit(locker);
                                    toggleRowDropdown(locker.lockerID);
                                  }}
                                >
                                  Edit
                                </button>
                              </li>
                            </ul>
                            <div className="py-1">
                              <button
                                type="button"
                                className="block w-full text-left py-2 px-4 text-sm text-gray-900 hover:bg-gray-100 focus:outline-none"
                                onClick={() => {
                                  handleDelete(locker);
                                  toggleRowDropdown(locker.lockerID);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4 border-t border-gray-200"
          aria-label="Locker table navigation"
        >
          <span className="text-sm font-normal text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {(currentPage - 1) * ROWS_PER_PAGE + 1}–
              {Math.min(currentPage * ROWS_PER_PAGE, sortedLockers.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">
              {sortedLockers.length}
            </span>
          </span>

          <ul className="inline-flex items-stretch -space-x-px list-none p-0 m-0">
            <li>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <svg
                  className="w-5 h-5"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>

            {(() => {
              const pages = [];
              const delta = 1;
              const left = currentPage - delta;
              const right = currentPage + delta;
              let prev = null;

              for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                  if (prev !== null && i - prev > 1) {
                    pages.push("...");
                  }
                  pages.push(i);
                  prev = i;
                }
              }

              return pages.map((page, idx) =>
                page === "..." ? (
                  <li key={`ellipsis-${idx}`}>
                    <span className="flex items-center justify-center text-sm py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300">
                      ...
                    </span>
                  </li>
                ) : (
                  <li key={page}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`flex items-center justify-center text-sm py-2 px-3 leading-tight border ${
                        currentPage === page
                          ? "z-10 text-blue-600 bg-blue-50 border-blue-300 hover:bg-blue-100 hover:text-blue-700"
                          : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  </li>
                ),
              );
            })()}

            <li>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <svg
                  className="w-5 h-5"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Edit Modal */}
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
      {modifyLocationModalOpen && modifyLocationLocker && (
        <ModifyLocationModal
          locker={modifyLocationLocker}
          floors={FLOORS}
          onClose={() => {
            setModifyLocationModalOpen(false);
            setModifyLocationLocker(null);
          }}
          onSaved={() => {
            setModifyLocationModalOpen(false);
            setModifyLocationLocker(null);
          }}
        />
      )}
    </div>
  );
};

export default FloorPlanManager;
