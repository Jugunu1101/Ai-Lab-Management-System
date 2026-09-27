const bcrypt = require("bcryptjs");
const User = require("../users/user.model");
const College = require("../colleges/college.model");
const jwt = require("jsonwebtoken");

const registerUser = async ({ 
  name,
  email,
  password,
  role = "STUDENT",
  collegeId,
  department
}) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("User with this email already exists");
    error.statusCode = 409;
    error.code = "USER_EXISTS";
    throw error;
  }

  // Multi-college check: Verify college exists and validate email domain
  let college = null;
  if (collegeId) {
    college = await College.findById(collegeId);
    if (!college) {
      const error = new Error("Selected college not found");
      error.statusCode = 404;
      error.code = "COLLEGE_NOT_FOUND";
      throw error;
    }
  } else {
    // If collegeId is not explicitly provided, try to match by email domain
    const emailDomain = email.split("@")[1]?.toLowerCase();
    college = await College.findOne({ domains: emailDomain, status: "ACTIVE" });
    if (!college) {
      const error = new Error(
        "A valid college must be selected or an authorized college email must be used."
      );
      error.statusCode = 400;
      error.code = "COLLEGE_REQUIRED";
      throw error;
    }
    collegeId = college._id;
  }

  // Validate that email domain belongs to the college
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (college && college.domains && college.domains.length > 0) {
    const isDomainAllowed = college.domains.some(
      (d) => emailDomain === d || emailDomain.endsWith("." + d)
    );
    if (!isDomainAllowed) {
      const error = new Error(
        `Email domain (@${emailDomain}) is not authorized for ${college.name}. Allowed domains: ${college.domains.map((d) => "@" + d).join(", ")}`
      );
      error.statusCode = 400;
      error.code = "INVALID_COLLEGE_EMAIL";
      throw error;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const assignedRole = (role && role.toUpperCase() === "TEACHER") ? "TEACHER" : "STUDENT";
  const approvalStatus = assignedRole === "TEACHER" ? "PENDING" : "APPROVED";

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: assignedRole,
    collegeId: college ? college._id : undefined,
    department,
    approvalStatus,
  });

  // If teacher, account is pending approval - no active JWT issued
  if (assignedRole === "TEACHER") {
    return {
      pendingApproval: true,
      message: "Teacher account registered successfully. Your account is pending approval by your college administrator before you can log in.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        department: user.department,
        approvalStatus: user.approvalStatus,
      },
    };
  }

  // For students (auto-approved with verified college domain)
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: (user.role || "STUDENT").toString().trim().toUpperCase(),
      collegeId: user.collegeId ? user.collegeId.toString() : null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      department: user.department,
      approvalStatus: user.approvalStatus,
    },
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).populate("collegeId", "name code status");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  // Check teacher approval status
  if (user.role === "TEACHER") {
    if (user.approvalStatus === "PENDING") {
      const error = new Error(
        "Your teacher account is pending approval by your college administrator."
      );
      error.statusCode = 403;
      error.code = "TEACHER_APPROVAL_PENDING";
      throw error;
    }

    if (user.approvalStatus === "REJECTED") {
      const error = new Error(
        "Your teacher account registration was rejected by your college administrator."
      );
      error.statusCode = 403;
      error.code = "TEACHER_APPROVAL_REJECTED";
      throw error;
    }
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: (user.role || "STUDENT").toString().trim().toUpperCase(),
      collegeId: user.collegeId?._id ? user.collegeId._id.toString() : (user.collegeId ? user.collegeId.toString() : null),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      department: user.department,
      approvalStatus: user.approvalStatus,
    },
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId)
    .select("-passwordHash")
    .populate("collegeId", "name code domains departments");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    collegeId: user.collegeId,
    department: user.department,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};