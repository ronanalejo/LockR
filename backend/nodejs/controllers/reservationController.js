const reservationModel = require("../models/reservationModel");
const pool = require("../config/database");
const fs = require("fs").promises;
const path = require("path");

const reservationController = {
  createReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const studentID = req.user.id;
      const {
        lockerID,
        duration,
        floorNumber,
        shsTerm,
        collegeTerm,
        program,
        signature,
      } = req.body;

      if (!lockerID || !duration || !floorNumber || !program || !signature) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      await connection.beginTransaction();

      const locker = await reservationModel.checkLockerAvailability(lockerID);

      if (!locker || locker.status !== "Available") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Locker is not available",
        });
      }

      const [students] = await connection.query(
        "SELECT studentEmail, firstName, lastName FROM student WHERE studentID = ?",
        [studentID],
      );

      if (students.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const student = students[0];

      const reservationData = {
        lockerID: lockerID,
        studentID: studentID,
        floorNumber: floorNumber,
        shsTerm: shsTerm || null,
        collegeTerm: collegeTerm || null,
        agreement: duration,
        forEndorsement: true,
        forApproval: false,
        isActive: false,
      };

      const referralSlipNo = await reservationModel.create(
        reservationData,
        connection,
      );

      await reservationModel.updateLockerStatus(
        lockerID,
        "Reserved",
        connection,
      );

      await connection.query(
        "UPDATE student SET program = ? WHERE studentID = ?",
        [program, studentID],
      );

      const agreementData = {
        referralSlipNo: referralSlipNo,
        studentName: `${student.firstName} ${student.lastName}`,
        program: program,
        lockerID: lockerID,
        duration: duration,
        signature: signature,
      };

      const {
        generateAgreementPDF,
      } = require("../utils/agreementPdfGenerator");
      const pdfBuffer = await generateAgreementPDF(agreementData);

      const outputDir = path.join(__dirname, "../../uploads/agreements");
      await fs.mkdir(outputDir, { recursive: true });

      const filename = `agreement-${referralSlipNo}-${Date.now()}.pdf`;
      const outputPath = path.join(outputDir, filename);
      await fs.writeFile(outputPath, pdfBuffer);

      const pdfPath = `agreements/${filename}`;
      await connection.query(
        "UPDATE reservation SET lockerApplicationFormAgreement = ? WHERE referralSlipNo = ?",
        [pdfPath, referralSlipNo],
      );

      const emailService = require("../services/emailService");
      await emailService.sendAgreementPDF(
        student.studentEmail,
        student.firstName,
        pdfBuffer,
        referralSlipNo,
      );

      await connection.commit();

      res.json({
        success: true,
        message:
          "Agreement submitted successfully. A confirmation has been sent to your email.",
        reservation: {
          referralSlipNo: referralSlipNo,
          lockerID: lockerID,
          status: "For Endorsement",
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Create reservation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create reservation",
        error: error.message,
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
        filteredUpdateData,
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
