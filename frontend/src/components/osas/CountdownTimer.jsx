import React, { useState, useEffect } from "react";

const CountdownTimer = ({ startTime, endTime }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!startTime || !endTime) {
      setTimeLeft("N/A");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Mark as urgent if less than 1 hour remaining
      setIsUrgent(hours < 1);
      setIsExpired(false);

      // Format the time display
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const getClassName = () => {
    if (isExpired) return "timer-cell expired";
    if (isUrgent) return "timer-cell urgent";
    return "timer-cell normal";
  };

  return <span className={getClassName()}>{timeLeft}</span>;
};

export default CountdownTimer;
