const pool = require("../config/database");

const reservationModel = {
  create: async (reservationData, connection = null) => {
    const query = `
      INSERT INTO reservation (
        lockerID, studentID, floorNumber, shsTerm, collegeTerm, 
        agreement, duplicate, forEndorsement, forApproval, isActive,
        agreementDateStart, agreementDateEnd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const executor = connection || pool;
    const [result] = await executor.execute(query, [
      reservationData.lockerID,
      reservationData.studentID,
      reservationData.floorNumber,
      reservationData.shsTerm || null,
      reservationData.collegeTerm || null,
      reservationData.agreement,
      reservationData.duplicate || false,
      reservationData.forEndorsement !== undefined
        ? reservationData.forEndorsement
        : true,
      reservationData.forApproval || false,
      reservationData.isActive || false,
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
        s.student_type,
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

  findActiveByStudentId: async (studentID) => {
    const query = `
      SELECT 
        r.*,
        l.branchID as lockerBranchID,
        l.status as lockerStatus,
        l.floorNumber as lockerFloorNumber
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      WHERE r.studentID = ?
      AND (
        r.forEndorsement = true 
        OR r.forApproval = true 
        OR r.isActive = true
      )
      ORDER BY r.createdAt DESC
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [studentID]);
    return rows[0] || null;
  },

  // Get endorsement queue with filters and pagination
  getEndorsementQueue: async (filters, limit, offset) => {
    let query = `
      SELECT 
        r.referralSlipNo,
        r.lockerID,
        r.studentID,
        r.floorNumber,
        r.shsTerm,
        r.collegeTerm,
        r.agreement,
        r.duplicate,
        r.forEndorsement,
        r.forApproval,
        r.isActive,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.createdAt as reservationTimeStart,
        r.updatedAt as reservationTimeUpdated,
        l.branchID as lockerBranchID,
        l.status as lockerStatus,
        l.lockerNumber,
        s.studentEmail,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        s.middleName as studentMiddleName,
        s.student_type,
        s.contactNumber as studentContactNumber,
        b.branchName,
        b.buildingName
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN branch b ON l.branchID = b.branchID
      WHERE r.forEndorsement = 1
    `;

    const queryParams = [];

    // Apply filters
    if (filters.floorNumber) {
      query += " AND r.floorNumber = ?";
      queryParams.push(filters.floorNumber);
    }

    if (filters.branchID) {
      query += " AND l.branchID = ?";
      queryParams.push(filters.branchID);
    }

    if (filters.startDate) {
      query += " AND DATE(r.createdAt) >= ?";
      queryParams.push(filters.startDate);
    }

    if (filters.endDate) {
      query += " AND DATE(r.createdAt) <= ?";
      queryParams.push(filters.endDate);
    }

    // Order by oldest first (reservationTimeStart)
    query += " ORDER BY r.createdAt ASC";

    // Get total count for pagination
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      "SELECT COUNT(*) as total FROM",
    );
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalCount = countResult[0].total;

    // Add pagination
    query += " LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [rows] = await pool.execute(query, queryParams);

    return {
      reservations: rows,
      totalCount: totalCount,
    };
  },

  update: async (referralSlipNo, updateData) => {
    const fields = [];
    const values = [];

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
    if (updateData.isActive !== undefined) {
      fields.push("isActive = ?");
      values.push(updateData.isActive);
    }
    if (updateData.approvalDate !== undefined) {
      fields.push("approvalDate = ?");
      values.push(updateData.approvalDate);
    }
    if (updateData.duplicate !== undefined) {
      fields.push("duplicate = ?");
      values.push(updateData.duplicate);
    }
    if (updateData.lockerApplicationFormAgreement !== undefined) {
      fields.push("lockerApplicationFormAgreement = ?");
      values.push(updateData.lockerApplicationFormAgreement);
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
    if (updateData.modeOfPayment !== undefined) {
      fields.push("modeOfPayment = ?");
      values.push(updateData.modeOfPayment);
    }

    if (updateData.accountNumber !== undefined) {
      fields.push("accountNumber = ?");
      values.push(updateData.accountNumber);
    }

    if (updateData.pdfPaymentAdviceSlipOSAS !== undefined) {
      fields.push("pdfPaymentAdviceSlipOSAS = ?");
      values.push(updateData.pdfPaymentAdviceSlipOSAS);
    }

    if (updateData.pdfPaymentAdviceSlipFinance !== undefined) {
      fields.push("pdfPaymentAdviceSlipFinance = ?");
      values.push(updateData.pdfPaymentAdviceSlipFinance);
    }

    if (updateData.proofOfPayment !== undefined) {
      fields.push("proofOfPayment = ?");
      values.push(updateData.proofOfPayment);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(referralSlipNo);
    const query = `UPDATE reservation SET ${fields.join(
      ", ",
    )} WHERE referralSlipNo = ?`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows;
  },

  checkLockerAvailability: async (lockerID, connection = null) => {
    const query = "SELECT status FROM locker WHERE lockerID = ? LIMIT 1";
    const executor = connection || pool;
    const [rows] = await executor.execute(query, [lockerID]);
    return rows[0] || null;
  },

  updateLockerStatus: async (lockerID, status, connection = null) => {
    const query = "UPDATE locker SET status = ? WHERE lockerID = ?";
    const executor = connection || pool;
    const [result] = await executor.execute(query, [status, lockerID]);
    return result.affectedRows;
  },

  // Find all active (approved) reservations for Finance dashboard
  findActiveForFinance: async (limit = null, offset = 0) => {
    let query = `
      SELECT
        r.referralSlipNo,
        r.lockerID,
        r.floorNumber,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        s.studentID,
        r.agreement,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.dropboxReceipt,
        r.pdfPaymentAdviceSlip,
        r.approvalDate,
        a.firstName as endorsedByFirstName,
        a.lastName as endorsedByLastName,
        l.lockerNumber,
        l.branchID,
        b.branchName,
        b.buildingName
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.employeeID = a.employeeID
      LEFT JOIN branch b ON l.branchID = b.branchID
      WHERE r.isActive = TRUE
      ORDER BY r.approvalDate DESC
    `;

    const queryParams = [];

    // Add pagination if limit is provided
    if (limit !== null) {
      query += " LIMIT ? OFFSET ?";
      queryParams.push(limit, offset);
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows;
  },

  // Find payment history (all records that have been processed)
  findPaymentHistory: async (filters = {}, limit = null, offset = 0) => {
    let query = `
      SELECT
        r.referralSlipNo,
        r.lockerID,
        r.floorNumber,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        s.middleName as studentMiddleName,
        s.studentID,
        s.studentEmail,
        r.agreement,
        r.agreementDateStart,
        r.agreementDateEnd,
        r.dropboxReceipt,
        r.pdfPaymentAdviceSlip,
        r.approvalDate,
        r.isActive,
        r.forApproval,
        r.forEndorsement,
        r.createdAt as reservationCreatedAt,
        r.updatedAt as reservationUpdatedAt,
        a.firstName as endorsedByFirstName,
        a.lastName as endorsedByLastName,
        a.employeeID,
        l.lockerNumber,
        l.branchID,
        b.branchName,
        b.buildingName
      FROM reservation r
      INNER JOIN locker l ON r.lockerID = l.lockerID
      INNER JOIN student s ON r.studentID = s.studentID
      LEFT JOIN admin a ON r.employeeID = a.employeeID
      LEFT JOIN branch b ON l.branchID = b.branchID
      WHERE (r.isActive = TRUE OR r.forApproval = TRUE OR r.approvalDate IS NOT NULL)
    `;

    const queryParams = [];

    // Apply filters
    if (filters.branchID) {
      query += " AND l.branchID = ?";
      queryParams.push(filters.branchID);
    }

    if (filters.floorNumber) {
      query += " AND r.floorNumber = ?";
      queryParams.push(filters.floorNumber);
    }

    if (filters.startDate) {
      query += " AND DATE(r.approvalDate) >= ?";
      queryParams.push(filters.startDate);
    }

    if (filters.endDate) {
      query += " AND DATE(r.approvalDate) <= ?";
      queryParams.push(filters.endDate);
    }

    if (filters.studentID) {
      query += " AND s.studentID = ?";
      queryParams.push(filters.studentID);
    }

    if (filters.isActive !== undefined) {
      query += " AND r.isActive = ?";
      queryParams.push(filters.isActive);
    }

    // Order by most recent approval date
    query += " ORDER BY r.approvalDate DESC";

    // Get total count for pagination
    if (limit !== null) {
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/,
        "SELECT COUNT(*) as total FROM",
      );
      const [countResult] = await pool.execute(countQuery, queryParams);
      const totalCount = countResult[0].total;

      // Add pagination
      query += " LIMIT ? OFFSET ?";
      queryParams.push(limit, offset);

      const [rows] = await pool.execute(query, queryParams);

      return {
        payments: rows,
        totalCount: totalCount,
      };
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows;
  },
};

module.exports = reservationModel;
