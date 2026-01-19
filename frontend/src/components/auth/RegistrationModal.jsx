import React, { useState } from "react";
import "./RegistrationModal.css";
import {
  showLoading,
  showSuccess,
  showError,
  closeAlert,
} from "../../utils/notifications";

const RegistrationModal = ({
  email,
  firstName,
  lastName,
  onComplete,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError("Password Mismatch", "Passwords do not match");
      return;
    }

    if (password.length < 8) {
      showError("Weak Password", "Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    showLoading(
      "Creating Account...",
      "Please wait while we set up your account.",
    );

    try {
      await onComplete(email, password, confirmPassword);
    } catch (error) {
      closeAlert();
      showError("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-modal-overlay">
      <div className="registration-modal">
        <h2>Complete Your Registration</h2>
        <p className="welcome-text">
          Welcome, {firstName} {lastName}!
        </p>
        <p className="info-text">
          Your account was found in Google but not in our system. Please set a
          password to complete your registration.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="disabled-input"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="button-group">
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Creating Account..." : "Complete Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationModal;
