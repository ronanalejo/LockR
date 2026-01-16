import React from 'react';
import '../../assets/css/endorsementApproval.css';

const EndorsementApproval = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="endorsement-modal-content">
        <div className="endorsement-icon">
          <div className="info-circle">
            <span>ℹ️</span>
          </div>
        </div>
        
        <p className="endorsement-message">
          Please wait for the Endorsement Approval
        </p>
        
        <p className="endorsement-thanks">
          Thank you!
        </p>
      </div>
    </div>
  );
};

export default EndorsementApproval;