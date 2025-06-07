const { body, validationResult } = require("express-validator");
const { ROLES } = require("../models/user");

// Validation middleware for patient data
const validatePatientData = [
  // Personal Info validation (updated for flat structure)
  body("patientId")
    .matches(/^PAT\d{6}$/)
    .withMessage("Patient ID must be in format PAT000000"),

  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("dateOfBirth")
    .isISO8601()
    .withMessage("Invalid date of birth")
    .custom((value) => {
      if (new Date(value) >= new Date()) {
        throw new Error("Date of birth must be in the past");
      }
      return true;
    }),

  body("gender")
    .isIn(["Male", "Female", "Other"])
    .withMessage("Invalid gender value"),

  // Contact validation (updated for flat structure)
  body("phone")
    .optional()
    .matches(/^\+?[\d\s-]{10,}$/)
    .withMessage("Invalid phone number format"),

  body("email").optional().isEmail().withMessage("Invalid email format"),

  // Address validation (simple check)
  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),

  // Note: Medical History, Allergies, Prescriptions, Visits, Lab Reports, Insurance
  // validations are kept for future functionality but are not expected in the initial form.
  // If these fields are added to the form, their validation rules here should be updated
  // to match the form data structure (e.g., `body('medicalHistory.*.condition')` might become `body('condition')`
  // if only adding one condition at a time, or `body('medicalHistory').isArray()` and nested checks).

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

// Registration validation middleware
const validateRegistration = [
  // Name validation
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  // Email validation
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Password validation
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*]/)
    .withMessage(
      "Password must contain at least one special character (!@#$%^&*)"
    ),

  // Role validation
  body("role").isIn(Object.values(ROLES)).withMessage("Invalid role selected"),

  // Role-specific validation
  body("specialization")
    .if(body("role").equals(ROLES.DOCTOR))
    .notEmpty()
    .withMessage("Specialization is required for doctors"),

  body("licenseNumber")
    .if(body("role").isIn([ROLES.DOCTOR, ROLES.NURSE]))
    .notEmpty()
    .withMessage("License number is required for medical professionals")
    .matches(/^[A-Z0-9-]+$/)
    .withMessage(
      "License number can only contain uppercase letters, numbers, and hyphens"
    ),

  // Department validation
  body("department")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Department name must be between 2 and 50 characters"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

module.exports = {
  validatePatientData,
  validateRegistration,
};
