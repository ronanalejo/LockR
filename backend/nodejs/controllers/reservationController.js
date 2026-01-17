const reservationModel = require("../models/reservationModel");
const pool = require("../config/database");

const reservationController = {
  createReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { lockerID, agreement, floorNumber, shsTerm, collegeTerm } =
        req.body;
      const studentID = req.user.id;

      if (!lockerID || !agreement || !floorNumber) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: lockerID, agreement, floorNumber",
        });
      }

      const validAgreements = [
        "1 Semester/Term",
        "2 Semesters/Terms",
        "1 School Year",
      ];
      if (!validAgreements.includes(agreement)) {
        return res.status(400).json({
          success: false,
          message: "Invalid agreement type",
        });
      }

      const validFloors = ["6", "7", "9", "10"];
      if (!validFloors.includes(floorNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid floor number",
        });
      }

      await connection.beginTransaction();

      const locker = await reservationModel.checkLockerAvailability(lockerID);

      if (!locker) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Locker not found",
        });
      }

      if (locker.status !== "Available") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Locker is not available. Current status: ${locker.status}`,
        });
      }

      const agreementDateStart = new Date();
      const agreementDateEnd = calculateAgreementDateEnd(
        agreementDateStart,
        agreement
      );

      const reservationData = {
        lockerID,
        studentID,
        floorNumber,
        shsTerm: shsTerm || null,
        collegeTerm: collegeTerm || null,
        agreement,
        duplicate: false,
        forEndorsement: true,
        forApproval: false,
        isActive: false,
        agreementDateStart,
        agreementDateEnd,
      };

      const referralSlipNo = await reservationModel.create(reservationData);

      await reservationModel.updateLockerStatus(lockerID, "Reserved");

      await connection.commit();

      const newReservation = await reservationModel.findById(referralSlipNo);

      res.status(201).json({
        success: true,
        message: "Reservation created successfully",
        data: {
          referralSlipNo,
          reservation: newReservation,
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Create reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the reservation",
      });
    } finally {
      connection.release();
    }
  },

  getReservationById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (
        req.user.userType === "student" &&
        reservation.studentID !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      console.error("Get reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the reservation",
      });
    }
  },

  updateReservation: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (
        req.user.userType === "student" &&
        reservation.studentID !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const allowedFields =
        req.user.userType === "admin"
          ? [
              "reservationStatus",
              "employeeID",
              "forEndorsement",
              "forApproval",
              "duplicate",
            ]
          : ["dropboxReceipt"];

      const filteredUpdateData = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredUpdateData[field] = updateData[field];
        }
      }

      if (Object.keys(filteredUpdateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update",
        });
      }

      const affectedRows = await reservationModel.update(
        parseInt(id),
        filteredUpdateData
      );

      if (affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: "Update failed",
        });
      }

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Reservation updated successfully",
        data: updatedReservation,
      });
    } catch (error) {
      console.error("Update reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating the reservation",
      });
    }
  },

  getStudentReservations: async (req, res) => {
    try {
      const { studentID } = req.params;

      if (req.user.userType === "student" && studentID !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const reservations = await reservationModel.findByStudentId(studentID);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
      });
    } catch (error) {
      console.error("Get student reservations error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching reservations",
      });
    }
  },
};

function calculateAgreementDateEnd(startDate, agreementType) {
  const endDate = new Date(startDate);

  switch (agreementType) {
    case "1 Semester/Term":
      endDate.setMonth(endDate.getMonth() + 5);
      break;
    case "2 Semesters/Terms":
      endDate.setMonth(endDate.getMonth() + 10);
      break;
    case "1 School Year":
      endDate.setMonth(endDate.getMonth() + 12);
      break;
    default:
      throw new Error("Invalid agreement type");
  }

  return endDate;
}

module.exports = reservationController;
