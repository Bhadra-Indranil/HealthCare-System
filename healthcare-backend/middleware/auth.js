const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.getUserById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid or inactive user" });
    }

    // Attach user info to request
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Role-based access control middleware
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("Checking role:", req.user ? req.user.role : "No user");
    console.log("Allowed roles:", allowedRoles);
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Convert both the user's role and allowed roles to uppercase for comparison
    const userRole = req.user.role.toUpperCase();
    const allowedRolesUpper = allowedRoles[0].map(role => role.toUpperCase());

    if (!allowedRolesUpper.includes(userRole)) {
      return res.status(403).json({
        error: "Access denied",
        message: "You don't have permission to perform this action",
      });
    }

    next();
  };
};

// Specific role middleware functions
const isAdmin = authorizeRole("admin");
const isDoctor = authorizeRole("admin", "doctor");
const isNurse = authorizeRole("admin", "doctor", "nurse");
const isReceptionist = authorizeRole(
  "admin",
  "doctor",
  "nurse",
  "receptionist"
);

module.exports = {
  authenticateToken,
  authorizeRole,
  isAdmin,
  isDoctor,
  isNurse,
  isReceptionist,
};
