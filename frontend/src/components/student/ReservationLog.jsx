import React from "react";
import "../../assets/css/reservationLog.css";

const ReservationLog = ({ reservations, onClose }) => {
  const getStatusBadgeClass = (reservation) => {
    if (reservation.isActive) return "status-approved";
    if (reservation.forEndorsement && !reservation.forApproval)
      return "status-endorsement";
    if (reservation.forApproval) return "status-approval";
    if (reservation.duplicate) return "status-rejected";
    return "status-pending";
  };

  const getStatusText = (reservation) => {
    if (reservation.isActive) return "Active";
    if (reservation.forEndorsement && !reservation.forApproval)
      return "For Endorsement";
    if (reservation.forApproval) return "For Approval";
    if (reservation.duplicate) return "Rejected";
    return "Pending";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="reservation-log-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reservation-log-header">
          <h2 className="reservation-log-title">My Reservations</h2>
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
          {reservations.length === 0 ? (
            <div className="no-reservations">
              <div className="no-reservations-icon">📋</div>
              <h3>No Reservations Yet</h3>
              <p>
                You haven't made any locker reservations. Start by selecting a
                floor and locker.
              </p>
            </div>
          ) : (
            <div className="reservations-list">
              {reservations.map((reservation) => (
                <div
                  key={reservation.referralSlipNo}
                  className="reservation-card"
                >
                  <div className="reservation-card-header">
                    <h3 className="locker-id">{reservation.lockerID}</h3>
                    <span
                      className={`status-badge ${getStatusBadgeClass(reservation)}`}
                    >
                      {getStatusText(reservation)}
                    </span>
                  </div>

                  <div className="reservation-details">
                    <div className="detail-row">
                      <span className="detail-label">Referral Slip No:</span>
                      <span className="detail-value">
                        {reservation.referralSlipNo}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Floor:</span>
                      <span className="detail-value">
                        {reservation.floorNumber}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Agreement:</span>
                      <span className="detail-value">
                        {reservation.agreement}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Created Date:</span>
                      <span className="detail-value">
                        {formatDate(reservation.createdAt)}
                      </span>
                    </div>

                    {reservation.agreementDateStart && (
                      <div className="detail-row">
                        <span className="detail-label">Agreement Period:</span>
                        <span className="detail-value">
                          {formatDate(reservation.agreementDateStart)} -{" "}
                          {formatDate(reservation.agreementDateEnd)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="reservation-log-footer">
          <button className="btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationLog;
