import React, { useState } from "react";
import "./auth.css";
import iRESERVELOGO from "../../assets/images/logos/iRESERVELOGO.png";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
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
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    showLoading(
      "Logging in...",
      "Please wait while we verify your credentials."
    );

    try {
      const response = await login(email, password);

      if (!response?.success) {
        throw new Error("Invalid credentials");
      }

      const userType = response.user.userType;

      await showSuccess(
        "Login Successful!",
        "Redirecting to your dashboard..."
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

  return (
    <div className="login-form">
      <div id="ireserve-logo">
        <img src={iRESERVELOGO} alt="logo" />
      </div>

      <form onSubmit={handleSubmit}>
        <button id="google-btn" type="submit" disabled={loading}>
          Login using Google
        </button>
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
    </div>
  );
};

export default LoginPage;
