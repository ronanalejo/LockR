import React, { useState, useEffect, useRef } from "react";
import "../../assets/css/reservationLog.css";
import {
  showConfirm,
  showSuccess,
  showError,
  showLoading,
  closeAlert,
} from "../../utils/notifications";
import reservationService from "../../services/reservationService";
import { API_BASE_URL } from "../../config/api";

const ReservationLog = ({ reservations, onClose, onReservationCancelled }) => {
  const [expandedAuditTrail, setExpandedAuditTrail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);

  const [currentReservations, setCurrentReservations] = useState(reservations);

  // Poll for updates every 5 seconds when modal is open
  useEffect(() => {
    const fetchLatestReservations = async () => {
      try {
        setIsRefreshing(true);
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user || !user.studentID) return;

        const response = await fetch(
          `${API_BASE_URL}/reservations/students/${user.studentID}/reservations`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (response.ok && data.data) {
          setCurrentReservations(data.data);
        }
      } catch (error) {
        console.error("Error fetching latest reservations:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Initial fetch
    fetchLatestReservations();

    // Poll every 5 seconds for more responsive updates
    const interval = setInterval(fetchLatestReservations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update when props change
  useEffect(() => {
    setCurrentReservations(reservations);
  }, [reservations]);

  const activeReservation = currentReservations.find(
    (r) => r.forEndorsement || r.forApproval || r.isActive,
  );

  if (!activeReservation) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="reservation-log-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reservation-log-header">
            <div className="header-title-row">
              <h2 className="reservation-log-title">My Reservation</h2>
              {isRefreshing && (
                <span className="refresh-indicator">Updating...</span>
              )}
            </div>
            <button className="close-button" onClick={onClose}>
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="reservation-log-content">
            <div className="no-reservations">
              <h3>No Active Reservation</h3>
              <p>You don't have any active reservations at the moment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = () => {
    if (activeReservation.isActive) return "status-approved";
    if (activeReservation.forEndorsement && !activeReservation.forApproval)
      return "status-endorsement";
    if (activeReservation.forApproval) return "status-approval";
    return "status-pending";
  };

  const getStatusText = () => {
    if (activeReservation.isActive) return "Active";
    if (activeReservation.forEndorsement && !activeReservation.forApproval)
      return "For Endorsement";
    if (activeReservation.forApproval) return "For Approval";
    return "Pending";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancelReservation = async () => {
    const result = await showConfirm(
      "Are you sure you want to cancel this reservation?",
      "This action cannot be undone.",
    );

    if (!result.isConfirmed) return;

    try {
      showLoading("Cancelling Reservation", "Please wait...");
      await reservationService.cancelReservation(
        activeReservation.referralSlipNo,
      );
      closeAlert();
      await showSuccess(
        "Reservation Cancelled",
        "A confirmation email has been sent to you.",
      );
      if (onReservationCancelled) {
        onReservationCancelled();
      }
      onClose();
    } catch (error) {
      closeAlert();
      showError(
        "Cancellation Failed",
        error.message || "Failed to cancel reservation",
      );
    }
  };

  const handleDownloadDocument = (docPath, docName) => {
    if (!docPath) {
      showError(
        "Document Not Available",
        `The ${docName} is not yet generated.`,
      );
      return;
    }
    const baseURL = API_BASE_URL.replace(/\/api\/?$/, "");
    window.open(`${baseURL}/uploads/${docPath}`, "_blank");
  };

  const formatEndDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const auditTrail = [
    {
      action: "Reservation Created",
      timestamp: activeReservation.createdAt,
      description: "Student submitted locker reservation request",
    },
    activeReservation.lockerApplicationFormAgreement && {
      action: "Agreement Signed",
      timestamp: activeReservation.createdAt,
      description: "Locker usage agreement form signed and submitted",
    },
    activeReservation.forEndorsement &&
      !activeReservation.forApproval &&
      !activeReservation.isActive && {
        action: "Pending Endorsement",
        timestamp: activeReservation.createdAt,
        description: "Waiting for OSAS endorsement approval",
      },
    activeReservation.forApproval &&
      !activeReservation.isActive && {
        action: "Endorsement Approved",
        timestamp: activeReservation.updatedAt,
        description: `Your endorsement has been approved by ${activeReservation.endorsedByName || "OSAS Staff"}. Kindly proceed to the Finance office to complete the payment.`,
      },
    activeReservation.proofOfPayment && {
      action: "Proof of Payment Uploaded",
      timestamp: activeReservation.updatedAt,
      description: "Student uploaded proof of payment",
    },
    activeReservation.isActive && {
      action: "Reservation Approved",
      timestamp: activeReservation.approvalDate || activeReservation.updatedAt,
      description: `Your reservation has been fully approved. Locker ${activeReservation.lockerID} is yours until ${formatEndDate(activeReservation.agreementDateEnd)}.`,
    },
  ].filter(Boolean);

  const handleProofOfPaymentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      showError(
        "Invalid File",
        "Please upload an image (JPG, PNG, GIF) or PDF file.",
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showError("File Too Large", "Please upload a file smaller than 5MB.");
      return;
    }

    try {
      setUploading(true);
      showLoading("Uploading", "Please wait...");

      const token = localStorage.getItem("token");

      // Read file as base64
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const response = await fetch(
        `${API_BASE_URL}/reservations/upload-proof-of-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            referralSlipNo: activeReservation.referralSlipNo,
            file: fileBase64,
            fileName: file.name,
            fileType: file.type,
          }),
        },
      );

      const data = await response.json();
      closeAlert();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      await showSuccess(
        "Upload Successful",
        "Your proof of payment has been uploaded.",
      );

      if (onReservationCancelled) {
        onReservationCancelled();
      }
    } catch (error) {
      closeAlert();
      showError(
        "Upload Failed",
        error.message || "Failed to upload proof of payment",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="reservation-log-modal-enhanced"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reservation-log-header">
          <h2 className="reservation-log-title">My Reservation</h2>
          <button className="close-button" onClick={onClose}>
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="reservation-log-content">
          <div className="active-reservation-card">
            <div className="reservation-card-header">
              <h3 className="locker-id">{activeReservation.lockerID}</h3>
              <span className={`status-badge ${getStatusBadgeClass()}`}>
                {getStatusText()}
              </span>
            </div>

            <div className="reservation-details">
              <div className="detail-row">
                <span className="detail-label">Referral Slip No:</span>
                <span className="detail-value">
                  {activeReservation.referralSlipNo}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Floor:</span>
                <span className="detail-value">
                  {activeReservation.floorNumber}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Agreement:</span>
                <span className="detail-value">
                  {activeReservation.agreement}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created Date:</span>
                <span className="detail-value">
                  {formatDate(activeReservation.createdAt)}
                </span>
              </div>
              {activeReservation.agreementDateStart && (
                <div className="detail-row">
                  <span className="detail-label">Agreement Period:</span>
                  <span className="detail-value">
                    {formatDate(activeReservation.agreementDateStart)} -{" "}
                    {formatDate(activeReservation.agreementDateEnd)}
                  </span>
                </div>
              )}
            </div>

            {/* Proof of Payment Upload Section */}
            {(activeReservation.forApproval || activeReservation.isActive) &&
              !activeReservation.proofOfPayment && (
                <div className="proof-of-payment-section">
                  <h4 className="section-title">Proof of Payment</h4>
                  <p className="upload-instruction">
                    Please upload your proof of payment (receipt, screenshot, or
                    bank confirmation).
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProofOfPaymentUpload}
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                    id="proof-of-payment-input"
                  />
                  <button
                    className="btn-upload-proof"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    <span>
                      {uploading ? "Uploading..." : "Upload Proof of Payment"}
                    </span>
                  </button>
                </div>
              )}

            {activeReservation.proofOfPayment && (
              <div className="proof-of-payment-section uploaded">
                <h4 className="section-title">Proof of Payment</h4>
                <div className="upload-success">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Proof of payment uploaded</span>
                </div>
              </div>
            )}

            <div className="documents-section">
              <h4 className="section-title">Documents</h4>
              <div className="documents-grid">
                <button
                  className={`document-button ${activeReservation.lockerApplicationFormAgreement ? "" : "disabled"}`}
                  onClick={() =>
                    handleDownloadDocument(
                      activeReservation.lockerApplicationFormAgreement,
                      "Locker Agreement",
                    )
                  }
                  disabled={!activeReservation.lockerApplicationFormAgreement}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Locker Agreement</span>
                </button>
                <button
                  className={`document-button ${activeReservation.pdfPaymentAdviceSlip ? "" : "disabled"}`}
                  onClick={() =>
                    handleDownloadDocument(
                      activeReservation.pdfPaymentAdviceSlip,
                      "Payment Advice Slip",
                    )
                  }
                  disabled={!activeReservation.pdfPaymentAdviceSlip}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Payment Advice Slip</span>
                </button>
              </div>
            </div>

            <div className="audit-trail-section">
              <button
                className="audit-trail-toggle"
                onClick={() => setExpandedAuditTrail(!expandedAuditTrail)}
              >
                <h4 className="section-title">Audit Trail</h4>
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    transform: expandedAuditTrail
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedAuditTrail && (
                <div className="audit-trail-list">
                  {auditTrail.map((entry, index) => (
                    <div key={index} className="audit-trail-item">
                      <div className="audit-trail-marker"></div>
                      <div className="audit-trail-content">
                        <div className="audit-trail-action">{entry.action}</div>
                        <div className="audit-trail-description">
                          {entry.description}
                        </div>
                        <div className="audit-trail-timestamp">
                          {formatDate(entry.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="reservation-log-footer">
          {!activeReservation.isActive && (
            <button
              className="btn-cancel-reservation"
              onClick={handleCancelReservation}
            >
              Cancel Reservation
            </button>
          )}
          <button className="btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationLog;
