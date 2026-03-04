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
        paymentMode,
        accountNumber,
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

      // Check if student already has an active reservation
      const existingReservation =
        await reservationModel.findActiveByStudentId(studentID);

      if (existingReservation) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "You already have an active reservation. Please wait for approval or cancellation before creating a new one.",
          existingReservation: {
            referralSlipNo: existingReservation.referralSlipNo,
            lockerID: existingReservation.lockerID,
            status: existingReservation.forEndorsement
              ? "For Endorsement"
              : existingReservation.forApproval
                ? "For Approval"
                : "Active",
          },
        });
      }

      const locker = await reservationModel.checkLockerAvailability(lockerID);

      if (!locker || locker.status !== "Available") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Locker is not available",
        });
      }

      const [students] = await connection.query(
        "SELECT studentID, studentEmail, firstName, lastName FROM student WHERE studentID = ?",
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

      // Determine academic level from student_type
      const [studentTypeRows] = await connection.query(
        "SELECT student_type FROM student WHERE studentID = ?",
        [studentID],
      );
      let academicLevel = "COLLEGE";
      if (studentTypeRows.length > 0 && studentTypeRows[0].student_type) {
        academicLevel =
          studentTypeRows[0].student_type.toUpperCase() === "SHS"
            ? "SHS"
            : "COLLEGE";
      }

      // Validate agreement against configured Academic Periods
      const agreementValidationService = require("../services/agreementValidationService");
      const agreementCheck = await agreementValidationService.validate(
        duration,
        academicLevel,
      );

      if (!agreementCheck.allowed) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: agreementCheck.message,
        });
      }

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
        modeOfPayment: paymentMode || null,
        accountNumber:
          paymentMode && paymentMode !== "Cash" ? accountNumber || null : null,
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
        studentID: student.studentID,
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

      const filename = `${referralSlipNo} - Application Form and Locker Usage Agreement - ${Date.now()}.pdf`;
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
        student.lastName,
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

  checkActiveReservation: async (req, res) => {
    try {
      const studentID = req.user.id;

      const activeReservation =
        await reservationModel.findActiveByStudentId(studentID);

      if (!activeReservation) {
        return res.json({
          success: true,
          hasActiveReservation: false,
          data: null,
        });
      }

      res.json({
        success: true,
        hasActiveReservation: true,
        data: {
          referralSlipNo: activeReservation.referralSlipNo,
          lockerID: activeReservation.lockerID,
          floorNumber:
            activeReservation.lockerFloorNumber ||
            activeReservation.floorNumber,
          status: activeReservation.forEndorsement
            ? "For Endorsement"
            : activeReservation.forApproval
              ? "For Approval"
              : "Active",
          createdAt: activeReservation.createdAt,
        },
      });
    } catch (error) {
      console.error("Check active reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while checking reservation status",
      });
    }
  },

  uploadProofOfPayment: async (req, res) => {
    try {
      const { referralSlipNo, file, fileName, fileType } = req.body;

      if (!referralSlipNo || !file || !fileName || !fileType) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: referralSlipNo, file, fileName, fileType",
        });
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (!allowedTypes.includes(fileType)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.",
        });
      }

      // Decode base64
      const fileBuffer = Buffer.from(file, "base64");

      // Validate size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
      }

      // Create upload directory
      const uploadDir = path.join(__dirname, "../../uploads/proof-of-payment");
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const extension = path.extname(fileName) || ".jpg";
      const uniqueName = `proof-${referralSlipNo}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${extension}`;
      const uploadPath = path.join(uploadDir, uniqueName);

      // Write file
      await fs.writeFile(uploadPath, fileBuffer);

      // Update database
      const relativePath = `proof-of-payment/${uniqueName}`;
      const affectedRows = await reservationModel.update(
        parseInt(referralSlipNo),
        { proofOfPayment: relativePath },
      );

      if (affectedRows === 0) {
        // Clean up file if reservation not found
        await fs.unlink(uploadPath).catch(() => {});
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      res.json({
        success: true,
        message: "Proof of payment uploaded successfully",
        data: { proofOfPayment: relativePath },
      });
    } catch (error) {
      console.error("Upload proof of payment error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while uploading proof of payment",
      });
    }
  },

  cancelReservationByStudent: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const studentID = req.user.id;
      const { referralSlipNo } = req.params;

      await connection.beginTransaction();

      const reservation = await reservationModel.findById(
        parseInt(referralSlipNo),
      );

      if (!reservation) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (reservation.studentID !== studentID) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "You can only cancel your own reservations",
        });
      }

      if (reservation.isActive) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot cancel an active reservation. Please contact OSAS office.",
        });
      }

      await reservationModel.update(parseInt(referralSlipNo), {
        forEndorsement: false,
        forApproval: false,
        isActive: false,
      });

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Available",
        connection,
      );

      const emailService = require("../services/emailService");
      await emailService.sendCancellationEmail(
        reservation.studentEmail,
        reservation.studentFirstName,
        referralSlipNo,
        reservation.lockerID,
      );

      await connection.commit();

      res.json({
        success: true,
        message:
          "Reservation cancelled successfully. A confirmation has been sent to your email.",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Cancel reservation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel reservation",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  },

  validateAgreement: async (req, res) => {
    try {
      const studentID = req.user.id;
      const { agreement } = req.body;

      if (!agreement) {
        return res.status(400).json({
          success: false,
          message: "Agreement type is required.",
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
          message: "Invalid agreement type.",
        });
      }

      const [studentRows] = await pool.query(
        "SELECT student_type FROM student WHERE studentID = ?",
        [studentID],
      );

      if (!studentRows || studentRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      let academicLevel = studentRows[0].student_type;
      if (academicLevel && academicLevel.toUpperCase() === "SHS") {
        academicLevel = "SHS";
      } else {
        academicLevel = "COLLEGE";
      }

      const agreementValidationService = require("../services/agreementValidationService");
      const result = await agreementValidationService.validate(
        agreement,
        academicLevel,
      );

      return res.json({
        success: true,
        allowed: result.allowed,
        message: result.message,
        academicLevel,
        periods: result.allowed
          ? result.periods.map((p) => ({
              id: p.id,
              semester_name: p.semester_name,
              academic_year: p.academic_year,
              start_date: p.start_date,
              end_date: p.end_date,
            }))
          : [],
      });
    } catch (error) {
      console.error("[VALIDATE_AGREEMENT] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to validate agreement.",
      });
    }
  },
};

module.exports = reservationController;
