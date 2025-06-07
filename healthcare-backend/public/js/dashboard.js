// Dashboard functionality
document.addEventListener("DOMContentLoaded", () => {
  // Initialize charts
  initializeDemographicsChart();
  initializeVisitTrendsChart();
  initializeConditionsChart();
  initializeDepartmentChart();
  loadRecentActivity();

  const userRole = localStorage.getItem("userRole"); // Assuming role is stored in localStorage

  if (userRole && userRole.toLowerCase() === "nurse") {
    // Load nurse-specific analytics
    loadNurseAnalytics();
    loadNurseRecentActivity();
  } else {
    // Load general or doctor-specific analytics
    initializeDemographicsChart();
    initializeVisitTrendsChart();
    initializeConditionsChart();
    initializeDepartmentChart();
    loadRecentActivity(); // Assuming this is general or doctor-specific
  }

  // Event listeners
  document
    .getElementById("dateRange")
    .addEventListener("change", updateDashboardData);
});

// Chart configurations and data
const chartColors = {
  primary: "#2563eb",
  secondary: "#1e40af",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  light: "#e5e7eb",
};

// Demographics Chart
function initializeDemographicsChart() {
  const ctx = document.getElementById("demographicsChart").getContext("2d");

  // Fetch data from API
  fetch("/api/v1/analytics/demographics")
    .then((response) => response.json())
    .then((data) => {
      new Chart(ctx, {
        type: "pie",
        data: {
          labels: data.map((item) => item.gender),
          datasets: [
            {
              data: data.map((item) => item.count),
              backgroundColor: [
                chartColors.primary,
                chartColors.success,
                chartColors.warning,
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
            },
            title: {
              display: true,
              text: "Patient Gender Distribution",
            },
          },
        },
      });
    })
    .catch((error) => console.error("Error loading demographics data:", error));
}

// Visit Trends Chart
function initializeVisitTrendsChart() {
  const ctx = document.getElementById("visitTrendsChart").getContext("2d");

  // Fetch data from API
  fetch("/api/v1/analytics/visit-trends")
    .then((response) => response.json())
    .then((data) => {
      new Chart(ctx, {
        type: "line",
        data: {
          labels: data.map((item) => item.period),
          datasets: [
            {
              label: "Total Visits",
              data: data.map((item) => item.count),
              borderColor: chartColors.primary,
              backgroundColor: `${chartColors.primary}20`,
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: "Visit Trends Over Time",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
            },
          },
        },
      });
    })
    .catch((error) => console.error("Error loading visit trends data:", error));
}

// Medical Conditions Chart
function initializeConditionsChart() {
  const ctx = document.getElementById("conditionsChart").getContext("2d");

  // Fetch data from API
  fetch("/api/v1/analytics/medical-conditions")
    .then((response) => response.json())
    .then((data) => {
      // Sort data by count and take top 5
      const topConditions = data.sort((a, b) => b.count - a.count).slice(0, 5);

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: topConditions.map((item) => item.condition),
          datasets: [
            {
              label: "Number of Patients",
              data: topConditions.map((item) => item.count),
              backgroundColor: chartColors.primary,
              borderColor: chartColors.secondary,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: "Top 5 Medical Conditions",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
            },
          },
        },
      });
    })
    .catch((error) =>
      console.error("Error loading medical conditions data:", error)
    );
}

// Department Performance Chart
function initializeDepartmentChart() {
  const ctx = document.getElementById("departmentChart").getContext("2d");

  // Fetch data from API
  fetch("/api/v1/analytics/department-metrics")
    .then((response) => response.json())
    .then((data) => {
      new Chart(ctx, {
        type: "radar",
        data: {
          labels: data.map((item) => item.department),
          datasets: [
            {
              label: "Performance Score",
              data: data.map((item) => calculatePerformanceScore(item)),
              backgroundColor: `${chartColors.primary}40`,
              borderColor: chartColors.primary,
              pointBackgroundColor: chartColors.primary,
              pointBorderColor: "#fff",
              pointHoverBackgroundColor: "#fff",
              pointHoverBorderColor: chartColors.primary,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: "Department Performance Metrics",
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
            },
          },
        },
      });
    })
    .catch((error) =>
      console.error("Error loading department metrics data:", error)
    );
}

// Calculate department performance score
function calculatePerformanceScore(department) {
  const weights = {
    totalVisits: 0.3,
    uniquePatients: 0.2,
    followUpRate: 0.3,
    averageWaitTime: 0.2,
  };

  // Normalize wait time (lower is better)
  const normalizedWaitTime = Math.max(0, 100 - department.averageWaitTime * 10);

  return (
    department.totalVisits * weights.totalVisits +
    department.uniquePatients * weights.uniquePatients +
    department.followUpRate * weights.followUpRate +
    normalizedWaitTime * weights.averageWaitTime
  );
}

