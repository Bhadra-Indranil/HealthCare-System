const mongoose = require("mongoose");
const { getDB } = require("./db");

const patientSchema = new mongoose.Schema(
  {
    personalInfo: {
      patientId: {
        type: String,
        required: true,
        unique: true,
        validate: {
          validator: function (v) {
            return /^PAT\d{6}$/.test(v);
          },
          message: "Patient ID must be in format PAT000000",
        },
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      dateOfBirth: {
        type: Date,
        required: true,
        validate: {
          validator: function (v) {
            return v < new Date();
          },
          message: "Date of birth must be in the past",
        },
      },
      gender: {
        type: String,
        required: true,
        enum: ["Male", "Female", "Other"],
      },
      contact: {
        phone: {
          type: String,
          validate: {
            validator: function (v) {
              return /^\+?[\d\s-]{10,}$/.test(v);
            },
            message: "Invalid phone number format",
          },
        },
        email: {
          type: String,
          validate: {
            validator: function (v) {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: "Invalid email format",
          },
        },
        address: {
          street: String,
          city: String,
          state: String,
          zipCode: String,
          country: String,
        },
      },
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
      },
    },
    medicalHistory: [
      {
        condition: { type: String, required: true },
        diagnosisDate: { type: Date, required: true },
        status: {
          type: String,
          enum: ["Active", "Resolved", "Chronic", "Under Observation"],
          required: true,
        },
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Critical"],
          required: true,
        },
        notes: String,
        diagnosedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    allergies: [
      {
        allergen: { type: String, required: true },
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Life-threatening"],
          required: true,
        },
        reaction: String,
        notes: String,
        diagnosedDate: Date,
      },
    ],
    prescriptions: [
      {
        medication: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: Date,
        prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["Active", "Completed", "Discontinued"],
          required: true,
        },
        notes: String,
        refills: [
          {
            date: Date,
            quantity: Number,
            dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          },
        ],
      },
    ],
    visits: [
      {
        date: { type: Date, required: true },
        type: {
          type: String,
          enum: [
            "Routine Checkup",
            "Emergency",
            "Follow-up",
            "Specialist Consultation",
          ],
          required: true,
        },
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        department: { type: String, required: true },
        diagnosis: String,
        notes: String,
        attachments: [
          {
            type: { type: String, required: true },
            url: String,
            description: String,
            uploadedAt: { type: Date, default: Date.now },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          },
        ],
        vitals: {
          bloodPressure: String,
          heartRate: Number,
          temperature: Number,
          weight: Number,
          height: Number,
          oxygenSaturation: Number,
        },
        followUpDate: Date,
      },
    ],
    labReports: [
      {
        testName: { type: String, required: true },
        date: { type: Date, required: true },
        results: String,
        status: {
          type: String,
          enum: ["Pending", "Completed", "Abnormal", "Critical"],
          required: true,
        },
        attachments: [
          {
            type: String,
            url: String,
            description: String,
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
      },
    ],
    insurance: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      coverageType: String,
      validFrom: Date,
      validTo: Date,
      documents: [
        {
          type: String,
          url: String,
          description: String,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    audit: {
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      updatedAt: { type: Date, default: Date.now },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastAccessedAt: Date,
      lastAccessedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      accessLog: [
        {
          timestamp: { type: Date, default: Date.now },
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          action: {
            type: String,
            enum: ["View", "Create", "Update", "Delete", "Export"],
            required: true,
          },
          details: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized search
patientSchema.index({ "personalInfo.patientId": 1 });
patientSchema.index({ "personalInfo.name": "text" });
patientSchema.index({ "medicalHistory.condition": 1 });
patientSchema.index({ "allergies.allergen": 1 });
patientSchema.index({ "visits.date": -1 });
patientSchema.index({ "prescriptions.medication": 1 });
patientSchema.index({ "audit.createdAt": -1 });

// Pre-save middleware for audit logging
patientSchema.pre("save", function (next) {
  this.audit.updatedAt = new Date();
  next();
});

// Static methods
patientSchema.statics.findByPatientId = async function (patientId) {
  return this.findOne({ "personalInfo.patientId": patientId });
};

patientSchema.statics.searchPatients = async function (query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = "audit.createdAt",
    sortOrder = -1,
  } = options;

  const searchQuery = {};

  if (query.name) {
    searchQuery["personalInfo.name"] = { $regex: query.name, $options: "i" };
  }
  if (query.condition) {
    searchQuery["medicalHistory.condition"] = {
      $regex: query.condition,
      $options: "i",
    };
  }
  if (query.allergy) {
    searchQuery["allergies.allergen"] = {
      $regex: query.allergy,
      $options: "i",
    };
  }
  if (query.dateRange) {
    searchQuery["visits.date"] = {
      $gte: new Date(query.dateRange.start),
      $lte: new Date(query.dateRange.end),
    };
  }

  const skip = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    this.find(searchQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("visits.doctor", "name specialization")
      .populate("prescriptions.prescribedBy", "name specialization"),
    this.countDocuments(searchQuery),
  ]);

  return {
    patients,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Instance methods
patientSchema.methods.logAccess = async function (userId, action, details) {
  this.audit.lastAccessedAt = new Date();
  this.audit.lastAccessedBy = userId;
  this.audit.accessLog.push({
    timestamp: new Date(),
    user: userId,
    action,
    details,
  });
  await this.save();
};

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
