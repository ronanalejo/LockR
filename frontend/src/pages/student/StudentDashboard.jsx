import React, { useState } from 'react';
import '../../assets/css/dashboard.css';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { showConfirm } from "../../utils/notifications";

const StudentDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');

  const floors = [6, 7, 9, 10];

  const { user, logout } = useAuth();   
  const navigate = useNavigate(); 

  console.log("User object:", user);

  const handleLogout = async () => {
    const result = await showConfirm("You will be logged out. Continue?");

    if (result.isConfirmed) {
        logout();
        navigate("/login");
    }
  }


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

        {/* Search */}
        <div className="locker-search-container">
          <div className="locker-search-wrapper">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="locker-search-input"
            />
            <div className="locker-search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Floor Navigation */}
        <div className="locker-floor-nav">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`locker-floor-button ${selectedFloor === floor ? 'active' : 'inactive'}`}
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
      <div className="locker-main-content">
        {/* Header */}
        <div className="locker-header">
          <h1 className="locker-header-title">Welcome, {user?.firstName} {user?.lastName || "Student"}</h1>
        </div>

        {/* Content Area */}
        <div className="locker-content-area">
          <div className="locker-floor-display">
            Selected Floor: {selectedFloor}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;