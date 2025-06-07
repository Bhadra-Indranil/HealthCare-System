const express = require("express");
const router = express.Router();
const { getDB } = require("../models/db");
const Patient = require("../models/patient");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const User = require("../models/user");
const Appointment = require("../models/appointment");

// Get overall patient demographics
router.get("/demographics", authenticateToken, async (req, res, next) => {
  try {
    const demographics = await Patient.aggregate([
      {
        $group: {
          _id: "$personalInfo.gender",
          count: { $sum: 1 },
          averageAge: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), "$personalInfo.dateOfBirth"] },
                365 * 24 * 60 * 60 * 1000,
              ],
            },
          },
          ageGroups: {
            $push: {
              $switch: {
                branches: [
                  {
                    case: {
                      $lt: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                new Date(),
                                "$personalInfo.dateOfBirth",
                              ],
                            },
                            365 * 24 * 60 * 60 * 1000,
                          ],
                        },
                        18,
                      ],
                    },
                    then: "Under 18",
                  },
                  {
                    case: {
                      $lt: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                new Date(),
                                "$personalInfo.dateOfBirth",
                              ],
                            },
                            365 * 24 * 60 * 60 * 1000,
                          ],
                        },
                        30,
                      ],
                    },
                    then: "18-29",
                  },
                  {
                    case: {
                      $lt: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                new Date(),
                                "$personalInfo.dateOfBirth",
                              ],
                            },
                            365 * 24 * 60 * 60 * 1000,
                          ],
                        },
                        45,
                      ],
                    },
                    then: "30-44",
                  },
                  {
                    case: {
                      $lt: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                new Date(),
                                "$personalInfo.dateOfBirth",
                              ],
                            },
                            365 * 24 * 60 * 60 * 1000,
                          ],
                        },
                        60,
                      ],
                    },
                    then: "45-59",
                  },
                ],
                default: "60+",
              },
            },
          },
        },
      },
      {
        $project: {
          gender: "$_id",
          count: 1,
          averageAge: { $round: ["$averageAge", 2] },
          ageDistribution: {
            $reduce: {
              input: "$ageGroups",
              initialValue: {
                "Under 18": 0,
                "18-29": 0,
                "30-44": 0,
                "45-59": 0,
                "60+": 0,
              },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          _id: 0,
        },
      },
    ]);

    res.json(demographics);
  } catch (error) {
    next(error);
  }
});

// Get age distribution in ranges
router.get("/age-distribution", async (req, res) => {
  try {
    const db = getDB();
    const ageDistribution = await db
      .collection("patients")
      .aggregate([
        {
          $bucket: {
            groupBy: "$age",
            boundaries: [0, 18, 30, 45, 60, 75, 90],
            default: "Above 90",
            output: {
              count: { $sum: 1 },
              patients: { $push: { name: "$name", age: "$age" } },
            },
          },
        },
        {
          $project: {
            ageRange: {
              $cond: {
                if: { $eq: ["$_id", "Above 90"] },
                then: "Above 90",
                else: {
                  $concat: [
                    { $toString: { $arrayElemAt: ["$boundaries", 0] } },
                    "-",
                    { $toString: { $arrayElemAt: ["$boundaries", 1] } },
                  ],
                },
              },
            },
            count: 1,
            patients: 1,
            _id: 0,
          },
        },
      ])
      .toArray();

    res.status(200).json(ageDistribution);
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch age distribution" });
  }
});

// Get patient registration trends (if you have registration dates)
router.get("/registration-trends", async (req, res) => {
  try {
    const db = getDB();
    const registrationTrends = await db
      .collection("patients")
      .aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$registrationDate" },
              month: { $month: "$registrationDate" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
        {
          $project: {
            _id: 0,
            period: {
              $concat: [
                { $toString: "$_id.year" },
                "-",
                { $toString: "$_id.month" },
              ],
            },
            count: 1,
          },
        },
      ])
      .toArray();

    res.status(200).json(registrationTrends);
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch registration trends" });
  }
});

