import React from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/css/unauthorized.css";

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/admin/dashboard");
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h1 className="unauthorized-title">Access Denied</h1>
        <p className="unauthorized-message">
          You do not have permission to access this page. This dashboard is
          restricted to OSAS department staff only.
        </p>
        <div className="unauthorized-buttons">
          <button className="btn-secondary" onClick={handleGoBack}>
            Go Back
          </button>
          <button className="btn-primary" onClick={handleGoHome}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
