// Main application functionality
document.addEventListener("DOMContentLoaded", () => {
  // Initialize navigation
  initializeNavigation();

  // Initialize search functionality
  initializeSearch();

  // Initialize notifications
  initializeNotifications();

  // Initialize modals
  initializeModals();
});

// Navigation handling
function initializeNavigation() {
  const navLinks = document.querySelectorAll(".nav-links li");
  const contentAreas = document.querySelectorAll(".content-area");

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      // Remove active class from all links
      navLinks.forEach((l) => l.classList.remove("active"));

      // Add active class to clicked link
      link.classList.add("active");

      // Show corresponding content area
      const page = link.dataset.page;
      contentAreas.forEach((area) => {
        area.style.display = area.id === page ? "block" : "none";
      });

      // Load page-specific content
      loadPageContent(page);
    });
  });
}

// Load page-specific content
async function loadPageContent(page) {
  switch (page) {
    case "dashboard":
      // Dashboard is loaded by default
      break;
    case "patients":
      await loadPatientsPage();
      break;
    case "analytics":
      await loadAnalyticsPage();
      break;
    case "appointments":
      await loadAppointmentsPage();
      break;
    case "settings":
      await loadSettingsPage();
      break;
  }
}

// Search functionality
function initializeSearch() {
  const searchInput = document.querySelector(".search-bar input");
  let searchTimeout;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      }
    }, 300);
  });
}

async function performSearch(query) {
  try {
    const response = await fetch(
      `/api/v1/patients/search?q=${encodeURIComponent(query)}`,
      {
        headers: auth.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const results = await response.json();
    displaySearchResults(results);
  } catch (error) {
    console.error("Search error:", error);
    showNotification("Search failed. Please try again.", "error");
  }
}

function displaySearchResults(results) {
  // Create and show search results dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "search-results-dropdown";

  if (results.length === 0) {
    dropdown.innerHTML = '<div class="no-results">No results found</div>';
  } else {
    dropdown.innerHTML = results
      .map(
        (result) => `
            <div class="search-result-item" data-id="${result._id}">
                <div class="result-name">${result.personalInfo.name}</div>
                <div class="result-details">
                    <span>ID: ${result.personalInfo.patientId}</span>
                    <span>Age: ${calculateAge(
                      result.personalInfo.dateOfBirth
                    )}</span>
                </div>
            </div>
        `
      )
      .join("");

    // Add click handlers
    dropdown.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const patientId = item.dataset.id;
        navigateToPatient(patientId);
      });
    });
  }

  // Remove existing dropdown if any
  const existingDropdown = document.querySelector(".search-results-dropdown");
  if (existingDropdown) {
    existingDropdown.remove();
  }

  // Add new dropdown
  document.querySelector(".search-bar").appendChild(dropdown);
}

// Notifications handling
function initializeNotifications() {
  const notificationBtn = document.querySelector(".notification-btn");

  notificationBtn.addEventListener("click", () => {
    toggleNotificationsPanel();
  });

  // Close notifications panel when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".notification-btn") &&
      !e.target.closest(".notifications-panel")
    ) {
      const panel = document.querySelector(".notifications-panel");
      if (panel) {
        panel.remove();
      }
    }
  });
}

