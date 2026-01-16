import React, { useState } from 'react';
import LockerCard from './LockerCard';
import '../../assets/css/lockerGrid.css';

// Mock data generator for lockers
const generateLockers = (floor, side) => {
  const statuses = ['available', 'occupied', 'reserved', 'unavailable'];
  const lockers = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const id = `${floor}-${side}-${row}-${col}`;
      const lockerNumber = `${side}-${String(floor).padStart(2, '0')}${String(row * 3 + col + 1).padStart(2, '0')}`;
      lockers.push({
        id,
        number: lockerNumber,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        row,
        col
      });
    }
  }
  return lockers;
};

const LockerGrid = ({ floor, side, onSelectLocker, onBack }) => {
  const [lockers] = useState(() => generateLockers(floor, side));

  return (
    <div className="locker-grid-container">
      <div className="grid-header">
        <div className="grid-title-section">
          <button onClick={onBack} className="back-button">
            ← Back to Floor Plan
          </button>
          <h2 className="grid-title">Floor {floor} - Side {side}</h2>
        </div>
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
        <div className="set-label">SET : {side}</div>
      </div>
      
      <div className="grid-layout">
        {lockers.map((locker) => (
          <LockerCard key={locker.id} locker={locker} onClick={onSelectLocker} />
        ))}
      </div>
    </div>
  );
};

export default LockerGrid;