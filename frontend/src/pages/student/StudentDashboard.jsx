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
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingAgreementData, setPendingAgreementData] = useState(null);
  const [showEndorsement, setShowEndorsement] = useState(false);
  const [showReservationLog, setShowReservationLog] = useState(false);
  const [userReservations, setUserReservations] = useState([]);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const floors = [6, 7, 9, 10];

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log("User object:", user);

  useEffect(() => {
    if (selectedFloor) {
      localStorage.setItem("selectedFloor", selectedFloor);
    }
  }, [selectedFloor]);

  useEffect(() => {
    const checkActiveReservationStatus = async () => {
      try {
        const reservationService =
          require("../../services/reservationService").default;
        const result = await reservationService.checkActiveReservation();

        if (result.success && result.hasActiveReservation) {
          setHasActiveReservation(true);
        } else {
          setHasActiveReservation(false);
        }
      } catch (error) {
        console.error("Failed to check active reservation:", error);
        setHasActiveReservation(false);
      }
    };

    checkActiveReservationStatus();
  }, []);

  useEffect(() => {
  const handleClickOutside = (e) => {
    if (menuOpen && !e.target.closest(".locker-sidebar") && !e.target.closest(".burger-menu-btn")) {
      setMenuOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [menuOpen]);

useEffect(() => {
  if (menuOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
  return () => { document.body.style.overflow = ""; };
}, [menuOpen]);

  const getBackgroundStyle = () => {
    if (!selectedFloor) return {};
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedSide(null);
    setMenuOpen(false);
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

      // Refresh active reservation status
      const reservationService =
        require("../../services/reservationService").default;
      try {
        const checkResult = await reservationService.checkActiveReservation();
        if (checkResult.success && checkResult.hasActiveReservation) {
          setHasActiveReservation(true);
        }
      } catch (error) {
        console.error("Failed to refresh reservation status:", error);
      }

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
    console.log("handleCloseEndorsement called");
    console.log("Current showEndorsement state:", showEndorsement);

    try {
      setShowEndorsement(false);
      setReservationData(null);

      setTimeout(() => {
        const lockerInfo = reservationData?.lockerID || "Your locker";
        showSuccess(
          "Reservation Submitted",
          `${lockerInfo} has been reserved successfully! Please wait for OSAS approval.`,
        );
      }, 100);
    } catch (error) {
      console.error("Error in handleCloseEndorsement:", error);
      setShowEndorsement(false);
    }
  };
  const handleLogout = async () => {
    const result = await showConfirm("You will be logged out. Continue?");

    if (result.isConfirmed) {
      logout();
      navigate("/login");
    }
  };

  const handleOpenReservationLog = async () => {
    setMenuOpen(false);
    try {
      showLoading("Loading Reservations", "Please wait...");

      const token = localStorage.getItem("token");

      if (!user || !user.studentID) {
        throw new Error("Student ID not found");
      }

      const response = await fetch(
        API_ENDPOINTS.reservations.byStudent(user.studentID),
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

      setUserReservations(data.data || data);
      setShowReservationLog(true);
      closeAlert();
    } catch (error) {
      console.error("Error fetching reservations:", error);
      closeAlert();
      showError("Error", error.message || "Failed to load reservations");
    }
  };

  const handleCloseReservationLog = () => {
    setShowReservationLog(false);
  };

  return (
    <div className="locker-dashboard">

      {menuOpen && (
              <div
                className="sidebar-overlay"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}

      {/* Sidebar */}
      <div className={`locker-sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        {/* Logo */}
        <div className="locker-sidebar-logo">
          <img id="iac-logo" src="../../WHITE_iACADEMY Long Logo_Makati.png" alt="iACADEMY" />
        </div>

        <button
          className="reservation-log-button"
          onClick={handleOpenReservationLog}
        >
          <span> 📋 My Reservations</span>
        </button>

        {/* Floor Navigation */}
        <div className="locker-floor-nav">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => !hasActiveReservation && handleFloorSelect(floor)}
              className={`locker-floor-button ${
                selectedFloor === floor ? "active" : "inactive"
              }`}
              disabled={hasActiveReservation}
              style={{
                opacity: hasActiveReservation ? 0.5 : 1,
                cursor: hasActiveReservation ? "not-allowed" : "pointer",
              }}
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

            <button className="burger-menu-btn" onClick={() => setMenuOpen((prev) => !prev)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
              <span className="mobile-floor-menu" aria-label="Toggle menu">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 18L20 18" stroke="#ffffff" stroke-width="2" stroke-linecap="round"></path> <path d="M4 12L20 12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"></path> <path d="M4 6L20 6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"></path> </g></svg>
            </span>
            </button>


            <h1 className="locker-header-title">
              Welcome, {user?.firstName} {user?.lastName || "Student"}
            </h1>

            <button className="mobile-logout-btn" onClick={handleLogout}>Log Out</button>

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
                hasActiveReservation={hasActiveReservation}
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
        <EndorsementApproval
          onClose={() => {
            console.log("EndorsementApproval onClose called");
            handleCloseEndorsement();
          }}
        />
      )}

      {/* Reservation Log Modal */}
      {showReservationLog && (
        <ReservationLog
          reservations={userReservations}
          onClose={handleCloseReservationLog}
          onReservationCancelled={async () => {
            setHasActiveReservation(false);
            const reservationService =
              require("../../services/reservationService").default;
            try {
              const result = await reservationService.checkActiveReservation();
              if (result.success && result.hasActiveReservation) {
                setHasActiveReservation(true);
              }
            } catch (error) {
              console.error("Failed to refresh reservation status:", error);
            }
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
