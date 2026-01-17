import React from "react";
import "../../assets/css/lockerSelection.css";

const LockerSelection = ({ floor, onSelectSide }) => {
  return (
    <div className="floor-plan-container">
      <div className="floor-plan-header">
        <h2 className="floor-title">Floor {floor} - Select Locker Side</h2>
        <p className="floor-subtitle">
          Choose which side of the floor you'd like to view
        </p>
      </div>

      <div className="floor-plan-layout">
        {/* Visual representation of the floor */}
        <div className="floor-diagram">
          <div className="floor-section">
            <div className="elevator-area">
              <div className="elevator-box">
                <span>🛗</span>
                <p>Elevator</p>
              </div>
            </div>

            <div className="sides-container">
              {/* Side A */}
              <button
                className="side-card side-a"
                onClick={() => onSelectSide("A")}
              >
                <div className="side-icon">
                  <div className="locker-visual">
                    <div className="locker-row"></div>
                    <div className="locker-row"></div>
                    <div className="locker-row"></div>
                  </div>
                </div>
                <h3 className="side-label">Side A</h3>
                <p className="side-description">Left wing lockers</p>
                <div className="side-arrow">→</div>
              </button>

              {/* Side B */}
              <button
                className="side-card side-b"
                onClick={() => onSelectSide("B")}
              >
                <div className="side-icon">
                  <div className="locker-visual">
                    <div className="locker-row"></div>
                    <div className="locker-row"></div>
                    <div className="locker-row"></div>
                  </div>
                </div>
                <h3 className="side-label">Side B</h3>
                <p className="side-description">Right wing lockers</p>
                <div className="side-arrow">→</div>
              </button>
            </div>
          </div>

          <div className="floor-info">
            <div className="info-card">
              <h4>Floor Information</h4>
              <ul>
                <li>Total Lockers: 24 (12 per side)</li>
                <li>Locker Size: Standard</li>
                <li>Access Hours: 24/7</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockerSelection;
