import React from "react";
import "../../assets/css/endorsementApproval.css";

const EndorsementApproval = ({ onClose }) => {
  const handleOverlayClick = (e) => {
    console.log("Overlay clicked");
    if (e.target === e.currentTarget) {
      console.log("Closing via overlay");
      onClose();
    }
  };

  const handleClose = () => {
    console.log("Close button clicked");
    if (typeof onClose === "function") {
      onClose();
    } else {
      console.error("onClose is not a function:", onClose);
    }
  };

  return (
    <div className="endorsement-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="endorsement-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="endorsement-message">
          Please wait for the Endorsement Approval
        </h2>
        <p className="endorsement-thanks">
          Kindly proceed to the Finance office to complete the payment.
        </p>

        <button
          type="button"
          onClick={handleClose}
          className="endorsement-close-btn"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default EndorsementApproval;
