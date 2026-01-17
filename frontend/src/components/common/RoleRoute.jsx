import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userType = user?.userType;

  if (!allowedRoles.includes(userType)) {
    const redirectMap = {
      student: "/student/dashboard",
      admin: "/admin/dashboard",
    };

    return <Navigate to={redirectMap[userType] || "/login"} replace />;
  }

  return children;
};

export default RoleRoute;
