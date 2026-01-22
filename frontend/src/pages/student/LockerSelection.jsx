import React, { useState } from "react";
import "../../assets/css/lockerSelection.css";
import floor6Bg from "../../assets/images/backgrounds/floor6Bg.jpg";

const LockerSelection = ({ floor, onSelectSide }) => {

  console.log("Floor 6 Background:", floor6Bg)
  const [showLocationModal, setShowLocationModal] = useState(false);
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
            <div className="locate-lockers-area">
              <button
                className="locate-lockers-button"
                onClick={() => setShowLocationModal(true)}
              >
                <svg
                  className="locate-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Locate Lockers
              </button>
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

      {showLocationModal && (
        <div
          className="location-modal-overlay"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="location-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="location-modal-close"
              onClick={() => setShowLocationModal(false)}
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
            <h3 className="location-modal-title">
              Locker Location - Floor {floor}
            </h3>
            <div className="location-modal-image-container">
              <img
                src={require("../../assets/images/floor-plans/floor-plan.jpg")}
                alt="Floor Plan - Locker Locations"
                className="location-modal-image"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LockerSelection;