// Get health condition statistics (if you have health conditions in your data)
router.get("/health-conditions", async (req, res) => {
  try {
    const db = getDB();
    const healthStats = await db
      .collection("patients")
      .aggregate([
        {
          $unwind: "$conditions", // Assuming conditions is an array field
        },
        {
          $group: {
            _id: "$conditions",
            count: { $sum: 1 },
            patients: { $push: { name: "$name", age: "$age" } },
          },
        },
        {
          $project: {
            condition: "$_id",
            count: 1,
            patients: 1,
            _id: 0,
          },
        },
        {
          $sort: { count: -1 },
        },
      ])
      .toArray();

    res.status(200).json(healthStats);
  } catch (error) {
    console.error("Analytics Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch health condition statistics" });
  }
});

// Get gender distribution with additional metrics
router.get("/gender-stats", async (req, res) => {
  try {
    const db = getDB();
    const genderStats = await db
      .collection("patients")
      .aggregate([
        {
          $group: {
            _id: "$gender",
            total: { $sum: 1 },
            averageAge: { $avg: "$age" },
            ageGroups: {
              $push: {
                $cond: [
                  { $lt: ["$age", 18] },
                  "Under 18",
                  {
                    $cond: [
                      { $lt: ["$age", 30] },
                      "18-29",
                      {
                        $cond: [
                          { $lt: ["$age", 45] },
                          "30-44",
                          {
                            $cond: [{ $lt: ["$age", 60] }, "45-59", "60+"],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $project: {
            gender: "$_id",
            total: 1,
            averageAge: { $round: ["$averageAge", 2] },
            ageDistribution: {
              $reduce: {
                input: "$ageGroups",
                initialValue: {
                  "Under 18": 0,
                  "18-29": 0,
                  "30-44": 0,
                  "45-59": 0,
                  "60+": 0,
                },
                in: {
                  $mergeObjects: [
                    "$$value",
                    {
                      $let: {
                        vars: { group: "$$this" },
                        in: {
                          $mergeObjects: [
                            "$$value",
                            {
                              $$group: {
                                $add: [
                                  {
                                    $ifNull: [
                                      {
                                        $arrayElemAt: [
                                          { $objectToArray: "$$value" },
                                          0,
                                        ],
                                      },
                                      0,
                                    ],
                                  },
                                  1,
                                ],
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
            _id: 0,
          },
        },
      ])
      .toArray();

    res.status(200).json(genderStats);
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch gender statistics" });
  }
});

// Get medical condition and allergy histogram data
router.get("/medical-histogram", async (req, res) => {
  try {
    const db = getDB();
    const medicalHistogram = await db
      .collection("patients")
      .aggregate([
        // First unwind both medical history and allergies arrays
        {
          $facet: {
            // Analyze medical history
            medicalHistory: [
              { $unwind: "$medicalHistory" },
              {
                $group: {
                  _id: "$medicalHistory",
                  totalPatients: { $sum: 1 },
                  patientDetails: {
                    $push: {
                      name: "$name",
                      age: "$age",
                      gender: "$gender",
                      prescriptions: "$prescriptions",
                      doctorNotes: "$doctorNotes",
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  condition: "$_id",
                  type: "Medical History",
                  totalPatients: 1,
                  patientDetails: 1,
                  // Calculate age statistics
                  ageStats: {
                    averageAge: { $avg: "$patientDetails.age" },
                    minAge: { $min: "$patientDetails.age" },
                    maxAge: { $max: "$patientDetails.age" },
                  },
                  // Calculate gender distribution
                  genderDistribution: {
                    $reduce: {
                      input: "$patientDetails",
                      initialValue: { Female: 0, Male: 0, Other: 0 },
                      in: {
                        $mergeObjects: [
                          "$$value",
                          {
                            $switch: {
                              branches: [
                                {
                                  case: { $eq: ["$$this.gender", "Female"] },
                                  then: {
                                    Female: { $add: ["$$value.Female", 1] },
                                  },
                                },
                                {
                                  case: { $eq: ["$$this.gender", "Male"] },
                                  then: { Male: { $add: ["$$value.Male", 1] } },
                                },
                              ],
                              default: {
                                Other: { $add: ["$$value.Other", 1] },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  // Get unique prescriptions for this condition
                  commonPrescriptions: {
                    $reduce: {
                      input: "$patientDetails",
                      initialValue: [],
                      in: {
                        $concatArrays: [
                          "$$value",
                          { $ifNull: ["$$this.prescriptions", []] },
                        ],
                      },
                    },
                  },
                },
              },
            ],
            // Analyze allergies
            allergies: [
              { $unwind: "$allergies" },
              {
                $group: {
                  _id: "$allergies",
                  totalPatients: { $sum: 1 },
                  patientDetails: {
                    $push: {
                      name: "$name",
                      age: "$age",
                      gender: "$gender",
                      medicalHistory: "$medicalHistory",
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  condition: "$_id",
                  type: "Allergy",
                  totalPatients: 1,
                  patientDetails: 1,
                  // Calculate age statistics
                  ageStats: {
                    averageAge: { $avg: "$patientDetails.age" },
                    minAge: { $min: "$patientDetails.age" },
                    maxAge: { $max: "$patientDetails.age" },
                  },
                  // Calculate gender distribution
                  genderDistribution: {
                    $reduce: {
                      input: "$patientDetails",
                      initialValue: { Female: 0, Male: 0, Other: 0 },
                      in: {
                        $mergeObjects: [
                          "$$value",
                          {
                            $switch: {
                              branches: [
                                {
                                  case: { $eq: ["$$this.gender", "Female"] },
                                  then: {
                                    Female: { $add: ["$$value.Female", 1] },
                                  },
                                },
                                {
                                  case: { $eq: ["$$this.gender", "Male"] },
                                  then: { Male: { $add: ["$$value.Male", 1] } },
                                },
                              ],
                              default: {
                                Other: { $add: ["$$value.Other", 1] },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  // Get associated medical conditions
                  associatedConditions: {
                    $reduce: {
                      input: "$patientDetails",
                      initialValue: [],
                      in: {
                        $concatArrays: [
                          "$$value",
                          { $ifNull: ["$$this.medicalHistory", []] },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        // Combine and process the results
        {
          $project: {
            allConditions: {
              $concatArrays: [
                {
                  $map: {
                    input: "$medicalHistory",
                    as: "mh",
                    in: {
                      $mergeObjects: [
                        "$$mh",
                        {
                          ageStats: {
                            averageAge: {
                              $round: ["$$mh.ageStats.averageAge", 2],
                            },
                            minAge: "$$mh.ageStats.minAge",
                            maxAge: "$$mh.ageStats.maxAge",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $map: {
                    input: "$allergies",
                    as: "al",
                    in: {
                      $mergeObjects: [
                        "$$al",
                        {
                          ageStats: {
                            averageAge: {
                              $round: ["$$al.ageStats.averageAge", 2],
                            },
                            minAge: "$$al.ageStats.minAge",
                            maxAge: "$$al.ageStats.maxAge",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ])
      .toArray();

    // Process the results
    const conditions = medicalHistogram[0].allConditions;

    // Calculate total patients for percentage normalization
    const totalPatients = conditions.reduce(
      (sum, condition) => sum + condition.totalPatients,
      0
    );

    // Add percentages and clean up the data
    const normalizedHistogram = conditions.map((condition) => ({
      ...condition,
      percentage: ((condition.totalPatients / totalPatients) * 100).toFixed(2),
      // Get top 3 most common associated items
      topAssociated:
        condition.type === "Medical History"
          ? [...new Set(condition.commonPrescriptions)].slice(0, 3)
          : [...new Set(condition.associatedConditions)].slice(0, 3),
    }));

    // Sort by total patients
    normalizedHistogram.sort((a, b) => b.totalPatients - a.totalPatients);

    res.status(200).json({
      totalPatients,
      conditions: normalizedHistogram,
      summary: {
        totalUniqueConditions: normalizedHistogram.length,
        medicalHistoryCount: normalizedHistogram.filter(
          (c) => c.type === "Medical History"
        ).length,
        allergyCount: normalizedHistogram.filter((c) => c.type === "Allergy")
          .length,
        mostCommonCondition: normalizedHistogram[0]?.condition,
        leastCommonCondition:
          normalizedHistogram[normalizedHistogram.length - 1]?.condition,
      },
    });
  } catch (error) {
    console.error("Medical Histogram Error:", error);
    res.status(500).json({ error: "Failed to generate medical histogram" });
  }
});

// Get medical conditions analysis
router.get("/medical-conditions", authenticateToken, async (req, res, next) => {
  try {
    const conditions = await Patient.aggregate([
      { $unwind: "$medicalHistory" },
      {
        $group: {
          _id: "$medicalHistory.condition",
          count: { $sum: 1 },
          severityDistribution: {
            $push: "$medicalHistory.severity",
          },
          statusDistribution: {
            $push: "$medicalHistory.status",
          },
          patients: {
            $push: {
              patientId: "$personalInfo.patientId",
              name: "$personalInfo.name",
              age: {
                $divide: [
                  { $subtract: [new Date(), "$personalInfo.dateOfBirth"] },
                  365 * 24 * 60 * 60 * 1000,
                ],
              },
              gender: "$personalInfo.gender",
            },
          },
        },
      },
      {
        $project: {
          condition: "$_id",
          count: 1,
          severityBreakdown: {
            $reduce: {
              input: "$severityDistribution",
              initialValue: { Mild: 0, Moderate: 0, Severe: 0, Critical: 0 },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          statusBreakdown: {
            $reduce: {
              input: "$statusDistribution",
              initialValue: {
                Active: 0,
                Resolved: 0,
                Chronic: 0,
                "Under Observation": 0,
              },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          averageAge: { $avg: "$patients.age" },
          genderDistribution: {
            $reduce: {
              input: "$patients",
              initialValue: { Male: 0, Female: 0, Other: 0 },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this.gender]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(conditions);
  } catch (error) {
    next(error);
  }
});

// Get prescription analysis
router.get("/prescriptions", authenticateToken, async (req, res, next) => {
  try {
    const prescriptions = await Patient.aggregate([
      { $unwind: "$prescriptions" },
      {
        $group: {
          _id: "$prescriptions.medication",
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ["$prescriptions.status", "Active"] }, 1, 0],
            },
          },
          dosageDistribution: {
            $push: "$prescriptions.dosage",
          },
          frequencyDistribution: {
            $push: "$prescriptions.frequency",
          },
          patients: {
            $push: {
              patientId: "$personalInfo.patientId",
              name: "$personalInfo.name",
              conditions: "$medicalHistory.condition",
            },
          },
        },
      },
      {
        $project: {
          medication: "$_id",
          totalPrescriptions: "$count",
          activePrescriptions: "$activeCount",
          mostCommonDosage: {
            $reduce: {
              input: "$dosageDistribution",
              initialValue: { value: null, count: 0 },
              in: {
                $let: {
                  vars: {
                    currentCount: {
                      $size: {
                        $filter: {
                          input: "$dosageDistribution",
                          as: "d",
                          cond: { $eq: ["$$d", "$$this"] },
                        },
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: ["$$currentCount", "$$value.count"] },
                      { value: "$$this", count: "$$currentCount" },
                      "$$value",
                    ],
                  },
                },
              },
            },
          },
          mostCommonFrequency: {
            $reduce: {
              input: "$frequencyDistribution",
              initialValue: { value: null, count: 0 },
              in: {
                $let: {
                  vars: {
                    currentCount: {
                      $size: {
                        $filter: {
                          input: "$frequencyDistribution",
                          as: "f",
                          cond: { $eq: ["$$f", "$$this"] },
                        },
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: ["$$currentCount", "$$value.count"] },
                      { value: "$$this", count: "$$currentCount" },
                      "$$value",
                    ],
                  },
                },
              },
            },
          },
          associatedConditions: {
            $reduce: {
              input: "$patients",
              initialValue: [],
              in: {
                $concatArrays: [
                  "$$value",
                  { $ifNull: ["$$this.conditions", []] },
                ],
              },
            },
          },
          _id: 0,
        },
      },
      { $sort: { totalPrescriptions: -1 } },
    ]);

    res.json(prescriptions);
  } catch (error) {
    next(error);
  }
});

// Get visit trends
router.get("/visit-trends", authenticateToken, async (req, res, next) => {
  try {
    const { startDate, endDate, interval = "month" } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage["visits.date"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const visitTrends = await Patient.aggregate([
      { $unwind: "$visits" },
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$visits.date" },
            month: { $month: "$visits.date" },
            day: { $dayOfMonth: "$visits.date" },
          },
          count: { $sum: 1 },
          types: { $push: "$visits.type" },
          departments: { $push: "$visits.department" },
        },
      },
      {
        $project: {
          period: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: "$_id.month" },
              "-",
              { $toString: "$_id.day" },
            ],
          },
          count: 1,
          typeDistribution: {
            $reduce: {
              input: "$types",
              initialValue: {
                "Routine Checkup": 0,
                Emergency: 0,
                "Follow-up": 0,
                "Specialist Consultation": 0,
              },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          departmentDistribution: {
            $reduce: {
              input: "$departments",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          _id: 0,
        },
      },
      { $sort: { period: 1 } },
    ]);

    res.json(visitTrends);
  } catch (error) {
    next(error);
  }
});

// Get lab report analysis
router.get("/lab-reports", authenticateToken, async (req, res, next) => {
  try {
    const labAnalysis = await Patient.aggregate([
      { $unwind: "$labReports" },
      {
        $group: {
          _id: "$labReports.testName",
          count: { $sum: 1 },
          statusDistribution: {
            $push: "$labReports.status",
          },
          abnormalCount: {
            $sum: {
              $cond: [
                { $in: ["$labReports.status", ["Abnormal", "Critical"]] },
                1,
                0,
              ],
            },
          },
          patients: {
            $push: {
              patientId: "$personalInfo.patientId",
              name: "$personalInfo.name",
              age: {
                $divide: [
                  { $subtract: [new Date(), "$personalInfo.dateOfBirth"] },
                  365 * 24 * 60 * 60 * 1000,
                ],
              },
              gender: "$personalInfo.gender",
            },
          },
        },
      },
      {
        $project: {
          testName: "$_id",
          totalTests: "$count",
          abnormalTests: "$abnormalCount",
          abnormalRate: {
            $multiply: [{ $divide: ["$abnormalCount", "$count"] }, 100],
          },
          statusBreakdown: {
            $reduce: {
              input: "$statusDistribution",
              initialValue: {
                Pending: 0,
                Completed: 0,
                Abnormal: 0,
                Critical: 0,
              },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          averageAge: { $avg: "$patients.age" },
          genderDistribution: {
            $reduce: {
              input: "$patients",
              initialValue: { Male: 0, Female: 0, Other: 0 },
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    [$$this.gender]: {
                      $add: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [{ $objectToArray: "$$value" }, 0],
                            },
                            0,
                          ],
                        },
                        1,
                      ],
                    },
                  },
                ],
              },
            },
          },
          _id: 0,
        },
      },
      { $sort: { totalTests: -1 } },
    ]);

    res.json(labAnalysis);
  } catch (error) {
    next(error);
  }
});

// Get department performance metrics
router.get(
  "/department-metrics",
  authenticateToken,
  authorizeRole(["ADMIN", "DOCTOR"]),
  async (req, res, next) => {
    try {
      const departmentMetrics = await Patient.aggregate([
        { $unwind: "$visits" },
        {
          $group: {
            _id: "$visits.department",
            totalVisits: { $sum: 1 },
            uniquePatients: { $addToSet: "$_id" },
            visitTypes: { $push: "$visits.type" },
            averageWaitTime: { $avg: "$visits.waitTime" },
            followUpRate: {
              $avg: {
                $cond: [{ $eq: ["$visits.type", "Follow-up"] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            department: "$_id",
            totalVisits: 1,
            uniquePatients: { $size: "$uniquePatients" },
            visitTypeDistribution: {
              $reduce: {
                input: "$visitTypes",
                initialValue: {
                  "Routine Checkup": 0,
                  Emergency: 0,
                  "Follow-up": 0,
                  "Specialist Consultation": 0,
                },
                in: {
                  $mergeObjects: [
                    "$$value",
                    {
                      [$$this]: {
                        $add: [
                          {
                            $ifNull: [
                              {
                                $arrayElemAt: [
                                  { $objectToArray: "$$value" },
                                  0,
                                ],
                              },
                              0,
                            ],
                          },
                          1,
                        ],
                      },
                    },
                  ],
                },
              },
            },
            averageWaitTime: { $round: ["$averageWaitTime", 2] },
            followUpRate: { $multiply: ["$followUpRate", 100] },
            _id: 0,
          },
        },
        { $sort: { totalVisits: -1 } },
      ]);

      res.json(departmentMetrics);
    } catch (error) {
      next(error);
    }
  }
);

// Get analytics data
router.get("/", authenticateToken, async (req, res) => {
  try {
    // Get gender demographics
    const genderStats = await Patient.aggregate([
      { $group: { _id: "$personalInfo.gender", count: { $sum: 1 } } },
    ]);

    // Get age distribution
    const ageStats = await Patient.aggregate([
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: {
                    $lt: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              new Date(),
                              "$personalInfo.dateOfBirth",
                            ],
                          },
                          365 * 24 * 60 * 60 * 1000,
                        ],
                      },
                      18,
                    ],
                  },
                  then: "0-17",
                },
                {
                  case: {
                    $lt: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              new Date(),
                              "$personalInfo.dateOfBirth",
                            ],
                          },
                          365 * 24 * 60 * 60 * 1000,
                        ],
                      },
                      30,
                    ],
                  },
                  then: "18-29",
                },
                {
                  case: {
                    $lt: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              new Date(),
                              "$personalInfo.dateOfBirth",
                            ],
                          },
                          365 * 24 * 60 * 60 * 1000,
                        ],
                      },
                      45,
                    ],
                  },
                  then: "30-44",
                },
                {
                  case: {
                    $lt: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              new Date(),
                              "$personalInfo.dateOfBirth",
                            ],
                          },
                          365 * 24 * 60 * 60 * 1000,
                        ],
                      },
                      60,
                    ],
                  },
                  then: "45-59",
                },
              ],
              default: "60+",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get department distribution (assuming doctor specialization is in User model)
    const departmentStats = await Appointment.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: "$doctor" },
      { $group: { _id: "$doctor.specialization", count: { $sum: 1 } } },
    ]);

    // Get appointment trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    const appointmentTrends = await Appointment.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(last7Days[0] + "T00:00:00.000Z"),
            $lte: new Date(last7Days[6] + "T23:59:59.999Z"),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Map gender stats to an object with male, female, other counts
    const formattedGenderStats = {
      male: 0,
      female: 0,
      other: 0,
    };
    genderStats.forEach((stat) => {
      if (stat._id) {
        formattedGenderStats[stat._id.toLowerCase()] = stat.count;
      }
    });

    // Format the data for the frontend
    const response = {
      demographics: {
        gender: formattedGenderStats,
      },
      ageDistribution: {
        labels: ageStats.map((stat) => stat._id).sort(), // Sort age ranges
        data: ageStats.map((stat) => stat.count),
      },
      departments: {
        labels: departmentStats
          .map((stat) => stat._id)
          .filter((label) => label), // Filter out null/undefined specializations
        data: departmentStats.map((stat) => stat.count),
      },
      appointments: {
        labels: last7Days,
        data: last7Days.map((day) => {
          const trend = appointmentTrends.find((t) => t._id === day);
          return trend ? trend.count : 0;
        }),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Error fetching analytics data" });
  }
});

// Nurse-specific analytics endpoints

// Get total patients under the care of the logged-in nurse
router.get(
  "/nurse/patient-care",
  authenticateToken,
  authorizeRole(["NURSE"]),
  async (req, res, next) => {
    try {
      const nurseId = req.user.userId; // Assuming userId is available in req.user after authentication
      const db = getDB();

      // TODO: Implement database query to count patients associated with this nurse.
      // This will depend on how patients are linked to nurses in your database schema.
      // Example placeholder:
      // const patientCount = await db.collection('patients').countDocuments({ assignedNurseId: nurseId });

      const patientCount = 15; // Placeholder data

      res.json({ count: patientCount });
    } catch (error) {
      console.error("Error fetching nurse patient care analytics:", error);
      next(error);
    }
  }
);

// Get count of pending medication rounds for the logged-in nurse
router.get(
  "/nurse/medications",
  authenticateToken,
  authorizeRole(["NURSE"]),
  async (req, res, next) => {
    try {
      const nurseId = req.user.userId;
      const db = getDB();

      // TODO: Implement database query to count pending medications for this nurse.
      // This depends on your medication scheduling/tracking in the database.
      // Example placeholder:
      // const pendingMedicationsCount = await db.collection('medications').countDocuments({ assignedNurseId: nurseId, status: 'pending' });

      const pendingMedicationsCount = 7; // Placeholder data

      res.json({ count: pendingMedicationsCount });
    } catch (error) {
      console.error("Error fetching nurse medication analytics:", error);
      next(error);
    }
  }
);

// Get count of vitals check needed for patients under the logged-in nurse's care
router.get(
  "/nurse/vitals",
  authenticateToken,
  authorizeRole(["NURSE"]),
  async (req, res, next) => {
    try {
      const nurseId = req.user.userId;
      const db = getDB();

      // TODO: Implement database query to count patients needing vitals check for this nurse.
      // This depends on your vitals tracking and nurse-patient assignment.
      // Example placeholder:
      // const vitalsCheckCount = await db.collection('vitals').countDocuments({ assignedNurseId: nurseId, status: 'pending' });

      const vitalsCheckCount = 10; // Placeholder data

      res.json({ count: vitalsCheckCount });
    } catch (error) {
      console.error("Error fetching nurse vitals analytics:", error);
      next(error);
    }
  }
);

// Get recent care activities for the logged-in nurse
router.get(
  "/nurse/recent-activity",
  authenticateToken,
  authorizeRole(["NURSE"]),
  async (req, res, next) => {
    try {
      const nurseId = req.user.userId;
      const db = getDB();

      // TODO: Implement database query to fetch recent activities related to this nurse.
      // This depends on how activities (like vitals check, medication admin) are logged and linked to nurses.
      // Example placeholder (fetching recent activities from a hypothetical 'activities' collection):
      // const recentActivities = await db.collection('activities')
      //   .find({ performedBy: nurseId })
      //   .sort({ timestamp: -1 })
      //   .limit(5) // Adjust limit as needed
      //   .toArray();

      const recentActivities = [
        // Placeholder data
        {
          type: "Vitals Check",
          description: "Vitals Check - Room 302",
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
        }, // 1 hour ago
        {
          type: "Medication Administered",
          description: "Medication Administered - Room 305",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        }, // 2 hours ago
      ];

      res.json(recentActivities);
    } catch (error) {
      console.error("Error fetching nurse recent activity:", error);
      next(error);
    }
  }
);

module.exports = router;
