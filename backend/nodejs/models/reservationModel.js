const pool = require("../config/database");

const reservationModel = {
  create: async (reservationData) => {
    const query = `
      INSERT INTO reservation (
        lockerID, studentID, floorNumber, shsTerm, collegeTerm, 
        agreement, reservationStatus, duplicate, forEndorsement, 
        forApproval, agreementDateStart, agreementDateEnd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      reservationData.lockerID,
      reservationData.studentID,
      reservationData.floorNumber,
      reservationData.shsTerm || null,
      reservationData.collegeTerm || null,
      reservationData.agreement,
      reservationData.reservationStatus || "For Endorsement",
      reservationData.duplicate || false,
      reservationData.forEndorsement !== undefined
        ? reservationData.forEndorsement
        : true,
      reservationData.forApproval || false,
      reservationData.agreementDateStart || null,
      reservationData.agreementDateEnd || null,
    ]);

    return result.insertId;
  },

  findById: async (referralSlipNo) => {
    const query = `
      SELECT 
        r.*,
        l.branchID as lockerBranchID,
        l.status as lockerStatus,
        s.studentEmail,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        s.course_strand,
        a.employeeEmail,
        a.firstName as adminFirstName,
        a.lastName as adminLastName,
        a.department
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.employeeID = a.employeeID
      WHERE r.referralSlipNo = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [referralSlipNo]);
    return rows[0] || null;
  },

  findByStudentId: async (studentID) => {
    const query = `
      SELECT 
        r.*,
        l.branchID as lockerBranchID,
        l.status as lockerStatus
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      WHERE r.studentID = ?
      ORDER BY r.createdAt DESC
    `;

    const [rows] = await pool.execute(query, [studentID]);
    return rows;
  },

  update: async (referralSlipNo, updateData) => {
    const fields = [];
    const values = [];

    if (updateData.reservationStatus !== undefined) {
      fields.push("reservationStatus = ?");
      values.push(updateData.reservationStatus);
    }
    if (updateData.employeeID !== undefined) {
      fields.push("employeeID = ?");
      values.push(updateData.employeeID);
    }
    if (updateData.forEndorsement !== undefined) {
      fields.push("forEndorsement = ?");
      values.push(updateData.forEndorsement);
    }
    if (updateData.forApproval !== undefined) {
      fields.push("forApproval = ?");
      values.push(updateData.forApproval);
    }
    if (updateData.duplicate !== undefined) {
      fields.push("duplicate = ?");
      values.push(updateData.duplicate);
    }
    if (updateData.dropboxReceipt !== undefined) {
      fields.push("dropboxReceipt = ?");
      values.push(updateData.dropboxReceipt);
    }
    if (updateData.pdfPaymentAdviceSlip !== undefined) {
      fields.push("pdfPaymentAdviceSlip = ?");
      values.push(updateData.pdfPaymentAdviceSlip);
    }
    if (updateData.agreementDateStart !== undefined) {
      fields.push("agreementDateStart = ?");
      values.push(updateData.agreementDateStart);
    }
    if (updateData.agreementDateEnd !== undefined) {
      fields.push("agreementDateEnd = ?");
      values.push(updateData.agreementDateEnd);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(referralSlipNo);
    const query = `UPDATE reservation SET ${fields.join(
      ", "
    )} WHERE referralSlipNo = ?`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows;
  },

  checkLockerAvailability: async (lockerID) => {
    const query = "SELECT status FROM locker WHERE lockerID = ? LIMIT 1";
    const [rows] = await pool.execute(query, [lockerID]);
    return rows[0] || null;
  },

  updateLockerStatus: async (lockerID, status) => {
    const query = "UPDATE locker SET status = ? WHERE lockerID = ?";
    const [result] = await pool.execute(query, [status, lockerID]);
    return result.affectedRows;
  },
};

module.exports = reservationModel;
