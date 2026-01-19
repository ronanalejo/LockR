import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import "./auth.css";
import iRESERVELOGO from "../../assets/images/logos/iRESERVELOGO.png";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import authService from "../../services/authService";
import RegistrationModal from "../../components/auth/RegistrationModal";
import {
  showLoading,
  showSuccess,
  showError,
  closeAlert,
} from "../../utils/notifications";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    showLoading(
      "Logging in...",
      "Please wait while we verify your credentials.",
    );

    try {
      const response = await login(email, password);

      if (!response?.success) {
        throw new Error("Invalid credentials");
      }

      if (response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      const userType = response.user.userType;

      await showSuccess(
        "Login Successful!",
        "Redirecting to your dashboard...",
      );

      closeAlert();

      if (userType === "student") {
        navigate("/student/dashboard");
      } else if (userType === "admin") {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      closeAlert();
      showError("Login Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    showLoading("Logging in with Google...", "Please wait...");

    try {
      const response = await authService.googleLogin(
        credentialResponse.credential,
      );

      closeAlert();

      if (response.needsRegistration) {
        setRegistrationData({
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
        });
        setShowRegistration(true);
        setLoading(false);
        return;
      }

      if (!response?.success) {
        throw new Error(response.message || "Google login failed");
      }

      if (response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        updateUser(response.user);
      }

      const userType = response.user.userType;

      await showSuccess(
        "Login Successful!",
        `Welcome ${response.user.firstName}! Redirecting to your dashboard...`,
      );

      closeAlert();

      if (userType === "student") {
        navigate("/student/dashboard");
      } else if (userType === "admin") {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      closeAlert();
      const errorMessage = err.message || "Something went wrong";

      if (errorMessage.includes("@iacademy.edu.ph")) {
        showError(
          "Invalid Email Domain",
          "Only @iacademy.edu.ph email accounts are allowed to login.",
        );
      } else {
        showError("Google Login Failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationComplete = async (
    email,
    password,
    confirmPassword,
  ) => {
    try {
      const response = await authService.completeRegistration(
        email,
        password,
        confirmPassword,
        registrationData.firstName,
        registrationData.lastName,
      );

      if (!response?.success) {
        throw new Error(response.message || "Registration failed");
      }

      if (response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      const userType = response.user.userType;

      setShowRegistration(false);

      closeAlert();
      await showSuccess(
        "Registration Successful!",
        `Welcome ${response.user.firstName} ${response.user.lastName}! Redirecting to your dashboard...`,
      );

      setTimeout(() => {
        closeAlert();
        const redirectPath =
          userType === "student" ? "/student/dashboard" : "/admin/dashboard";
        window.location.href = redirectPath;
      }, 1500);
    } catch (error) {
      throw error;
    }
  };

  const handleRegistrationCancel = () => {
    setShowRegistration(false);
    setRegistrationData(null);
  };

  const handleGoogleError = () => {
    showError("Google Login Failed", "Could not authenticate with Google");
  };

  return (
    <div className="login-form">
      <div id="ireserve-logo">
        <img src={iRESERVELOGO} alt="logo" />
      </div>

      <img id="logo-mobile" src={iRESERVELOGO} alt="logo" />

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "15px",
          }}
        >
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="300"
          />
        </div>

        <p>OR</p>

        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <button id="login-btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>

      {showRegistration && registrationData && (
        <RegistrationModal
          email={registrationData.email}
          firstName={registrationData.firstName}
          lastName={registrationData.lastName}
          onComplete={handleRegistrationComplete}
          onCancel={handleRegistrationCancel}
        />
      )}
    </div>
  );
};

export default LoginPage;
