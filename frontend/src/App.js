import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RoleRoute from "./components/common/RoleRoute";
import LoginPage from "./pages/auth/LoginPage";
import notifications from "./utils/notifications.js";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import LockerSelection from "./pages/student/LockerSelection.jsx";
import EndorsementApproval from "./components/student/EndorsementApproval.jsx";
import DepartmentRoute from "./components/common/DepartmentRoute";
import Unauthorized from "./pages/common/Unauthorized.jsx";
import OSASDashboard from "./pages/osas/OSASDashboard.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/notifications" element={<notifications />} />

      <Route
        path="/student/dashboard"
        element={
          <RoleRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </RoleRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <DepartmentRoute
            allowedRoles={["admin"]}
            allowedDepartments={["OSAS"]}
          >
            <OSASDashboard />
          </DepartmentRoute>
        }
      />

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/student/LockerSelection" element={<LockerSelection />} />
      <Route
        path="/student/endorsement-approval"
        element={<EndorsementApproval />}
      />

      <Route
        path="/admin/dashboard"
        element={
          <RoleRoute allowedRoles={["admin"]}>
            <div>Admin Dashboard Placeholder</div>
          </RoleRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  console.log("Google Client ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
