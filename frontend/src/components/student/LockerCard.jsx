import React from "react";
import "../../assets/css/lockerCard.css";

const LockerCard = ({ locker, onClick, disabled = false }) => {
  const isClickable = locker.status === "available" && !disabled;

  const handleClick = () => {
    if (isClickable) {
      onClick(locker);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      className={`locker-card ${locker.status} ${isClickable ? "clickable" : ""} ${disabled ? "disabled-by-reservation" : ""}`}
      style={{
        cursor: disabled
          ? "not-allowed"
          : locker.status === "available"
            ? "pointer"
            : "default",
        opacity: disabled ? 0.6 : 1,
      }}
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
