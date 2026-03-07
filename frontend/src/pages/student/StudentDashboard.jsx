import React, { useState, useEffect, useRef } from "react";
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
import semesterPeriodsService from "../../services/semesterPeriodsService";

const StudentDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState(() => {
    const savedFloor = localStorage.getItem("selectedFloor");
    return savedFloor ? parseInt(savedFloor, 10) : 6;
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
  const [isWithinOperatingHours, setIsWithinOperatingHours] = useState(null);
  const timeGateIntervalRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(window.innerWidth <= 640);

  const floors = [6, 7, 9, 10];

  const checkOperatingHours = async () => {
    try {
      const result = await semesterPeriodsService.getServerTime();
      if (!result.success || result.data?.day === undefined) return;
      const { day, hour, minute } = result.data;
      const totalMinutes = hour * 60 + minute;
      const isTueToSat = day >= 2 && day <= 6;
      const isInTimeRange = totalMinutes >= 480 && totalMinutes <= 990;
      setIsWithinOperatingHours(isTueToSat && isInTimeRange);
    } catch (err) {
      console.error("Failed to check operating hours:", err);
    }
  };

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log("User object:", user);

  useEffect(() => {
    if (selectedFloor) {
      localStorage.setItem("selectedFloor", selectedFloor);
    }
  }, [selectedFloor]);

  useEffect(() => {
    checkOperatingHours();
    timeGateIntervalRef.current = setInterval(checkOperatingHours, 5000);
    return () => {
      if (timeGateIntervalRef.current)
        clearInterval(timeGateIntervalRef.current);
    };
  }, []);

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

    // Poll for updates every 10 seconds
    const interval = setInterval(checkActiveReservationStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuOpen &&
        !e.target.closest(".locker-sidebar") &&
        !e.target.closest(".burger-menu-btn")
      ) {
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
    return () => {
      document.body.style.overflow = "";
    };
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
        paymentMode: tempReservationData.paymentMode,
        accountNumber: tempReservationData.accountNumber || null,
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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          <img
            id="iac-logo"
            src="../../WHITE_iACADEMY Long Logo_Makati.png"
            alt="iACADEMY"
          />
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
              onClick={() =>
                !hasActiveReservation &&
                isWithinOperatingHours &&
                handleFloorSelect(floor)
              }
              className={`locker-floor-button ${
                selectedFloor === floor ? "active" : "inactive"
              }`}
              disabled={hasActiveReservation || !isWithinOperatingHours}
              style={{
                opacity:
                  hasActiveReservation || !isWithinOperatingHours ? 0.5 : 1,
                cursor:
                  hasActiveReservation || !isWithinOperatingHours
                    ? "not-allowed"
                    : "pointer",
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
        {isWithinOperatingHours === null ? null : !isWithinOperatingHours ? (
          <div className="locker-unavailable-notice">
            <p>
              You are not allowed to make locker reservations at this time.
              LockR is only available from Tuesday to Saturday at 8AM to 4:30PM.
              Reservations made after the said time are automatically rejected.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="content-overlay">
              <div className="locker-header">
                <button
                  className="burger-menu-btn"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                >
                  <span className="mobile-floor-menu" aria-label="Toggle menu">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <path
                          d="M4 18L20 18"
                          stroke="#ffffff"
                          stroke-width="2"
                          stroke-linecap="round"
                        ></path>{" "}
                        <path
                          d="M4 12L20 12"
                          stroke="#ffffff"
                          stroke-width="2"
                          stroke-linecap="round"
                        ></path>{" "}
                        <path
                          d="M4 6L20 6"
                          stroke="#ffffff"
                          stroke-width="2"
                          stroke-linecap="round"
                        ></path>{" "}
                      </g>
                    </svg>
                  </span>
                </button>

                <h1 className="locker-header-title">
                  Welcome, {user?.firstName} {user?.lastName || "Student"}
                </h1>

                <button className="mobile-logout-btn" onClick={handleLogout}>
                  Log Out
                </button>
              </div>

              <div className="locker-content-area">
                {!selectedFloor && !isMobile ? (
                  <div className="locker-floor-display">
                    <h2>Please select a floor to begin</h2>
                    <p>
                      Choose a floor from the sidebar to view available lockers
                    </p>
                  </div>
                ) : !selectedSide ? (
                  <LockerSelection
                    floor={selectedFloor || 6}
                    onSelectSide={handleSideSelect}
                  />
                ) : (
                  <LockerGrid
                    floor={selectedFloor || 6}
                    side={selectedSide}
                    onSelectLocker={handleSelectLocker}
                    onBack={handleBackToFloorPlan}
                    hasActiveReservation={hasActiveReservation}
                  />
                )}
              </div>
            </div>
          </>
        )}
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
