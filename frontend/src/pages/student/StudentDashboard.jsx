import React, { useState, useEffect } from "react";
import "../../assets/css/dashboard.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  showConfirm,
  showSuccess,
  showLoading,
  closeAlert,
  showError,
} from "../../utils/notifications";
import { API_ENDPOINTS } from "../../config/api";
import LockerSelection from "./LockerSelection";
import LockerGrid from "../../components/student/LockerGrid";
import LockerCard from "../../components/student/LockerCard";
import ReservationForm from "../../components/student/ReservationForm";
import RulesRegulations from "../../components/student/RulesRegulations";
import EndorsementApproval from "../../components/student/EndorsementApproval";

const StudentDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState(() => {
    const savedFloor = localStorage.getItem("selectedFloor");
    return savedFloor ? parseInt(savedFloor, 10) : null;
  });

  const [selectedSide, setSelectedSide] = useState(null);
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [reservationData, setReservationData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEndorsement, setShowEndorsement] = useState(false);

  const floors = [6, 7, 9, 10];

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log("User object:", user);

  useEffect(() => {
    if (selectedFloor) {
      localStorage.setItem("selectedFloor", selectedFloor);
    }
  }, [selectedFloor]);

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedSide(null);
  };

  const handleSideSelect = (side) => {
    setSelectedSide(side);
  };

  const handleBackToFloorPlan = () => {
    setSelectedSide(null);
  };

  const handleSelectLocker = (locker) => {
    setSelectedLocker(locker);
  };

  const handleConfirmReservation = (reservationData) => {
    console.log("Reservation data prepared:", reservationData);
    setReservationData(reservationData);
    setSelectedLocker(null);
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleAcceptRules = async () => {
    if (!reservationData) return;

    try {
      showLoading("Creating Reservation", "Please wait...");

      const token = localStorage.getItem("token");

      const requestBody = {
        lockerID: reservationData.lockerID,
        agreement: reservationData.agreement,
        floorNumber: reservationData.floorNumber,
        shsTerm: reservationData.shsTerm,
        collegeTerm: reservationData.collegeTerm,
      };

      console.log("Sending reservation request:", requestBody);

      const response = await fetch(API_ENDPOINTS.reservations.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Reservation response:", data);

      if (!response.ok) {
        throw new Error(data.message || data.error || "Reservation failed");
      }

      closeAlert();

      showSuccess(
        `Locker ${reservationData.locker.number} reserved successfully!`,
      );

      setShowRules(false);
      setReservationData(null);
      setShowEndorsement(true);
    } catch (error) {
      console.error("Reservation error:", error);
      closeAlert();
      showError("Reservation Failed", error.message);
      setShowRules(false);
      setReservationData(null);
    }
  };

  const handleDeclineRules = () => {
    setShowRules(false);
    setReservationData(null);
    showSuccess("Reservation cancelled.");
  };

  const handleCancelReservation = () => {
    setSelectedLocker(null);
  };

  const handleCloseEndorsement = () => {
    showSuccess(
      `Locker ${reservationData.locker.number} reserved successfully!`,
    );
    setShowEndorsement(false);
    setReservationData(null);
  };

  const handleLogout = async () => {
    const result = await showConfirm("You will be logged out. Continue?");

    if (result.isConfirmed) {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="locker-dashboard">
      {/* Sidebar */}
      <div className="locker-sidebar">
        {/* Logo */}
        <div className="locker-sidebar-logo">
          <div className="locker-logo-container">
            <div className="locker-logo-icon">
              <div className="locker-logo-icon-inner"></div>
            </div>
            <div className="locker-logo-text">iACADEMY</div>
          </div>
        </div>

        {/* Search */}
        <div className="locker-search-container">
          <div className="locker-search-wrapper">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="locker-search-input"
            />
            <div className="locker-search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Floor Navigation */}
        <div className="locker-floor-nav">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => handleFloorSelect(floor)}
              className={`locker-floor-button ${
                selectedFloor === floor ? "active" : "inactive"
              }`}
            >
              Floor {floor}
            </button>
          ))}
        </div>

        {/* Log Out Button */}
        <div className="locker-logout-container">
          <button className="locker-logout-button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="locker-main-content">
        {/* Header */}
        <div className="locker-header">
          <h1 className="locker-header-title">
            Welcome, {user?.firstName} {user?.lastName || "Student"}
          </h1>
        </div>

        {/* Content Area */}
        <div className="locker-content-area">
          {!selectedFloor ? (
            // No floor selected
            <div className="locker-floor-display">
              <h2>Please select a floor to begin</h2>
              <p>Choose a floor from the sidebar to view available lockers</p>
            </div>
          ) : !selectedSide ? (
            // Floor selected, show FloorPlan
            <LockerSelection
              floor={selectedFloor}
              onSelectSide={handleSideSelect}
            />
          ) : (
            // Floor and side selected, show LockerGrid
            <LockerGrid
              floor={selectedFloor}
              side={selectedSide}
              onSelectLocker={handleSelectLocker}
              onBack={handleBackToFloorPlan}
            />
          )}
        </div>
      </div>

      {/* Reservation Form Modal */}
      {selectedLocker && (
        <ReservationForm
          locker={selectedLocker}
          floor={selectedFloor}
          onConfirm={handleConfirmReservation}
          onCancel={handleCancelReservation}
          onShowRules={handleShowRules}
        />
      )}

      {/* Rules and Regulations Modal */}
      {showRules && (
        <RulesRegulations
          onAccept={handleAcceptRules}
          onDecline={handleDeclineRules}
        />
      )}

      {showEndorsement && (
        <EndorsementApproval onClose={handleCloseEndorsement} />
      )}
    </div>
  );
};

export default StudentDashboard;
