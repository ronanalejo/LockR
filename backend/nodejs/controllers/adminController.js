const reservationModel = require("../models/reservationModel");
const pool = require("../config/database");
const { generatePaymentAdviceSlip } = require("../utils/pdfGenerator");

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

      await reservationModel.update(parseInt(id), {
        forEndorsement: false,
        forApproval: true,
        isActive: false,
        employeeID: employeeID,
      });

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Reserved",
        connection,
      );

      await connection.commit();

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Endorsement approved successfully. Moved to approval queue.",
        data: updatedReservation,
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

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Endorsement rejected successfully",
        data: updatedReservation,
        reason: reason || null,
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

  // Approve reservation (final approval - activates reservation)
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

      let pdfPath = null;
      try {
        pdfPath = await generatePaymentAdviceSlip(reservation);

        if (pdfPath) {
          await reservationModel.update(parseInt(id), {
            pdfPaymentAdviceSlip: pdfPath,
          });
        }
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
      }

      await connection.commit();

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Reservation approved successfully",
        data: {
          reservation: updatedReservation,
          pdfGenerated: !!pdfPath,
        },
        notes: notes || null,
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
            "Cannot reject reservation. Reservation must be in 'For Approval' status (forApproval=TRUE, forEndorsement=FALSE, isActive=FALSE)",
        });
      }

      await reservationModel.update(parseInt(id), {
        forApproval: false,
        forEndorsement: true,
        isActive: false,
        employeeID: employeeID,
      });

      await reservationModel.updateLockerStatus(
        reservation.lockerID,
        "Available",
        connection,
      );

      await connection.commit();

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Reservation rejected successfully",
        data: updatedReservation,
        reason: reason || null,
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

      await reservationModel.update(parseInt(id), {
        isActive: false,
        forEndorsement: false,
        forApproval: false,
        employeeID: employeeID,
      });

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
        WHERE (r.isActive = TRUE OR r.forEndorsement = FALSE OR r.forApproval = FALSE)
        ORDER BY r.updatedAt DESC
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
        WHERE (r.isActive = TRUE OR r.forEndorsement = FALSE OR r.forApproval = FALSE)
        ORDER BY r.updatedAt DESC
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
