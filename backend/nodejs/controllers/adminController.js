const reservationModel = require("../models/reservationModel");
const pool = require("../config/database");
const { generatePaymentAdviceSlip } = require("../utils/pdfGenerator");
const socketService = require("../services/socketService");
const semesterPeriodCheckService = require("../services/semesterPeriodCheckService");
const semesterPeriodsModel = require("../models/semesterPeriodsModel");

const adminController = {
  // Get reservations pending endorsement
  getReservationsForEndorsement: async (req, res) => {
    try {
      const query = `
        SELECT 
          r.*,
          l.branchID as lockerBranchID,
          l.status as lockerStatus,
          l.floorNumber as lockerFloor,
          s.studentEmail,
          s.firstName as studentFirstName,
          s.lastName as studentLastName,
          s.student_type,
          s.branchID as studentBranchID
        FROM reservation r
        INNER JOIN locker l ON r.lockerID = l.lockerID
        INNER JOIN student s ON r.studentID = s.studentID
        WHERE r.forEndorsement = TRUE 
        AND r.forApproval = FALSE
        AND r.isActive = FALSE
        ORDER BY r.createdAt ASC
      `;

      const [reservations] = await pool.execute(query);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
      });
    } catch (error) {
      console.error("Get reservations for endorsement error:", error);
      res.status(500).json({
        success: false,
        message:
          "An error occurred while fetching reservations for endorsement",
      });
    }
  },

  // Approve endorsement (moves to approval queue)
  approveEndorsement: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
      const { notes } = req.body;
      const employeeID = req.user.id;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      if (!employeeID) {
        return res.status(401).json({
          success: false,
          message: "Admin employee ID not found in token",
        });
      }

      // Fetch reservation and student details BEFORE transaction to determine academic level
      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      // Fetch student to get academic level (student_type)
      const [studentRows] = await pool.query(
        "SELECT student_type FROM student WHERE studentID = ?",
        [reservation.studentID],
      );

      if (!studentRows || studentRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const studentType = studentRows[0].student_type;

      // Map student_type to academic level for semester period check
      // Assuming student_type is 'SHS' or 'COLLEGE' - adjust mapping if different
      let academicLevel = studentType;

      // Normalize to match semester_periods table enum values
      if (studentType && studentType.toUpperCase() === "SHS") {
        academicLevel = "SHS";
      } else if (
        studentType &&
        (studentType.toUpperCase() === "COLLEGE" ||
          studentType.toUpperCase() === "TERTIARY")
      ) {
        academicLevel = "COLLEGE";
      } else {
        // Default to COLLEGE if student_type is unclear
        academicLevel = "COLLEGE";
      }

      // VALIDATE SEMESTER PERIOD REQUIREMENT BEFORE TRANSACTION
      try {
        const validation =
          await semesterPeriodCheckService.validateForEndorsement(
            academicLevel,
            employeeID,
          );

        if (!validation.canEndorse) {
          return res.status(400).json({
            success: false,
            message: validation.message,
            showSemesterPeriodModal: validation.showModal,
            requiresSemesterPeriod: true,
            missingLevels: validation.missingLevels,
          });
        }
      } catch (validationError) {
        console.error("Semester period validation error:", validationError);
        return res.status(500).json({
          success: false,
          message: "Failed to validate semester period requirement",
        });
      }

      await connection.beginTransaction();

      if (
        !reservation.forEndorsement ||
        reservation.forApproval ||
        reservation.isActive
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot approve endorsement. Reservation must be in 'For Endorsement' status (forEndorsement=TRUE, forApproval=FALSE, isActive=FALSE)",
        });
      }

      const locker = await reservationModel.checkLockerAvailability(
        reservation.lockerID,
      );

      if (!locker) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Locker not found",
        });
      }

      if (locker.status !== "Available" && locker.status !== "Reserved") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot endorse. Locker status is ${locker.status}`,
        });
      }

      // Use agreementValidationService to dynamically calculate agreement date range
      const agreementValidationService = require("../services/agreementValidationService");
      const agreementDateRange =
        await agreementValidationService.calculateAgreementDateRange(
          reservation.agreement,
          academicLevel,
        );

      if (!agreementDateRange) {
        await connection.rollback();
        console.error("[ENDORSEMENT] Agreement period validation failed for:", {
          agreement: reservation.agreement,
          academicLevel,
        });
        return res.status(400).json({
          success: false,
          message: `${reservation.agreement} is currently not allowed. Required Academic Periods are not fully configured for ${academicLevel}.`,
        });
      }

      console.log("[ENDORSEMENT] Agreement date range calculated:", {
        agreement: reservation.agreement,
        academicLevel,
        start: agreementDateRange.start,
        end: agreementDateRange.end,
      });

      // agreementStart = NOW(), agreementEnd = end of the last spanned period at 23:59:59
      const [serverDates] = await connection.query(
        `SELECT
           NOW() AS agreementStart,
           CONCAT(DATE(?), ' 23:59:59') AS agreementEnd`,
        [agreementDateRange.end],
      );
      const agreementStart = serverDates[0].agreementStart;
      const agreementEnd = serverDates[0].agreementEnd;

      await reservationModel.update(
        parseInt(id),
        {
          forEndorsement: false,
          forApproval: true,
          isActive: false,
          employeeID: employeeID,
          agreementDateStart: agreementStart,
          agreementDateEnd: agreementEnd,
        },
        connection,
      );

      console.log("[ENDORSEMENT] Reservation updated with agreement period:", {
        referralSlipNo: reservation.referralSlipNo,
        agreementDateStart: agreementStart,
        agreementDateEnd: agreementEnd,
      });

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Reserved",
        connection,
      );

      // Fetch employee details for audit trail
      const [employeeRows] = await connection.query(
        "SELECT firstName, lastName FROM admin WHERE employeeID = ?",
        [employeeID],
      );
      const employee = employeeRows[0];
      const employeeFullName = employee
        ? `${employee.firstName} ${employee.lastName}`
        : "OSAS Staff";

      // Fetch full student details
      const [fullStudentRows] = await connection.query(
        "SELECT studentEmail, firstName, lastName, student_type FROM student WHERE studentID = ?",
        [reservation.studentID],
      );
      const student = fullStudentRows[0];

      // Generate all 3 PDFs BEFORE committing transaction
      let pdfResult;
      let studentCopyBuffer;
      try {
        const {
          generatePaymentAdviceSlipWithCopy,
        } = require("../utils/pdfGenerator");

        const paymentAdviceData = {
          ...reservation,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          student_type: student.student_type,
          endorsedByName: employeeFullName,
          agreementDateStart: agreementStart,
          agreementDateEnd: agreementEnd,
        };
        console.log("[DEBUG] Payment Advice Data:", {
          referralSlipNo: paymentAdviceData.referralSlipNo,
          studentFirstName: paymentAdviceData.studentFirstName,
          studentLastName: paymentAdviceData.studentLastName,
          student_type: paymentAdviceData.student_type,
          lockerID: paymentAdviceData.lockerID,
          floorNumber: paymentAdviceData.floorNumber,
          agreement: paymentAdviceData.agreement,
          agreementDateStart: paymentAdviceData.agreementDateStart,
          agreementDateEnd: paymentAdviceData.agreementDateEnd,
          modeOfPayment: paymentAdviceData.modeOfPayment,
          accountNumber: paymentAdviceData.accountNumber,
        });

        pdfResult = await generatePaymentAdviceSlipWithCopy(paymentAdviceData);
        studentCopyBuffer = pdfResult.studentCopyBuffer;

        // Update DB with PDF paths INSIDE transaction
        await reservationModel.update(
          parseInt(id),
          {
            pdfPaymentAdviceSlip: pdfResult.studentCopyPath,
            pdfPaymentAdviceSlipOSAS: pdfResult.osasCopyPath,
            pdfPaymentAdviceSlipFinance: pdfResult.financeCopyPath,
          },
          connection,
        );

        console.log(
          "[PDF GENERATION SUCCESS] All 3 PDFs generated for referral:",
          reservation.referralSlipNo,
        );
      } catch (pdfError) {
        console.error(
          "[PDF GENERATION FAILED] Rolling back transaction:",
          pdfError.message,
        );
        await connection.rollback();
        connection.release();
        return res.status(500).json({
          success: false,
          message:
            "Failed to generate Payment Advice Slip PDFs. Endorsement was not approved.",
          error: pdfError.message,
        });
      }

      await connection.commit();
      console.log(
        "[APPROVE ENDORSEMENT] Transaction committed for referral:",
        id,
      );

      socketService.emitReservationUpdate("endorsement-approved", {
        referralSlipNo: reservation.referralSlipNo,
      });

      const updatedReservation = await reservationModel.findById(parseInt(id));

      // Send email with Student's Copy attached (non-blocking, post-commit)
      setImmediate(async () => {
        try {
          const emailService = require("../services/emailService");
          await emailService.sendEndorsementApprovalEmail(
            student.studentEmail,
            student.firstName,
            reservation.referralSlipNo,
            employeeFullName,
            studentCopyBuffer,
          );
          console.log(
            "Endorsement approval email sent to:",
            student.studentEmail,
          );
        } catch (emailError) {
          console.error(
            "Failed to send endorsement approval email:",
            emailError.message,
          );
        }
      });

      res.json({
        success: true,
        message: "Endorsement approved successfully. Moved to approval queue.",
        data: {
          ...updatedReservation,
          endorsedByName: employeeFullName,
        },
        notes: notes || null,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Approve endorsement error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while approving the endorsement",
      });
    } finally {
      connection.release();
    }
  },

  // Reject endorsement (resets to initial state)
  rejectEndorsement: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
      const { reason } = req.body;
      const employeeID = req.user.id;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      if (!employeeID) {
        return res.status(401).json({
          success: false,
          message: "Admin employee ID not found in token",
        });
      }

      await connection.beginTransaction();

      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (
        !reservation.forEndorsement ||
        reservation.forApproval ||
        reservation.isActive
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot reject endorsement. Reservation must be in 'For Endorsement' status",
        });
      }

      await reservationModel.update(parseInt(id), {
        forEndorsement: false,
        forApproval: false,
        isActive: false,
        employeeID: employeeID,
      });

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Available",
        connection,
      );

      await connection.commit();

      socketService.emitReservationUpdate("endorsement-rejected", {
        referralSlipNo: reservation.referralSlipNo,
      });

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Endorsement rejected successfully",
        data: updatedReservation,
        reason: reason || null,
      });

      // Send rejection email (non-blocking)
      setImmediate(async () => {
        try {
          const emailService = require("../services/emailService");
          await emailService.sendEndorsementRejectedEmail(
            reservation.studentEmail,
            reservation.studentFirstName,
            reservation.referralSlipNo,
            reason,
          );
          console.log(
            "Endorsement rejection email sent to:",
            reservation.studentEmail,
          );
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error("Reject endorsement error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while rejecting the endorsement",
      });
    } finally {
      connection.release();
    }
  },

  // Get reservations pending final approval
  getReservationsForApproval: async (req, res) => {
    try {
      const query = `
        SELECT 
          r.*,
          l.branchID as lockerBranchID,
          l.status as lockerStatus,
          l.floorNumber as lockerFloor,
          s.studentEmail,
          s.firstName as studentFirstName,
          s.lastName as studentLastName,
          s.student_type,
          s.branchID as studentBranchID
        FROM reservation r
        INNER JOIN locker l ON r.lockerID = l.lockerID
        INNER JOIN student s ON r.studentID = s.studentID
        WHERE r.forApproval = TRUE 
        AND (r.forEndorsement = FALSE OR r.forEndorsement IS NULL)
        AND (r.isActive = FALSE OR r.isActive IS NULL)
        ORDER BY r.createdAt ASC
      `;

      const [reservations] = await pool.execute(query);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
      });
    } catch (error) {
      console.error("Get reservations for approval error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching reservations for approval",
      });
    }
  },

  /// Approve reservation (final approval - activates reservation)
  approveReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
      const { notes } = req.body;
      const employeeID = req.user.id;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      if (!employeeID) {
        return res.status(401).json({
          success: false,
          message: "Admin employee ID not found in token",
        });
      }

      // SEMESTER PERIOD VALIDATION REMOVED - NOW HAPPENS AT ENDORSEMENT STAGE

      await connection.beginTransaction();

      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (
        !reservation.forApproval ||
        reservation.forEndorsement ||
        reservation.isActive
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot approve reservation. Reservation must be in 'For Approval' status (forApproval=TRUE, forEndorsement=FALSE, isActive=FALSE)",
        });
      }

      const locker = await reservationModel.checkLockerAvailability(
        reservation.lockerID,
      );

      if (!locker) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Locker not found",
        });
      }

      if (locker.status !== "Reserved") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot approve. Locker status is ${locker.status}, expected Reserved`,
        });
      }

      // Fetch employee details for audit trail
      const [employeeRows] = await connection.query(
        "SELECT firstName, lastName FROM admin WHERE employeeID = ?",
        [employeeID],
      );
      const employee = employeeRows[0];
      const approverFullName = employee
        ? `${employee.firstName} ${employee.lastName}`
        : "OSAS Staff";

      // Fetch endorser details if exists
      let endorserFullName = "OSAS Staff";
      if (reservation.employeeID) {
        const [endorserRows] = await connection.query(
          "SELECT firstName, lastName FROM admin WHERE employeeID = ?",
          [reservation.employeeID],
        );
        if (endorserRows[0]) {
          endorserFullName = `${endorserRows[0].firstName} ${endorserRows[0].lastName}`;
        }
      }

      await reservationModel.update(parseInt(id), {
        forApproval: false,
        isActive: true,
        employeeID: employeeID,
        approvalDate: new Date(),
      });

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Occupied",
        connection,
      );

      await connection.commit();

      socketService.emitReservationUpdate("reservation-approved", {
        referralSlipNo: reservation.referralSlipNo,
      });

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Reservation approved successfully",
        data: {
          reservation: {
            ...updatedReservation,
            endorsedByName: endorserFullName,
            approvedByName: approverFullName,
          },
          pdfGenerated: true,
        },
        notes: notes || null,
      });

      // Send approval email (non-blocking)
      setImmediate(async () => {
        try {
          const emailService = require("../services/emailService");
          await emailService.sendReservationApprovedEmail(
            reservation.studentEmail,
            reservation.studentFirstName,
            reservation.referralSlipNo,
            reservation.lockerID,
            reservation.agreementDateEnd,
          );
          console.log(
            "Reservation approval email sent to:",
            reservation.studentEmail,
          );
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error("Approve reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while approving the reservation",
      });
    } finally {
      connection.release();
    }
  },

  // Reject reservation (sends back to endorsement queue)
  rejectReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
      const { reason } = req.body;
      const employeeID = req.user.id;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      if (!employeeID) {
        return res.status(401).json({
          success: false,
          message: "Admin employee ID not found in token",
        });
      }

      await connection.beginTransaction();

      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (
        !reservation.forApproval ||
        reservation.forEndorsement ||
        reservation.isActive
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot reject reservation. Reservation must be in 'For Approval' status",
        });
      }

      await reservationModel.update(
        parseInt(id),
        {
          forApproval: false,
          forEndorsement: true,
          isActive: false,
          employeeID: employeeID,
        },
        connection,
      );

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Available",
        connection,
      );

      await connection.commit();

      socketService.emitReservationUpdate("reservation-rejected", {
        referralSlipNo: reservation.referralSlipNo,
      });

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message:
          "Reservation rejected successfully. Returned to endorsement queue.",
        data: updatedReservation,
        reason: reason || null,
      });

      // Send rejection email (non-blocking)
      setImmediate(async () => {
        try {
          const emailService = require("../services/emailService");
          await emailService.sendReservationRejectedEmail(
            reservation.studentEmail,
            reservation.studentFirstName,
            reservation.referralSlipNo,
            reason,
          );
          console.log(
            "Reservation rejection email sent to:",
            reservation.studentEmail,
          );
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error("Reject reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while rejecting the reservation",
      });
    } finally {
      connection.release();
    }
  },

  // Get all reservations with optional filters
  getAllReservations: async (req, res) => {
    try {
      const {
        status,
        floor,
        studentID,
        lockerID,
        isActive,
        forEndorsement,
        forApproval,
      } = req.query;

      let query = `
        SELECT 
          r.*,
          l.branchID as lockerBranchID,
          l.status as lockerStatus,
          l.floorNumber as lockerFloor,
          s.studentEmail,
          s.firstName as studentFirstName,
          s.lastName as studentLastName,
          s.student_type,
          s.branchID as studentBranchID
        FROM reservation r
        INNER JOIN locker l ON r.lockerID = l.lockerID
        INNER JOIN student s ON r.studentID = s.studentID
        WHERE 1=1
      `;

      const params = [];

      if (floor) {
        query += " AND l.floorNumber = ?";
        params.push(floor);
      }

      if (studentID) {
        query += " AND r.studentID = ?";
        params.push(studentID);
      }

      if (lockerID) {
        query += " AND r.lockerID = ?";
        params.push(lockerID);
      }

      if (isActive !== undefined) {
        query += " AND r.isActive = ?";
        params.push(isActive === "true" || isActive === "1" ? 1 : 0);
      }

      if (forEndorsement !== undefined) {
        query += " AND r.forEndorsement = ?";
        params.push(
          forEndorsement === "true" || forEndorsement === "1" ? 1 : 0,
        );
      }

      if (forApproval !== undefined) {
        query += " AND r.forApproval = ?";
        params.push(forApproval === "true" || forApproval === "1" ? 1 : 0);
      }

      if (status) {
        query += " AND l.status = ?";
        params.push(status);
      }

      query += " ORDER BY r.createdAt DESC";

      const [reservations] = await pool.execute(query, params);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
        filters: {
          status,
          floor,
          studentID,
          lockerID,
          isActive,
          forEndorsement,
          forApproval,
        },
      });
    } catch (error) {
      console.error("Get all reservations error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching reservations",
      });
    }
  },

  // Cancel an active reservation
  markDuplicate: async (req, res) => {
    try {
      const { id } = req.params;
      const { duplicate } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      if (typeof duplicate !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "duplicate must be a boolean",
        });
      }

      const reservation = await reservationModel.findById(parseInt(id));
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      await reservationModel.update(parseInt(id), { duplicate });

      const updated = await reservationModel.findById(parseInt(id));

      return res.json({
        success: true,
        message: `Reservation marked as ${duplicate ? "duplicate" : "not duplicate"}`,
        data: updated,
      });
    } catch (error) {
      console.error("Mark duplicate error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating duplicate status",
      });
    }
  },

  cancelReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
      const { reason } = req.body;
      const employeeID = req.user.id;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
      }

      if (!employeeID) {
        return res.status(401).json({
          success: false,
          message: "Admin employee ID not found in token",
        });
      }

      if (!reason || reason.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
      }

      await connection.beginTransaction();

      const reservation = await reservationModel.findById(parseInt(id));

      if (!reservation) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
        });
      }

      if (!reservation.isActive) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot cancel. Only active reservations can be cancelled",
        });
      }

      await reservationModel.update(
        parseInt(id),
        {
          isActive: false,
          forEndorsement: false,
          forApproval: false,
          employeeID: employeeID,
        },
        connection,
      );

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Available",
        connection,
      );

      await connection.commit();

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Reservation cancelled successfully",
        data: updatedReservation,
        cancellationReason: reason,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Cancel reservation error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while cancelling the reservation",
      });
    } finally {
      connection.release();
    }
  },

  // Get occupied lockers (active reservations)
  getOccupiedLockers: async (req, res) => {
    try {
      const query = `
        SELECT 
          r.*,
          l.branchID as lockerBranchID,
          l.status as lockerStatus,
          l.floorNumber as lockerFloor,
          s.studentEmail,
          s.firstName as studentFirstName,
          s.lastName as studentLastName,
          s.student_type,
          s.branchID as studentBranchID,
          a.firstName as endorsedByFirstName,
          a.lastName as endorsedByLastName
        FROM reservation r
        INNER JOIN locker l ON r.lockerID = l.lockerID
        INNER JOIN student s ON r.studentID = s.studentID
        LEFT JOIN admin a ON r.employeeID = a.employeeID
        WHERE r.isActive = TRUE
          AND (r.agreementDateEnd IS NULL OR r.agreementDateEnd >= NOW())
        ORDER BY r.agreementDateStart DESC
      `;

      const [reservations] = await pool.execute(query);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
      });
    } catch (error) {
      console.error("Get occupied lockers error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching occupied lockers",
      });
    }
  },

  // Get reservation history (all past and current reservations)
  getReservationHistory: async (req, res) => {
    try {
      const query = `
        SELECT 
          r.*,
          l.branchID as lockerBranchID,
          l.status as lockerStatus,
          l.floorNumber as lockerFloor,
          s.studentEmail,
          s.firstName as studentFirstName,
          s.lastName as studentLastName,
          s.student_type,
          s.branchID as studentBranchID,
          a.firstName as endorsedByFirstName,
          a.lastName as endorsedByLastName
        FROM reservation r
        INNER JOIN locker l ON r.lockerID = l.lockerID
        INNER JOIN student s ON r.studentID = s.studentID
        LEFT JOIN admin a ON r.employeeID = a.employeeID
        WHERE r.agreementDateEnd IS NOT NULL
          AND r.agreementDateEnd < NOW()
        ORDER BY r.agreementDateEnd DESC
      `;

      const [reservations] = await pool.execute(query);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
      });
    } catch (error) {
      console.error("Get reservation history error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching reservation history",
      });
    }
  },
};

module.exports = adminController;
