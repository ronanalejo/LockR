const identifyUserRole = (email) => {
  if (!email || !email.includes("@")) {
    return null;
  }

  const emailPrefix = email.split("@")[0];

  const hasNumbers = /\d/.test(emailPrefix);
  const hasLetters = /[a-zA-Z]/.test(emailPrefix);
  const hasPeriod = emailPrefix.includes(".");
  const onlyNumbersAndLetters = /^[a-zA-Z0-9.]+$/.test(emailPrefix);

  if (!onlyNumbersAndLetters) {
    return null;
  }

  if (hasLetters && hasPeriod && !hasNumbers) {
    return "admin";
  }

  if (hasNumbers && !hasLetters && !hasPeriod) {
    return "college_student";
  }

  if (hasLetters && hasNumbers) {
    return "shs_student";
  }

  return null;
};

module.exports = { identifyUserRole };
