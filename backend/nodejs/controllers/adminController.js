const reservationModel = require("../models/reservationModel");
const pool = require("../config/database");
const { generatePaymentAdviceSlip } = require("../utils/pdfGenerator");

const adminController = {
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
          s.course_strand,
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

  approveReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
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
          message: `Cannot approve reservation. Reservation must be in 'For Approval' status (forApproval=TRUE, forEndorsement=FALSE, isActive=FALSE)`,
        });
      }

      const locker = await reservationModel.checkLockerAvailability(
        reservation.lockerID
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
        "Occupied"
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

  rejectReservation: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;
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
          message: `Cannot reject reservation. Reservation must be in 'For Approval' status (forApproval=TRUE, forEndorsement=FALSE, isActive=FALSE)`,
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
        "Available"
      );

      await connection.commit();

      const updatedReservation = await reservationModel.findById(parseInt(id));

      res.json({
        success: true,
        message: "Reservation rejected successfully",
        data: updatedReservation,
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
};

module.exports = adminController;