// Load Recent Activity
function loadRecentActivity() {
  const activityList = document.querySelector(".activity-list");

  // Fetch data from API
  fetch("/api/v1/analytics/recent-activity")
    .then((response) => response.json())
    .then((data) => {
      activityList.innerHTML = data
        .map(
          (activity) => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type.toLowerCase()}">
                        <i class="fas ${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-details">
                        <p class="activity-text">${activity.description}</p>
                        <span class="activity-time">${formatTimeAgo(
                          activity.timestamp
                        )}</span>
                    </div>
                </div>
            `
        )
        .join("");
    })
    .catch((error) => console.error("Error loading recent activity:", error));
}

// Helper function to get activity icon
function getActivityIcon(type) {
  const icons = {
    PATIENT_ADDED: "fa-user-plus",
    VISIT_RECORDED: "fa-calendar-check",
    PRESCRIPTION_ADDED: "fa-prescription",
    LAB_RESULT_ADDED: "fa-vial",
    APPOINTMENT_SCHEDULED: "fa-calendar-alt",
  };
  return icons[type] || "fa-info-circle";
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Update dashboard data based on date range
function updateDashboardData() {
  const dateRange = document.getElementById("dateRange").value;
  const startDate = getStartDate(dateRange);
  const endDate = new Date();

  // Update all charts with new date range
  updateDemographicsChart(startDate, endDate);
  updateVisitTrendsChart(startDate, endDate);
  updateConditionsChart(startDate, endDate);
  updateDepartmentChart(startDate, endDate);
  updateRecentActivity(startDate, endDate);
}

// Helper function to get start date based on range
function getStartDate(range) {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "week":
      return new Date(now.setDate(now.getDate() - 7));
    case "month":
      return new Date(now.setMonth(now.getMonth() - 1));
    case "year":
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setMonth(now.getMonth() - 1));
  }
}

// Update functions for each chart
function updateDemographicsChart(startDate, endDate) {
  // Implementation similar to initializeDemographicsChart but with date range
}

function updateVisitTrendsChart(startDate, endDate) {
  // Implementation similar to initializeVisitTrendsChart but with date range
}

function updateConditionsChart(startDate, endDate) {
  // Implementation similar to initializeConditionsChart but with date range
}

function updateDepartmentChart(startDate, endDate) {
  // Implementation similar to initializeDepartmentChart but with date range
}

function updateRecentActivity(startDate, endDate) {
  // Implementation similar to loadRecentActivity but with date range
}

// Function to load nurse-specific analytics
async function loadNurseAnalytics() {
  try {
    // Fetch data for Patient Care
    const patientCareResponse = await fetch(
      "/api/v1/analytics/nurse/patient-care"
    ); // Assuming this endpoint exists
    const patientCareData = await patientCareResponse.json();
    document.querySelector(
      "#nurseDashboard .dashboard-card:nth-child(1) .card-value"
    ).textContent = patientCareData.count; // Assuming the response has a count field

    // Fetch data for Medications
    const medicationsResponse = await fetch(
      "/api/v1/analytics/nurse/medications"
    ); // Assuming this endpoint exists
    const medicationsData = await medicationsResponse.json();
    document.querySelector(
      "#nurseDashboard .dashboard-card:nth-child(2) .card-value"
    ).textContent = medicationsData.count; // Assuming the response has a count field

    // Fetch data for Vitals Check
    const vitalsCheckResponse = await fetch("/api/v1/analytics/nurse/vitals"); // Assuming this endpoint exists
    const vitalsCheckData = await vitalsCheckResponse.json();
    document.querySelector(
      "#nurseDashboard .dashboard-card:nth-child(3) .card-value"
    ).textContent = vitalsCheckData.count; // Assuming the response has a count field
  } catch (error) {
    console.error("Error loading nurse analytics:", error);
    // Optionally display a message to the user
  }
}

// Function to load nurse-specific recent activity
async function loadNurseRecentActivity() {
  try {
    const recentActivityList = document.querySelector(
      "#nurseDashboard .activity-list"
    );
    recentActivityList.innerHTML = ""; // Clear existing activities

    const recentActivityResponse = await fetch(
      "/api/v1/analytics/nurse/recent-activity"
    ); // Assuming this endpoint exists
    const recentActivityData = await recentActivityResponse.json(); // Assuming this returns an array of activity objects

    if (recentActivityData && recentActivityData.length > 0) {
      recentActivityData.forEach((activity) => {
        const activityItem = document.createElement("li");
        activityItem.classList.add("activity-item");
        activityItem.innerHTML = `
          <div class="activity-icon">
            <i class="${getActivityIcon(
              activity.type
            )}"></i> <!-- Assuming activity object has a type field -->
          </div>
          <div class="activity-details">
            <div class="activity-title">${
              activity.description
            }</div> <!-- Assuming activity object has a description field -->
            <div class="activity-time">${formatTimeAgo(
              activity.timestamp
            )}</div> <!-- Assuming activity object has a timestamp field -->
          </div>
        `;
        recentActivityList.appendChild(activityItem);
      });
    } else {
      recentActivityList.innerHTML =
        '<li class="activity-item">No recent activity</li>';
    }
  } catch (error) {
    console.error("Error loading nurse recent activity:", error);
    const recentActivityList = document.querySelector(
      "#nurseDashboard .activity-list"
    );
    recentActivityList.innerHTML =
      '<li class="activity-item">Error loading activity</li>';
  }
}
