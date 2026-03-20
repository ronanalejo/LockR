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
import SetSelection from "./SetSelection";
import ReservationForm from "../../components/student/ReservationForm";
import RulesRegulations from "../../components/student/RulesRegulations";
import EndorsementApproval from "../../components/student/EndorsementApproval";
import OTPVerificationModal from "../../components/student/OTPVerificationModal";
import ReservationLog from "../../components/student/ReservationLog";
import semesterPeriodsService from "../../services/semesterPeriodsService";

import floor6Bg from "../../assets/images/backgrounds/floor6Bg.jpg";
import floor7Bg from "../../assets/images/backgrounds/floor7Bg.jpg";
import floor9Bg from "../../assets/images/backgrounds/floor9Bg.jpg";
import floor10Bg from "../../assets/images/backgrounds/floor10Bg.jpg";

const StudentDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState(() => {
    const savedFloor = localStorage.getItem("selectedFloor");
    return savedFloor ? parseInt(savedFloor, 10) : 6;
  });

  const [selectedSide, setSelectedSide] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    const interval = setInterval(checkActiveReservationStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close drawer on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuOpen &&
        !e.target.closest(".locker-mobile-drawer") &&
        !e.target.closest(".burger-menu-btn")
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Lock body scroll when drawer is open on mobile
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

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedSide(null);
    setSelectedSet(null);
    setMenuOpen(false);
  };

  const handleSideSelect = (side) => {
    setSelectedSide(side);
    setSelectedSet(null);
  };

  const handleSelectLocker = (locker) => {
    setSelectedLocker(locker);
  };

  const handleConfirmReservation = (reservationData) => {
    setTempReservationData(reservationData);
    setSelectedLocker(null);
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleAcceptRules = async (agreementData) => {
    if (!tempReservationData) return;

    try {
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

  const floorButtonProps = (floor) => ({
    onClick: () =>
      !hasActiveReservation && isWithinOperatingHours && handleFloorSelect(floor),
    disabled: hasActiveReservation || !isWithinOperatingHours,
    className: `locker-floor-button ${selectedFloor === floor ? "active" : ""}`,
  });

  const drawerFloorButtonProps = (floor) => ({
    onClick: () =>
      !hasActiveReservation && isWithinOperatingHours && handleFloorSelect(floor),
    disabled: hasActiveReservation || !isWithinOperatingHours,
    className: `drawer-floor-button ${selectedFloor === floor ? "active" : ""}`,
  });

  const floorBackgrounds = {
  6: floor6Bg,
  7: floor7Bg,
  9: floor9Bg,
  10: floor10Bg,
};

  return (
    <div className="locker-dashboard" style={{ backgroundImage: `url(${floorBackgrounds[selectedFloor]})` }}>

      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="locker-navbar">
        <div className="locker-navbar-inner">

          {/* Logo */}
          <div className="locker-navbar-logo">
            <img
              id="iac-logo"
              src="../../WHITE_iACADEMY Long Logo_Makati.png"
              alt="iACADEMY"
            />
            <span className="locker-welcome-text">
              Welcome, {user?.firstName} {user?.lastName || "Student"}
            </span>
          </div>

          {/* Desktop: floor buttons + reservations */}
          <div className="locker-navbar-links">
            {floors.map((floor) => (
              <button key={floor} {...floorButtonProps(floor)}>
                Floor {floor}
              </button>
            ))}
          </div>

          {/* Desktop: welcome + logout */}
          <div className="locker-navbar-right">
            <button
              className="reservation-log-button"onClick={handleOpenReservationLog}>
              My Reservations
            </button>
            <button className="locker-logout-button" onClick={handleLogout}>
              Log Out
            </button>
          </div>

          {/* Mobile: burger */}
          <button
            className="burger-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 18L20 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 12L20 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 6L20 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer ───────────────────────────── */}
      <div className={`locker-mobile-drawer ${menuOpen ? "drawer-open" : ""}`}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", paddingLeft: 4 }}>
          Welcome, {user?.firstName} {user?.lastName || "Student"}
        </span>
        <div className="drawer-divider" />
        {floors.map((floor) => (
          <button key={floor} {...drawerFloorButtonProps(floor)}>
            Floor {floor}
          </button>
        ))}
        <div className="drawer-divider" />
        <button className="drawer-reservation-btn" onClick={handleOpenReservationLog}>
          My Reservations
        </button>
        <button className="drawer-logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      {/* ── Main Content ────────────────────────────── */}
      <div className="locker-main-content">
        {isWithinOperatingHours === null ? null : !isWithinOperatingHours ? (
          <div className="locker-unavailable-notice">
            <p>
              You are not allowed to make locker reservations at this time.
              LockR is only available from Tuesday to Saturday at 8AM to 4:30PM.
              Reservations made after the said time are automatically rejected.
            </p>
          </div>
        ) : (
          <div className="locker-content-area">
            {!selectedSide ? (
              <LockerSelection
                floor={selectedFloor}
                onSelectSide={handleSideSelect}
              />
            ) : !selectedSet ? (
              <SetSelection
                floor={selectedFloor}
                wing={selectedSide}
                onSelectSet={(set) => setSelectedSet(set)}
                onBack={() => setSelectedSide(null)}
              />
            ) : (
              <LockerGrid
                floor={selectedFloor}
                wing={selectedSide}
                set={selectedSet}
                onSelectLocker={handleSelectLocker}
                onBack={() => setSelectedSet(null)}
                hasActiveReservation={hasActiveReservation}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────── */}
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
            handleCloseEndorsement();
          }}
        />
      )}

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
