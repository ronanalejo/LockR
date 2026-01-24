import React from 'react';
import '../../assets/css/endorsementApproval.css';

const EndorsementApproval = ({ onClose }) => {

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* <div className="modal-icon">!</div> */}
        <h2>Please wait for the Endorsement Approval</h2>
        <p>Thank you!</p>
        
        {/* Optional: Add a close button */}
        <button onClick={onClose} className="btn btn-primary">
          Close
        </button>
      </div>
    </div>
  );
};

export default EndorsementApproval;