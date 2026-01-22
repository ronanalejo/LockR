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
import ReservationForm from "../../components/student/ReservationForm";
import RulesRegulations from "../../components/student/RulesRegulations";
import EndorsementApproval from "../../components/student/EndorsementApproval";
import OTPVerificationModal from "../../components/student/OTPVerificationModal";
import ReservationLog from "../../components/student/ReservationLog";

const StudentDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState(() => {
    const savedFloor = localStorage.getItem("selectedFloor");
    return savedFloor ? parseInt(savedFloor, 10) : null;
  });

  const [selectedSide, setSelectedSide] = useState(null);
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [reservationData, setReservationData] = useState(null);
  const [tempReservationData, setTempReservationData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingAgreementData, setPendingAgreementData] = useState(null);
  // const [searchQuery, setSearchQuery] = useState("");
  const [showEndorsement, setShowEndorsement] = useState(false);
  const [showReservationLog, setShowReservationLog] = useState(false);
  const [userReservations, setUserReservations] = useState([]);

  const floors = [6, 7, 9, 10];

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log("User object:", user);

  useEffect(() => {
    if (selectedFloor) {
      localStorage.setItem("selectedFloor", selectedFloor);
    }
  }, [selectedFloor]);

  const getBackgroundStyle = () => {
    if (!selectedFloor) return {};
  };

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
    setTempReservationData(reservationData);
    setSelectedLocker(null);
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleAcceptRules = async (agreementData) => {
    if (!tempReservationData) return;

    try {
      // Show loading while sending OTP
      showLoading("Sending Verification Code", "Please wait...");

      const token = localStorage.getItem("token");

      const response = await fetch(API_ENDPOINTS.otp.send, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      closeAlert();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send verification code");
      }

      // Store agreement data and show OTP modal
      setPendingAgreementData(agreementData);
      setShowOTPModal(true);
    } catch (error) {
      console.error("Send OTP error:", error);
      closeAlert();
      showError("Error", error.message || "Failed to send verification code");
    }
  };

  const handleOTPVerified = async () => {
    if (!tempReservationData || !pendingAgreementData) return;

    setShowOTPModal(false);

    try {
      showLoading(
        "Processing Agreement",
        "Generating document and sending confirmation...",
      );

      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const reservationPayload = {
        lockerID: tempReservationData.lockerID,
        duration: tempReservationData.duration,
        floorNumber: tempReservationData.floorNumber,
        shsTerm: tempReservationData.shsTerm,
        collegeTerm: tempReservationData.collegeTerm,
        program: pendingAgreementData.program,
        signature: pendingAgreementData.signature,
      };

      const response = await fetch(API_ENDPOINTS.reservations.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reservationPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create reservation");
      }

      closeAlert();

      await showSuccess(
        "Agreement Submitted Successfully!",
        "Your signed agreement has been sent to your email. Your reservation is now pending OSAS approval.",
      );

      setShowRules(false);
      setTempReservationData(null);
      setPendingAgreementData(null);
      setReservationData(data.reservation);
      setShowEndorsement(true);
    } catch (error) {
      console.error("Reservation error:", error);
      closeAlert();
      showError(
        "Submission Failed",
        error.message || "Failed to submit agreement",
      );
    }
  };

  const handleOTPCancel = () => {
    setShowOTPModal(false);
    setPendingAgreementData(null);
    showError(
      "Verification Cancelled",
      "Agreement submission was cancelled. Your progress has been saved.",
    );
  };

  const handleDeclineRules = () => {
    setShowRules(false);
    setTempReservationData(null);
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

  const handleOpenReservationLog = async () => {
    try {
      showLoading("Loading Reservations", "Please wait...");

      const token = localStorage.getItem("token");

      // Use user.id or user.userID depending on your user object structure
      const response = await fetch(
        `${API_ENDPOINTS.reservations.user}/${user.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch reservations");
      }

      setUserReservations(data);
      setShowReservationLog(true);
      closeAlert();
    } catch (error) {
      console.error("Error fetching reservations:", error);
      closeAlert();
      showError("Error", "Failed to load reservations");
    }
  };

  const handleCloseReservationLog = () => {
    setShowReservationLog(false);
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

        <button
          className="reservation-log-button"
          onClick={handleOpenReservationLog}
        >
          <span>My Reservations</span>
        </button>

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
      <div className="locker-main-content" style={getBackgroundStyle()}>
        {/* Header */}
        <div className="content-overlay">
          <div className="locker-header">
            <h1 className="locker-header-title">
              Welcome, {user?.firstName} {user?.lastName || "Student"}
            </h1>
          </div>

          <div className="locker-content-area">
            {!selectedFloor ? (
              <div className="locker-floor-display">
                <h2>Please select a floor to begin</h2>
                <p>Choose a floor from the sidebar to view available lockers</p>
              </div>
            ) : !selectedSide ? (
              <LockerSelection
                floor={selectedFloor}
                onSelectSide={handleSideSelect}
              />
            ) : (
              <LockerGrid
                floor={selectedFloor}
                side={selectedSide}
                onSelectLocker={handleSelectLocker}
                onBack={handleBackToFloorPlan}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedLocker && (
        <ReservationForm
          locker={selectedLocker}
          floor={selectedFloor}
          onConfirm={handleConfirmReservation}
          onCancel={handleCancelReservation}
          onShowRules={handleShowRules}
        />
      )}

      {showRules && (
        <RulesRegulations
          onAccept={handleAcceptRules}
          onDecline={handleDeclineRules}
          reservationData={tempReservationData}
        />
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <OTPVerificationModal
          email={user?.email}
          onVerified={handleOTPVerified}
          onCancel={handleOTPCancel}
        />
      )}

      {showEndorsement && (
        <EndorsementApproval onClose={handleCloseEndorsement} />
      )}

      {/* Reservation Log Modal */}
      {showReservationLog && (
        <ReservationLog
          reservations={userReservations}
          onClose={handleCloseReservationLog}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
