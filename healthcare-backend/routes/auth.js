const express = require("express");
const router = express.Router();
const { User, ROLES } = require("../models/user");
const {
  authenticateToken,
  isAdmin,
  authorizeRole,
} = require("../middleware/auth");
const { validateRegistration } = require("../middleware/validation");
const jwt = require("jsonwebtoken");
const { getDB } = require("../models/db");

// Public registration route
router.post("/register", validateRegistration, async (req, res) => {
  try {
    const userData = {
      name: `${req.body.firstName} ${req.body.lastName}`,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      department: req.body.department || "General",
      specialization: req.body.specialization,
      licenseNumber: req.body.licenseNumber,
    };

    // Validate role-specific requirements
    if (userData.role === ROLES.DOCTOR && !userData.specialization) {
      return res
        .status(400)
        .json({ error: "Specialization is required for doctors" });
    }
    if (
      (userData.role === ROLES.DOCTOR || userData.role === ROLES.NURSE) &&
      !userData.licenseNumber
    ) {
      return res.status(400).json({
        error: "License number is required for medical professionals",
      });
    }

    const user = await User.createUser(userData);

    // Generate token for immediate login
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        specialization: user.specialization,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.message === "User already exists") {
      return res.status(400).json({ error: error.message });
    }
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

// Check email availability
router.get("/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = getDB();
    const existingUser = await db.collection("users").findOne({ email });
    res.json({ available: !existingUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to check email availability" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await User.authenticateUser(email, password);
    res.json(result);
  } catch (error) {
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === "Account is deactivated") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.getUserById(req.user.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile
router.patch("/profile", authenticateToken, async (req, res) => {
  try {
    // Users can only update their own profile
    const allowedUpdates = ["name", "password", "department"];
    const updateData = {};

    // Filter out non-allowed fields
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const user = await User.updateUser(req.user.userId, updateData);
    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Admin: Get all users
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const db = getDB();
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin: Update user (including role changes)
router.patch("/users/:userId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = {
      ...req.body,
      // Only admin can update these fields
      role: req.body.role,
      isActive: req.body.isActive,
      specialization: req.body.specialization,
      licenseNumber: req.body.licenseNumber,
    };

    const user = await User.updateUser(userId, updateData);
    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Admin: Deactivate user
router.delete(
  "/users/:userId",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      await User.deactivateUser(userId);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  }
);

// Get available roles (admin only)
router.get("/roles", authenticateToken, isAdmin, (req, res) => {
  res.json(ROLES);
});

// Get list of doctors (Admin and Receptionist only)
router.get(
  "/doctors",
  authenticateToken,
  authorizeRole([ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.NURSE]),
  async (req, res) => {
    try {
      const db = getDB();
      // Find users with the role 'DOCTOR' and only return their _id and name
      const doctors = await db
        .collection("users")
        .find({ role: ROLES.DOCTOR }, { projection: { _id: 1, name: 1 } })
        .toArray();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  }
);

module.exports = router;
