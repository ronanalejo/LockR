import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { API_ENDPOINTS, API_BASE_URL } from "../../config/api";
import locationIcon from "../../assets/images/icons/location-icon.svg";
import LockerGrid from "../../components/student/LockerGrid";
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
import iacademyBg from "../../assets/images/backgrounds/Iacademy.jpg";

const StudentDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState(null);
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
  const [activeGrid, setActiveGrid] = useState(null);
  const [floorSets, setFloorSets] = useState({});
  const [setsLoading, setSetsLoading] = useState(true);
  const [locateModal, setLocateModal] = useState(null);
  const [locateBlobUrl, setLocateBlobUrl] = useState(null);
  const [locateBlobLoading, setLocateBlobLoading] = useState(false);
  const wings = ["Left Wing", "Right Wing"];

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const floors = useMemo(() => {
    const FLOOR_MAP = { SHS: [6, 7], College: [9, 10] };
    return FLOOR_MAP[user?.studentType] ?? [6, 7, 9, 10];
  }, [user?.studentType]);

  const floorBackgrounds = {
    6: floor6Bg,
    7: floor7Bg,
    9: floor9Bg,
    10: floor10Bg,
  };

  useEffect(() => {
    const fetchAllSets = async () => {
      setSetsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const floorsToFetch = selectedFloor ? [selectedFloor] : floors;
        const result = {};
        for (const floor of floorsToFetch) {
          for (const wing of wings) {
            const response = await fetch(
              API_ENDPOINTS.lockerSets.byFloorAndWing(floor, wing),
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            const data = await response.json();
            result[`${floor}|${wing}`] = data.success ? data.data || [] : [];
          }
        }
        setFloorSets(result);
      } catch (err) {
        console.error("Failed to load sets:", err);
      } finally {
        setSetsLoading(false);
      }
    };
    fetchAllSets();
    setActiveGrid(null);
  }, [selectedFloor]);

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

  useEffect(() => {
    if (selectedFloor !== null) {
      localStorage.setItem("selectedFloor", selectedFloor);
    } else {
      localStorage.removeItem("selectedFloor");
    }
  }, [selectedFloor]);

  useEffect(() => {
    if (selectedFloor !== null && !floors.includes(selectedFloor)) {
      setSelectedFloor(null);
    }
  }, [floors, selectedFloor]);

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
    setMenuOpen(false);
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

  const handleLocate = (floor, wing) => {
    const wingSlug = wing.replace(/\s+/g, "-").toLowerCase();
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
    const imageUrl = `${baseUrl}/uploads/annotated-floor-plans/annotated_floor${floor}_${wingSlug}.png`;
    setLocateModal({ floor, wing, imageUrl, hasError: false });
    setLocateBlobUrl(null);
    setLocateBlobLoading(true);

    const token = localStorage.getItem("token");
    fetch(imageUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.blob();
      })
      .then((blob) => {
        setLocateBlobUrl(URL.createObjectURL(blob));
        setLocateBlobLoading(false);
      })
      .catch(() => {
        setLocateModal((prev) => (prev ? { ...prev, hasError: true } : prev));
        setLocateBlobLoading(false);
      });
  };

  const floorButtonProps = (floor) => ({
    onClick: () =>
      !hasActiveReservation &&
      isWithinOperatingHours &&
      handleFloorSelect(floor),
    disabled: hasActiveReservation || !isWithinOperatingHours,
    className: `locker-floor-button ${selectedFloor === floor ? "active" : ""}`,
  });

  const drawerFloorButtonProps = (floor) => ({
    onClick: () =>
      !hasActiveReservation &&
      isWithinOperatingHours &&
      handleFloorSelect(floor),
    disabled: hasActiveReservation || !isWithinOperatingHours,
    className: `drawer-floor-button ${selectedFloor === floor ? "active" : ""}`,
  });

  return (
    <div
      className="locker-dashboard"
      style={{
        backgroundImage: `url(${selectedFloor ? floorBackgrounds[selectedFloor] : iacademyBg})`,
      }}
    >
      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="locker-navbar">
        <div className="locker-navbar-inner">
          {/* Logo */}
          <div className="locker-navbar-logo">
            <img
              id="iac-logo"
              src="../../WHITE_iACADEMY Long Logo_Makati.png"
              alt="iACADEMY"
              onClick={() => setSelectedFloor(null)}
              style={{ cursor: "pointer" }}
            />
            <span className="locker-welcome-text">
              Welcome, {user?.firstName} {user?.lastName || "Student"}
            </span>
          </div>

          {/* Desktop: floor buttons */}
          <div className="locker-navbar-links">
            <button
              id="home-btn"
              className={`locker-floor-button ${selectedFloor === null ? "active" : ""}`}
              onClick={() => setSelectedFloor(null)}
              style={{ cursor: "pointer" }}
            >
              Home
            </button>
            {floors.map((floor) => (
              <button key={floor} {...floorButtonProps(floor)}>
                Floor {floor}
              </button>
            ))}
          </div>

          {/* Desktop: reservations + logout */}
          <div className="locker-navbar-right">
            <button
              className="reservation-log-button"
              onClick={handleOpenReservationLog}
            >
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 18L20 18"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M4 12L20 12"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M4 6L20 6"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer ───────────────────────────── */}
      <div className={`locker-mobile-drawer ${menuOpen ? "drawer-open" : ""}`}>
        <span
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            paddingLeft: 4,
          }}
        >
          Welcome, {user?.firstName} {user?.lastName || "Student"}
        </span>
        <div className="drawer-divider" />
        <button
          className={`drawer-floor-button ${selectedFloor === null ? "active" : ""}`}
          onClick={() => {
            setSelectedFloor(null);
            setMenuOpen(false);
          }}
        >
          Home
        </button>
        {floors.map((floor) => (
          <button key={floor} {...drawerFloorButtonProps(floor)}>
            Floor {floor}
          </button>
        ))}
        <div className="drawer-divider" />
        <button
          className="drawer-reservation-btn"
          onClick={handleOpenReservationLog}
        >
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
            {activeGrid ? (
              <LockerGrid
                floor={activeGrid.floor}
                wing={activeGrid.wing}
                set={activeGrid.set}
                onSelectLocker={handleSelectLocker}
                onBack={() => setActiveGrid(null)}
                hasActiveReservation={hasActiveReservation}
                hideBack={false}
              />
            ) : setsLoading ? (
              <div className="home-locker-loading">
                <div className="spinner"></div>
                <p>Loading floors...</p>
              </div>
            ) : (
              <div className="floor-sections-wrapper">
                {(selectedFloor ? [selectedFloor] : floors).map((floor) => (
                  <div key={floor} className="floor-section-block">
                    <h2 className="floor-section-title">Floor {floor}</h2>
                    <div className="floor-wings-row">
                      {wings.map((wing) => {
                        const sets = floorSets[`${floor}|${wing}`] || [];
                        return (
                          <div key={wing} className="wing-column">
                            <div className="wing-column-header">
                              <h3 className="wing-column-title">{wing}</h3>
                              <button
                                className="wing-locate-btn"
                                onClick={() => handleLocate(floor, wing)}
                                title={`View map for ${wing}`}
                              >
                                <img
                                  src={locationIcon}
                                  alt=""
                                  className="wing-locate-icon"
                                  aria-hidden="true"
                                />
                                Locate
                              </button>
                            </div>
                            {sets.length === 0 ? (
                              <p className="wing-no-sets">No sets available.</p>
                            ) : (
                              <div className="wing-sets-list">
                                {sets.map((set) => (
                                  <button
                                    key={set.id}
                                    className="wing-set-btn"
                                    onClick={() =>
                                      setActiveGrid({
                                        floor,
                                        wing,
                                        set: set.setName,
                                      })
                                    }
                                    disabled={hasActiveReservation}
                                  >
                                    <div className="wing-set-icon">
                                      {set.setName}
                                    </div>
                                    <span>Set {set.setName}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
      {locateModal && (
        <div
          className="locate-modal-overlay"
          onClick={() => {
            if (locateBlobUrl) URL.revokeObjectURL(locateBlobUrl);
            setLocateModal(null);
            setLocateBlobUrl(null);
          }}
        >
          <div
            className="locate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="locate-modal-header">
              <h3 className="locate-modal-title">
                Floor {locateModal.floor} — {locateModal.wing}
              </h3>
              <button
                className="locate-modal-close"
                onClick={() => {
                  if (locateBlobUrl) URL.revokeObjectURL(locateBlobUrl);
                  setLocateModal(null);
                  setLocateBlobUrl(null);
                }}
                aria-label="Close map"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="locate-modal-body">
              {locateModal.hasError ? (
                <div className="locate-modal-no-map">
                  <p>No map image has been set for this wing yet.</p>
                  <p className="locate-modal-no-map-sub">
                    An administrator must first set the map via the OSAS
                    Dashboard.
                  </p>
                </div>
              ) : locateBlobLoading ? (
                <div className="locate-modal-loading">
                  <div className="spinner"></div>
                  <p>Loading map...</p>
                </div>
              ) : locateBlobUrl ? (
                <img
                  src={locateBlobUrl}
                  alt={`Floor ${locateModal.floor} ${locateModal.wing} map`}
                  className="locate-modal-image"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
