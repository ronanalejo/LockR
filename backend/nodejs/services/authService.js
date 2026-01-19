const bcrypt = require("bcrypt");
const studentModel = require("../models/studentModel");
const adminModel = require("../models/adminModel");
const db = require("../config/database");

const authService = {
  authenticateUser: async (email, password) => {
    let user = await studentModel.findByEmail(email);
    let userType = "student";

    if (!user) {
      user = await adminModel.findByEmail(email);
      userType = "admin";
    }

    if (!user) {
      return { success: false, message: "Invalid credentials" };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, message: "Invalid credentials" };
    }

    const userData = {
      email: email,
      userType: userType,
    };

    if (userType === "student") {
      userData.studentID = user.studentID;
      userData.branchID = user.branchID;
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
      userData.studentType = user.student_type;
    } else {
      userData.employeeID = user.employeeID;
      userData.branchID = user.branchID;
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
      userData.department = user.department;
    }

    return { success: true, user: userData };
  },

  authenticateUserByEmail: async (email) => {
    try {
      const { identifyUserRole } = require("../utils/roleIdentifier");
      const identifiedRole = identifyUserRole(email);

      if (!identifiedRole) {
        return {
          success: false,
          message: "Invalid email format for this system",
        };
      }

      if (
        identifiedRole === "college_student" ||
        identifiedRole === "shs_student"
      ) {
        const [students] = await db.query(
          "SELECT * FROM student WHERE studentEmail = ?",
          [email],
        );

        if (students.length > 0) {
          const student = students[0];
          return {
            success: true,
            user: {
              studentID: student.studentID,
              email: student.studentEmail,
              firstName: student.firstName,
              lastName: student.lastName,
              userType: "student",
              studentType: student.student_type,
              branchID: student.branchID,
            },
          };
        } else {
          return {
            success: false,
            message: "Student account not found in system",
          };
        }
      }

      if (identifiedRole === "admin") {
        const [admins] = await db.query(
          "SELECT * FROM admin WHERE employeeEmail = ?",
          [email],
        );

        if (admins.length > 0) {
          const admin = admins[0];
          return {
            success: true,
            user: {
              employeeID: admin.employeeID,
              email: admin.employeeEmail,
              firstName: admin.firstName,
              lastName: admin.lastName,
              userType: "admin",
              department: admin.department,
              branchID: admin.branchID,
            },
          };
        } else {
          return {
            success: false,
            message: "Admin account not found in system",
          };
        }
      }

      return {
        success: false,
        message: "Account not found",
      };
    } catch (error) {
      console.error("Authenticate by email error:", error);
      throw error;
    }
  },
};

module.exports = authService;
