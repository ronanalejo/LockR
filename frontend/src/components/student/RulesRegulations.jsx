import React, { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import "../../assets/css/rulesRegulations.css";
import { showError } from "../../utils/notifications";

const PROGRAMS = [
  "AB Multimedia Arts and Design",
  "AB Fashion Design and Technology",
  "AB Film and Visual Effects",
  "AB Music Production and Sound Design",
  "BS Animation",
  "BS Computer Science – Software Engineering",
  "BS Computer Science – Data Science",
  "BS Computer Science – Cloud Computing",
  "BS Entertainment and Multimedia Computing",
  "BS Information Technology – Web Development",
  "AB Psychology",
  "BS Accountancy",
  "BS Accountancy Bridging Track",
  "BS Accountancy Fast Track (Business)",
  "BS Accountancy Fast Track (Non-Business)",
  "BS Business Administration – Financial Management",
  "BS Business Administration – Marketing Management",
  "BS Real Estate Management",
  "BS Real Estate Management Fast Track (Business)",
  "BS Real Estate Management Fast Track (Non-Business)",
  "Others",
];

const RulesRegulations = ({ onAccept, onDecline, reservationData }) => {
  const [program, setProgram] = useState("");
  const [customProgram, setCustomProgram] = useState("");
  const [signature, setSignature] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const sigCanvas = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A";
  const lockerInfo = `${reservationData?.lockerID || "N/A"} - ${reservationData?.duration || "N/A"}`;

  // Load existing signature into canvas when modal opens
  useEffect(() => {
    if (showSignatureModal && signature && sigCanvas.current) {
      // Small delay to ensure canvas is ready
      const timer = setTimeout(() => {
        sigCanvas.current.fromDataURL(signature);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSignatureModal, signature]);

  const handleClearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleSaveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureDataUrl = sigCanvas.current.toDataURL();
      setSignature(signatureDataUrl);
      setShowSignatureModal(false);
    } else {
      showError(
        "Signature Required",
        "Please provide your signature before saving",
      );
    }
  };

  const handleAccept = () => {
    if (!program) {
      showError("Program Required", "Please select your Level & Program");
      return;
    }

    if (program === "Others" && !customProgram.trim()) {
      showError(
        "Program Specification Required",
        "Please specify your program",
      );
      return;
    }

    if (!signature) {
      showError("Signature Required", "Please provide your signature");
      return;
    }

    const finalProgram = program === "Others" ? customProgram : program;

    onAccept({
      program: finalProgram,
      signature: signature,
    });
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="rules-modal-content">
          <h2 className="rules-title">
            Application Form and Locker Usage Agreement (OSAS)
          </h2>

          <div className="rules-content">
            <div className="student-info-section">
              <div className="info-field">
                <label className="info-label">NAME OF STUDENT:</label>
                <div className="info-display">{studentName}</div>
              </div>

              <div className="info-field">
                <label className="info-label">LEVEL & PROGRAM: *</label>
                <select
                  className="info-select"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                >
                  <option value="">-- Select your program --</option>
                  {PROGRAMS.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
                {program === "Others" && (
                  <input
                    type="text"
                    className="info-input"
                    placeholder="Please specify your program"
                    value={customProgram}
                    onChange={(e) => setCustomProgram(e.target.value)}
                  />
                )}
              </div>

              <div className="info-field">
                <label className="info-label">LOCKER NO AND DURATION:</label>
                <div className="info-display">{lockerInfo}</div>
              </div>

              <div className="declaration-section">
                <p>I applied to use a locker.</p>
                <p>
                  I promise to abide with the rules and regulations on the use
                  of the locker.
                </p>
                <p>
                  My non-compliance with the rules and regulations will deprive
                  me of use of the iACADEMY student locker next semester, term
                  or school year.
                </p>
              </div>

              <div className="signature-section">
                <button
                  type="button"
                  className="signature-trigger-btn"
                  onClick={() => setShowSignatureModal(true)}
                >
                  {signature
                    ? "View/Edit Signature"
                    : "Click here to provide your signature *"}
                </button>
                {signature && (
                  <div className="signature-preview">
                    <img src={signature} alt="Your signature" />
                  </div>
                )}
              </div>
            </div>

            <h3 className="rules-heading">Rules and Regulations</h3>

            <ol className="rules-list">
              <li>
                The locker must be used either for one semester/term, or for the
                entire school year, depending on the student's preference.
                Renewal of locker must be at least one week before the end of
                the agreement. The following non-refundable fees apply and must
                be paid in full upon reservation:
                <div className="fee-table">
                  <p>
                    <strong>For One Semester / Term:</strong>
                  </p>
                  <ul>
                    <li>Senior High School (SHS) - Php300.00</li>
                    <li>College - Php250.00</li>
                  </ul>
                  <p>
                    <strong>For the Whole School Year:</strong>
                  </p>
                  <ul>
                    <li>Senior High School (SHS) - Php600.00</li>
                    <li>College - Php600.00</li>
                  </ul>
                </div>
              </li>

              <li>A locker is given to the student upon payment of the fee.</li>

              <li>
                I understand that the locker is only accessible during regular
                school days, before and after each class.
              </li>

              <li>
                I will provide my own lock and issue a duplicate key to the
                Office of Student Affairs and Services (OSAS), or I will provide
                OSAS the number of combinations to unlock keyless locks.
              </li>

              <li>
                I will only use the locker assigned to me and will not share my
                locker with anyone.
              </li>

              <li>
                The owner of the locker has the responsibility to keep the
                locker neat and clean, both inside and outside. Only dry things
                should be kept in the lockers. Food and drinks are strictly
                prohibited. Any damage due to negligence will be charged to the
                student.
              </li>

              <li>
                I understand that the school has no responsibility for loss or
                damage of any item in the locker, locked or unlocked.
              </li>

              <li>
                I am solely responsible for the contents of the locker.
                Inappropriate valuable, illegal or dangerous goods are not to be
                kept in the locker.
              </li>

              <li>
                I will reserve the right for iACADEMY officials to search the
                locker at any time to ensure safety and security of the school
                environment.
              </li>

              <li>
                All lockers should be cleared, left open and empty on the last
                day of the semester/term. All lockers that are kept locked one
                week after the end of the agreement will be opened. Contents of
                the locker will be donated to a charity.
              </li>

              <li>
                I understand that any violation of the terms above will result
                in the revocation of the privelege to use the locker at any
                time.
              </li>

              <li>
                Present Payment Advice Slip to the Finance Office upon payment.
              </li>
            </ol>
          </div>

          <div className="rules-footer">
            <p className="rules-agreement">
              By clicking "I Accept", you agree to comply with all the rules and
              regulations stated above.
            </p>
            <div className="rules-buttons">
              <button onClick={onDecline} className="btn btn-decline">
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="btn btn-accept"
                disabled={
                  !program ||
                  (program === "Others" && !customProgram.trim()) ||
                  !signature
                }
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <div
          className="signature-modal-overlay"
          onClick={() => setShowSignatureModal(false)}
        >
          <div
            className="signature-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="signature-modal-title">Provide Your Signature</h3>
            <div className="signature-canvas-container">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: "signature-canvas",
                }}
                onEnd={() => {
                  // This ensures the canvas updates properly after loading
                }}
              />
            </div>
            <div className="signature-modal-buttons">
              <button
                type="button"
                onClick={handleClearSignature}
                className="btn btn-clear"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="btn btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                className="btn btn-save"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RulesRegulations;
