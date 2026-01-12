import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RoleRoute from "./components/common/RoleRoute";
import LoginPage from "./pages/auth/LoginPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/student/dashboard"
        element={
          <RoleRoute allowedRoles={["student"]}>
            <div>Student Dashboard Placeholder</div>
          </RoleRoute>
        }
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
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
