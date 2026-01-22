import React, { useState, useEffect, useRef } from "react";
import "../../assets/css/otpVerificationModal.css";
import {
  showError,
  showSuccess,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import { API_ENDPOINTS } from "../../config/api";

const OTPVerificationModal = ({ email, onVerified, onCancel }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split("");
    while (newOtp.length < 6) newOtp.push("");
    setOtp(newOtp);

    const lastFilledIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      showError(
        "Invalid Code",
        "Please enter the complete 6-digit verification code",
      );
      return;
    }

    setIsVerifying(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(API_ENDPOINTS.otp.verify, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      showSuccess("Verified!", data.message);
      setTimeout(() => {
        closeAlert();
        onVerified();
      }, 1000);
    } catch (error) {
      showError("Verification Failed", error.message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      showLoading("Sending Code", "Please wait...");

      const token = localStorage.getItem("token");

      const response = await fetch(API_ENDPOINTS.otp.send, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend code");
      }

      closeAlert();
      showSuccess(
        "Code Sent",
        "A new verification code has been sent to your email",
      );
      setCanResend(false);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      closeAlert();
      showError("Resend Failed", error.message);
    }
  };

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal-content">
        <h2 className="otp-modal-title">Email Verification</h2>

        <p className="otp-modal-description">
          We've sent a 6-digit verification code to:
        </p>
        <p className="otp-modal-email">{email}</p>

        <div className="otp-input-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="otp-input"
              disabled={isVerifying}
            />
          ))}
        </div>

        <div className="otp-timer">
          {canResend ? (
            <button onClick={handleResend} className="otp-resend-btn">
              Resend Code
            </button>
          ) : (
            <span>Resend code in {countdown}s</span>
          )}
        </div>

        <div className="otp-modal-buttons">
          <button
            onClick={onCancel}
            className="otp-btn otp-btn-cancel"
            disabled={isVerifying}
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            className="otp-btn otp-btn-verify"
            disabled={isVerifying || otp.some((d) => !d)}
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </button>
        </div>

        <p className="otp-modal-note">
          Code expires in 5 minutes. Do not share this code with anyone.
        </p>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
