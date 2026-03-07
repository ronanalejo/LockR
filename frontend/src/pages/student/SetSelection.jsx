import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config/api";
import { showError } from "../../utils/notifications";
import "../../assets/css/lockerSelection.css";

const SetSelection = ({ floor, wing, onSelectSet, onBack }) => {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
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
        if (data.success) {
          setSets(data.data || []);
        } else {
          showError("Error", data.message || "Failed to load sets.");
        }
      } catch (err) {
        console.error("SetSelection fetch error:", err);
        showError("Error", "Failed to load sets.");
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, [floor, wing]);

  if (loading) {
    return (
      <div className="floor-plan-container">
        <div className="floor-plan-header">
          <h2 className="floor-title">
            Floor {floor} — {wing}
          </h2>
          <p className="floor-subtitle">Loading sets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="floor-plan-container">
      <div className="floor-plan-header">
        <h2 className="floor-title">
          Floor {floor} — {wing}
        </h2>
        <p className="floor-subtitle">Choose a set to view available lockers</p>
      </div>
      <div className="floor-plan-layout">
        <div className="floor-diagram">
          <div className="floor-section">
            <div className="set-selection-back">
              <button className="back-to-wing-btn" onClick={onBack}>
                ← Back to Wing Selection
              </button>
            </div>
            {sets.length === 0 ? (
              <div className="no-sets-message">
                <p>No sets are available for this wing.</p>
                <p>Please contact the administrator.</p>
              </div>
            ) : (
              <div className="sets-container">
                {sets.map((set) => (
                  <button
                    key={set.id}
                    className="set-card"
                    onClick={() => onSelectSet(set.setName)}
                  >
                    <div className="set-icon">
                      <div className="set-letter">{set.setName}</div>
                    </div>
                    <h3 className="set-label">Set {set.setName}</h3>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetSelection;
