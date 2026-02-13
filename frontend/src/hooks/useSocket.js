import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const useSocket = (dashboard, onUpdate) => {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!dashboard) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const socketURL = isLocalhost
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : "https://api.lockr.fit";

    const socket = io(socketURL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      socket.emit("join-dashboard", dashboard);
    });

    socket.on("reservation-update", (payload) => {
      console.log("[Socket] Reservation update received:", payload);
      if (onUpdateRef.current) {
        onUpdateRef.current(payload);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
    });

    return () => {
      socket.off("connect");
      socket.off("reservation-update");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dashboard]);

  const getSocket = useCallback(() => socketRef.current, []);

  return { getSocket };
};

export default useSocket;
