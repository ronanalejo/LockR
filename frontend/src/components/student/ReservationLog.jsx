import React, { useState } from "react";
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

  const activeReservation = reservations.find(
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
            <div className="no-reservations">
              <div className="no-reservations-icon">📋</div>
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
    const baseURL = API_BASE_URL;
    window.open(`${baseURL}/uploads/${docPath}`, "_blank");
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
    activeReservation.forEndorsement && {
      action: "Pending Endorsement",
      timestamp: activeReservation.createdAt,
      description: "Waiting for OSAS endorsement approval",
    },
    activeReservation.forApproval && {
      action: "Pending Final Approval",
      timestamp: activeReservation.updatedAt,
      description: "Endorsed by OSAS, waiting for final approval",
    },
    activeReservation.dropboxReceipt && {
      action: "Payment Receipt Uploaded",
      timestamp: activeReservation.updatedAt,
      description: "Student uploaded payment receipt",
    },
    activeReservation.isActive && {
      action: "Reservation Approved",
      timestamp: activeReservation.approvalDate || activeReservation.updatedAt,
      description: "Reservation fully approved and activated",
    },
  ].filter(Boolean);

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
