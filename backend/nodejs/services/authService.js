const bcrypt = require("bcrypt");
const studentModel = require("../models/studentModel");
const adminModel = require("../models/adminModel");

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
      userData.courseStrand = user.course_strand;
    } else {
      userData.employeeID = user.employeeID;
      userData.branchID = user.branchID;
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
      userData.department = user.department;
    }

    return { success: true, user: userData };
  },
};

module.exports = authService;
