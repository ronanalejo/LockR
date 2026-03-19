import React, { useState, useEffect, useCallback } from "react";
import LockerCard from "./LockerCard";
import lockerService from "../../services/lockerService";
import { showError } from "../../utils/notifications";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../assets/css/lockerGrid.css";

const LockerGrid = ({
  floor,
  wing,
  set,
  onSelectLocker,
  onBack,
  hasActiveReservation = false,
}) => {
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchLockers = useCallback(
    async (isBackgroundRefresh = false) => {
      const token = localStorage.getItem("token");

      if (!token) {
        setAuthError(true);
        return;
      }

      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
        }

        console.log(
          `FETCHING LOCKERS FOR FLOOR ${floor}, WING ${wing}, SET ${set}`,
        );
        const response = await lockerService.getLockersByFloor(floor);

        if (response.data && typeof response.data === "object") {
        }

        if (response.success) {
          const allLockers = Array.isArray(response.data)
            ? response.data
            : response.data.lockers || [];

          // Log sample locker structure
          if (allLockers.length > 0) {
          }

          const filteredLockers = allLockers.filter((locker) => {
            return locker.wing === wing && locker.setName === set;
          });

          console.log(
            `Filtered to ${filteredLockers.length} lockers for wing ${wing}, set ${set}`,
          );

          const mappedLockers = filteredLockers.map((locker, index) => ({
            id: locker.lockerID,
            number: locker.lockerID,
            status: locker.status.toLowerCase(),
            row: Math.floor(index / 3),
            col: index % 3,
          }));

          setLockers(mappedLockers);
          setLastUpdate(new Date());
          setAuthError(false);
        }
      } catch (error) {
        console.error("Error fetching lockers:", error);

        if (
          error.message.includes("Access denied") ||
          error.message.includes("token")
        ) {
          setAuthError(true);
          if (!isBackgroundRefresh) {
            showError(
              "Authentication Error",
              "Your session has expired. Please log in again.",
            );
            setTimeout(() => navigate("/login"), 2000);
          }
          return;
        }

        if (!isBackgroundRefresh) {
          showError("Error Loading Lockers", error.message);
        }
      } finally {
        if (!isBackgroundRefresh) {
          setLoading(false);
        }
      }
    },
    [floor, wing, set, navigate],
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Only show error if token is missing
    if (!token) {
      setAuthError(true);
      setLoading(false);
      showError("Authentication Required", "Please log in to view lockers");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    // Proceed with fetch if token exists
    fetchLockers();

    const interval = setInterval(() => {
      fetchLockers(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [floor, wing, set, navigate, fetchLockers, user]);

  if (authError) {
    return (
      <div className="locker-grid-container">
        <div className="grid-header">
          <div className="grid-title-section">
            <button onClick={onBack} className="back-button">
              <p> Back to Set Selection</p>
            </button>
            <h2 className="grid-title">
              Floor {floor} - {wing} - Set {set}
            </h2>
          </div>
        </div>
        <div className="auth-error-state">
          <p>Authentication required. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="locker-grid-container">
        <div className="grid-header">
          <div className="grid-title-section">
            <button onClick={onBack} className="back-button">
              Back to Set Selection
            </button>
            <h2 className="grid-title">
              Floor {floor} - {wing} - Set {set}
            </h2>
          </div>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading lockers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="locker-grid-container">
      <div className="grid-header">
        <div className="grid-title-section">
          <button onClick={onBack} className="back-button">
            Back to Set Selection
          </button>
          <h2 className="grid-title">
            Floor {floor} - {wing} - Set {set}
          </h2>
        </div>
        {lastUpdate && (
          <div className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid-legend">
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color occupied"></div>
            <span>Occupied</span>
          </div>
          <div className="legend-item">
            <div className="legend-color reserved"></div>
            <span>Reserved</span>
          </div>
          <div className="legend-item">
            <div className="legend-color unavailable"></div>
            <span>Unavailable</span>
          </div>
          <div className="legend-item">
            <div className="legend-color available"></div>
            <span>Available</span>
          </div>
        </div>
        <div className="set-label">SET : {set}</div>
      </div>

      <div className="grid-layout">
        {lockers.length === 0 ? (
          <div className="no-lockers-message">
            <p>No lockers found for this floor and side.</p>
            <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
              Check console for debug info
            </p>
          </div>
        ) : (
          lockers.map((locker) => (
            <LockerCard
              key={locker.id}
              locker={locker}
              onClick={onSelectLocker}
              disabled={hasActiveReservation}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LockerGrid;