async function toggleNotificationsPanel() {
  const existingPanel = document.querySelector(".notifications-panel");
  if (existingPanel) {
    existingPanel.remove();
    return;
  }

  try {
    const response = await fetch("/api/v1/notifications", {
      headers: auth.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    const notifications = await response.json();
    displayNotifications(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    showNotification("Failed to load notifications", "error");
  }
}

function displayNotifications(notifications) {
  const panel = document.createElement("div");
  panel.className = "notifications-panel";

  if (notifications.length === 0) {
    panel.innerHTML =
      '<div class="no-notifications">No new notifications</div>';
  } else {
    panel.innerHTML = `
            <div class="notifications-header">
                <h3>Notifications</h3>
                <button class="mark-all-read">Mark all as read</button>
            </div>
            <div class="notifications-list">
                ${notifications
                  .map(
                    (notification) => `
                    <div class="notification-item ${
                      notification.read ? "read" : "unread"
                    }" 
                         data-id="${notification._id}">
                        <div class="notification-icon">
                            <i class="fas ${getNotificationIcon(
                              notification.type
                            )}"></i>
                        </div>
                        <div class="notification-content">
                            <p>${notification.message}</p>
                            <span class="notification-time">${formatTimeAgo(
                              notification.timestamp
                            )}</span>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;

    // Add click handlers
    panel.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", () => {
        markNotificationAsRead(item.dataset.id);
      });
    });

    panel.querySelector(".mark-all-read").addEventListener("click", () => {
      markAllNotificationsAsRead();
    });
  }

  // Position and show panel
  const button = document.querySelector(".notification-btn");
  const rect = button.getBoundingClientRect();
  panel.style.top = `${rect.bottom + 10}px`;
  panel.style.right = `${window.innerWidth - rect.right}px`;

  document.body.appendChild(panel);
}

// Modal handling
function initializeModals() {
  // Add patient modal
  const addPatientBtn = document.querySelector(".add-patient-btn");
  if (addPatientBtn) {
    addPatientBtn.addEventListener("click", () => {
      showAddPatientModal();
    });
  }

  // Close modals when clicking outside
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("active");
    }
  });
}

function showAddPatientModal() {
  const modal = document.getElementById("addPatientModal");
  modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New Patient</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="addPatientForm">
                <div class="form-group">
                    <label for="patientName">Full Name</label>
                    <input type="text" id="patientName" name="name" required>
                </div>
                <div class="form-group">
                    <label for="patientDOB">Date of Birth</label>
                    <input type="date" id="patientDOB" name="dateOfBirth" required>
                </div>
                <div class="form-group">
                    <label for="patientGender">Gender</label>
                    <select id="patientGender" name="gender" required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="patientPhone">Phone Number</label>
                    <input type="tel" id="patientPhone" name="phone">
                </div>
                <div class="form-group">
                    <label for="patientEmail">Email</label>
                    <input type="email" id="patientEmail" name="email">
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="submit" class="submit-btn">Add Patient</button>
                </div>
            </form>
        </div>
    `;

  // Add event listeners
  const form = modal.querySelector("#addPatientForm");
  const closeBtn = modal.querySelector(".close-modal");
  const cancelBtn = modal.querySelector(".cancel-btn");

  form.addEventListener("submit", handleAddPatient);
  closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  cancelBtn.addEventListener("click", () => modal.classList.remove("active"));

  // Show modal
  modal.classList.add("active");
}

async function handleAddPatient(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const patientData = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/v1/patients", {
      method: "POST",
      headers: {
        ...auth.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      throw new Error("Failed to add patient");
    }

    const result = await response.json();
    showNotification("Patient added successfully", "success");
    document.getElementById("addPatientModal").classList.remove("active");

    // Refresh patients list if on patients page
    if (document.querySelector("#patients").style.display === "block") {
      loadPatientsPage();
    }
  } catch (error) {
    console.error("Error adding patient:", error);
    showNotification("Failed to add patient. Please try again.", "error");
  }
}

// Utility functions
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification">&times;</button>
    `;

  document.body.appendChild(notification);

  // Add close button handler
  notification
    .querySelector(".close-notification")
    .addEventListener("click", () => {
      notification.remove();
    });

  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function getNotificationIcon(type) {
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  return icons[type] || icons.info;
}

function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

function navigateToPatient(patientId) {
  // Navigate to patients page and show patient details
  document.querySelector('[data-page="patients"]').click();
  // Additional navigation logic will be handled in patients.js
}

// Export for use in other modules
window.app = {
  showNotification,
  navigateToPatient,
};
