let io = null;

const socketService = {
  init(server, corsOptions) {
    const { Server } = require("socket.io");

    io = new Server(server, {
      cors: {
        origin: corsOptions.origin,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.on("connection", (socket) => {
      console.log("[Socket] Client connected:", socket.id);

      socket.on("join-dashboard", (dashboard) => {
        if (["osas", "finance", "student"].includes(dashboard)) {
          socket.join(dashboard);
          console.log("[Socket] Client", socket.id, "joined room:", dashboard);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("[Socket] Client disconnected:", socket.id, "-", reason);
      });
    });

    console.log("[Socket] Socket.IO initialized");
    return io;
  },

  getIO() {
    return io;
  },

  emitLockerUpdate(eventType, data = {}) {
    if (!io) {
      console.warn("[Socket] IO not initialized, skipping emit");
      return;
    }
    const payload = {
      type: eventType,
      lockerID: data.lockerID || null,
      timestamp: Date.now(),
    };
    io.to("student").emit("reservation-update", payload);
    io.to("osas").emit("reservation-update", payload);
  },

  emitReservationUpdate(eventType, data = {}) {
    if (!io) {
      console.warn("[Socket] IO not initialized, skipping emit");
      return;
    }

    const payload = {
      type: eventType,
      referralSlipNo: data.referralSlipNo || null,
      timestamp: Date.now(),
    };

    switch (eventType) {
      case "endorsement-approved":
        io.to("osas").emit("reservation-update", payload);
        io.to("finance").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      case "endorsement-rejected":
        io.to("osas").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      case "reservation-approved":
        io.to("osas").emit("reservation-update", payload);
        io.to("finance").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      case "reservation-rejected":
        io.to("osas").emit("reservation-update", payload);
        io.to("finance").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      case "payment-verified":
        io.to("finance").emit("reservation-update", payload);
        io.to("osas").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      case "reservation-cancelled":
        io.to("osas").emit("reservation-update", payload);
        io.to("finance").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      case "reservation-created":
        io.to("osas").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
      default:
        io.to("osas").emit("reservation-update", payload);
        io.to("finance").emit("reservation-update", payload);
        io.to("student").emit("reservation-update", payload);
        break;
    }
  },
};

module.exports = socketService;
