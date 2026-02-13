import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const DepartmentRoute = ({
  children,
  allowedRoles = [],
  allowedDepartments = [],
}) => {
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
  const userDepartment = user?.department;

  if (!allowedRoles.includes(userType)) {
    const redirectMap = {
      student: "/student/dashboard",
      admin:
        userDepartment === "Finance"
          ? "/finance/dashboard"
          : "/admin/dashboard",
    };
    return <Navigate to={redirectMap[userType] || "/login"} replace />;
  }

  if (
    allowedDepartments.length > 0 &&
    !allowedDepartments.includes(userDepartment)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default DepartmentRoute;
