const jwt = require("jsonwebtoken");
const User = require("../modules/users/user.model");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    // Normalize userId across common JWT payload conventions (userId, id, sub, _id)
    if (!req.user.userId && (req.user.id || req.user._id || req.user.sub)) {
      req.user.userId = (req.user.id || req.user._id || req.user.sub).toString();
    }

    // Normalize role to uppercase if present
    if (req.user.role) {
      req.user.role = req.user.role.toString().trim().toUpperCase();
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
};

const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // If role was not present in the JWT, fall back to database lookup by userId
    if (!req.user.role && req.user.userId) {
      try {
        const dbUser = await User.findById(req.user.userId).select("role").lean();
        if (dbUser && dbUser.role) {
          req.user.role = dbUser.role.toString().trim().toUpperCase();
        }
      } catch (err) {
        // Continue to role check
      }
    }

    const userRole = (req.user.role || "").toString().trim().toUpperCase();
    const roles = allowedRoles
      .flat()
      .map((r) => (r || "").toString().trim().toUpperCase());

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
        },
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};