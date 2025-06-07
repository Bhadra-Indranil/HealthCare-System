const express = require("express");
const router = express.Router();
const Patient = require("../models/patient");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { validatePatientData } = require("../middleware/validation");

// Middleware to check if user has access to patient data
const checkPatientAccess = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Log access
    await patient.logAccess(req.user.userId, "View", "Patient record accessed");
    next();
  } catch (error) {
    next(error);
  }
};

// Get all patients
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    console.log("Received search query:", search);
    console.log("Received req.query:", req.query);

    if (search) {
      // Create a case-insensitive regex for searching name or patientId
      const searchRegex = new RegExp(search, "i");
      query = {
        $or: [
          { "personalInfo.name": searchRegex },
          { "personalInfo.patientId": searchRegex },
        ],
      };
    }

    const patients = await Patient.find(query); // Find patients based on query
    console.log("Patients found for search:", patients);
    res.json(patients);
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
});

// Add new patient
router.post(
  "/add",
  authenticateToken,
  authorizeRole(["doctor", "nurse", "receptionist"]),
  validatePatientData,
  async (req, res, next) => {
    try {
      // Extract flat data from request body
      const {
        patientId,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        email,
        phone,
        address,
      } = req.body;

      console.log("Received patient data:", req.body); // Debug log

      // Construct nested patient data object
      const patientData = {
        personalInfo: {
          patientId: patientId,
          name: `${firstName} ${lastName}`,
          dateOfBirth: new Date(dateOfBirth),
          gender: gender,
          address: address,
        },
        contact: {
          email: email,
          phone: phone,
        },
        medicalHistory: [],
        allergies: [],
        prescriptions: [],
        visits: [],
        labReports: [],
        insurance: {},
        audit: {
          createdBy: req.user.userId,
          updatedBy: req.user.userId,
        },
      };

      console.log("Constructed patient data:", patientData); // Debug log

      const patient = new Patient(patientData);
      await patient.save();

      // Log creation
      await patient.logAccess(
        req.user.userId,
        "Create",
        "New patient record created"
      );

      console.log("Patient saved successfully:", patient); // Debug log

      res.status(201).json({
        message: "Patient added successfully",
        patient: patient.toJSON(),
      });
    } catch (error) {
      console.error("Error adding patient:", error); // Debug log
      if (error.code === 11000) {
        return res.status(400).json({ error: "Patient ID already exists" });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: "Validation failed",
          details: Object.values(error.errors).map((err) => ({
            field: err.path,
            message: err.message,
          })),
        });
      }
      next(error);
    }
  }
);

// Search patients with advanced filtering
router.get("/search", authenticateToken, async (req, res, next) => {
  try {
    const {
      name,
      condition,
      allergy,
      dateRange,
      page = 1,
      limit = 10,
      sortBy = "audit.createdAt",
      sortOrder = -1,
    } = req.query;

    const query = {};
    if (name) query.name = name;
    if (condition) query.condition = condition;
    if (allergy) query.allergy = allergy;
    if (dateRange) {
      const [start, end] = dateRange.split(",");
      query.dateRange = { start: new Date(start), end: new Date(end) };
    }

    const result = await Patient.searchPatients(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder),
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get patient by ID
router.get(
  "/:id",
  authenticateToken,
  checkPatientAccess,
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .populate("visits.doctor", "name specialization")
        .populate("prescriptions.prescribedBy", "name specialization")
        .populate("medicalHistory.diagnosedBy", "name specialization")
        .populate("labReports.orderedBy", "name specialization")
        .populate("labReports.reviewedBy", "name specialization");

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      next(error);
    }
  }
);

// Update patient record
router.patch(
  "/:id",
  authenticateToken,
  authorizeRole(["DOCTOR", "NURSE"]),
  checkPatientAccess,
  validatePatientData,
  async (req, res, next) => {
    try {
      const updates = {
        ...req.body,
        "audit.updatedBy": req.user.userId,
      };

      const patient = await Patient.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Log update
      await patient.logAccess(
        req.user.userId,
        "Update",
        "Patient record updated"
      );

      res.json({
        message: "Patient updated successfully",
        patient: patient.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add medical history entry
router.post(
  "/:id/medical-history",
  authenticateToken,
  authorizeRole(["DOCTOR", "NURSE"]),
  checkPatientAccess,
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const historyEntry = {
        ...req.body,
        diagnosedBy: req.user.userId,
      };

      patient.medicalHistory.push(historyEntry);
      await patient.save();

      // Log update
      await patient.logAccess(
        req.user.userId,
        "Update",
        "Medical history entry added"
      );

      res.status(201).json({
        message: "Medical history entry added successfully",
        patient: patient.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add prescription
router.post(
  "/:id/prescriptions",
  authenticateToken,
  authorizeRole(["DOCTOR", "NURSE"]),
  checkPatientAccess,
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const prescription = {
        ...req.body,
        prescribedBy: req.user.userId,
        status: "Active",
      };

      patient.prescriptions.push(prescription);
      await patient.save();

      // Log update
      await patient.logAccess(
        req.user.userId,
        "Update",
        "New prescription added"
      );

      res.status(201).json({
        message: "Prescription added successfully",
        patient: patient.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add lab report
router.post(
  "/:id/lab-reports",
  authenticateToken,
  authorizeRole(["DOCTOR", "NURSE"]),
  checkPatientAccess,
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const labReport = {
        ...req.body,
        orderedBy: req.user.userId,
        status: "Pending",
      };

      patient.labReports.push(labReport);
      await patient.save();

      // Log update
      await patient.logAccess(
        req.user.userId,
        "Update",
        "New lab report added"
      );

      res.status(201).json({
        message: "Lab report added successfully",
        patient: patient.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get patient audit log
router.get(
  "/:id/audit-log",
  authenticateToken,
  authorizeRole(["ADMIN", "DOCTOR"]),
  checkPatientAccess,
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .populate("audit.accessLog.user", "name role")
        .populate("audit.createdBy", "name role")
        .populate("audit.updatedBy", "name role")
        .populate("audit.lastAccessedBy", "name role");

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      res.json({
        audit: patient.audit,
        accessLog: patient.audit.accessLog,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete patient (soft delete - only admin)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Log deletion
      await patient.logAccess(
        req.user.userId,
        "Delete",
        "Patient record deleted"
      );

      // Soft delete by marking as inactive
      patient.isActive = false;
      await patient.save();

      res.json({ message: "Patient record deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
