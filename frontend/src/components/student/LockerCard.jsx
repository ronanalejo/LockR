import React from 'react';
import '../../assets/css/lockerCard.css';

const LockerCard = ({ locker, onClick }) => {
  const isClickable = locker.status === 'available';

  return (
    <button
      onClick={() => isClickable && onClick(locker)}
      disabled={!isClickable}
      className={`locker-card ${locker.status} ${isClickable ? 'clickable' : ''}`}
    >
      <div className="locker-content">
        <div className="locker-slot top"></div>
        <div className="locker-slot bottom"></div>
      </div>
      <div className="locker-number">{locker.number}</div>
      <div className="locker-lock"></div>
    </button>
  );
};

export default LockerCard;