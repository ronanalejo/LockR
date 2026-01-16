import React from 'react';
import '../../assets/css/rulesRegulations.css';

const RulesRegulation = ({ onAccept, onDecline }) => {
  return (
    <div className="modal-overlay">
      <div className="rules-modal-content">
        <h2 className="rules-title">Rules and Regulations</h2>
        
        <div className="rules-content">
          <ol className="rules-list">
            <li>
              The locker must be used either for one semester/term, or the entire school year, depending on the student's preference. Renewal of locker must be at least one week before the end of the agreement. The following non-refundable fees apply and must be paid in full upon reservation:
              <div className="fee-table">
                <p><strong>For One Semester / Term:</strong></p>
                <ul>
                  <li>Senior High School (SHS) - Php300.00</li>
                  <li>College - Php250.00</li>
                </ul>
                <p><strong>For the Whole School Year:</strong></p>
                <ul>
                  <li>Senior High School (SHS) - Php600.00</li>
                  <li>College - Php600.00</li>
                </ul>
              </div>
            </li>
            
            <li>The locker is given to the student upon payment of the fee.</li>
            
            <li>I understand that the locker is only accessible during regular school days, before and after each class.</li>
            
            <li>I will provide my own lock and issue a duplicate key to the Office of Student Affairs and Services (OSAS), or I will provide OSAS the number of combinations to unlock keyless locks.</li>
            
            <li>I will only use the locker assigned to me and will not share my locker with anyone.</li>
            
            <li>The user of the locker has the responsibility to keep the locker neat and clean. Both inside and outside of the locker must be kept clean at all times.</li>
            
            <li>I will not deface, vandalize, or put stickers and other forms of markings on the locker.</li>
            
            <li>The locker must not be used to store any prohibited, illegal, dangerous, or hazardous items.</li>
            
            <li>OSAS reserves the right to inspect the locker at any time without prior notice if there is reasonable cause to believe that prohibited items are stored.</li>
            
            <li>I understand that iAcademy is not responsible for any loss or damage to items stored in the locker.</li>
          </ol>
        </div>

        <div className="rules-footer">
          <p className="rules-agreement">
            By clicking "I Accept", you agree to comply with all the rules and regulations stated above.
          </p>
          <div className="rules-buttons">
            <button onClick={onDecline} className="btn btn-decline">
              Decline
            </button>
            <button onClick={onAccept} className="btn btn-accept">
              I Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesRegulation;