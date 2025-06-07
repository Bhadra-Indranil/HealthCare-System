// --- Patient Specific Logic ---

// Get modal and button elements
const addPatientModal = document.getElementById("addPatientModal");
const addPatientBtn = document.getElementById("addPatientBtn");
const closeButton = addPatientModal.querySelector(".close-button");
const addPatientForm = document.getElementById("addPatientForm");
const addPatientMessage = document.getElementById("addPatientMessage");
const patientsTableBody = document.getElementById("patientsTableBody");
const noPatientsMessage = document.getElementById("noPatientsMessage");

// Function to open the modal
if (addPatientBtn) {
  addPatientBtn.onclick = function () {
    addPatientModal.style.display = "block";
    addPatientMessage.style.display = "none"; // Hide previous messages
    addPatientForm.reset(); // Clear the form
  };
}

// Function to close the modal
if (closeButton) {
  closeButton.onclick = function () {
    addPatientModal.style.display = "none";
  };
}

// Close the modal if the user clicks outside of it
window.onclick = function (event) {
  if (event.target == addPatientModal) {
    addPatientModal.style.display = "none";
  }
};

// Function to fetch and display patients
async function fetchPatients(searchQuery = "") {
  try {
    console.log("Fetching patients...");
    const url = searchQuery
      ? `/api/v1/patients?search=${encodeURIComponent(searchQuery)}`
      : "/api/v1/patients";
    console.log("Fetching from URL:", url);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const patients = await response.json();
    console.log("Received patients:", patients);

    if (!patientsTableBody) {
      console.error("patientsTableBody element not found");
      return;
    }

    patientsTableBody.innerHTML = ""; // Clear existing rows

    if (patients.length > 0) {
      noPatientsMessage.style.display = "none";
      patients.forEach((patient) => {
        const row = patientsTableBody.insertRow();
        row.innerHTML = `
                    <td>${patient.personalInfo.patientId}</td>
                    <td>${patient.personalInfo.name}</td>
                    <td>${patient.contact?.email || "N/A"}</td>
                    <td>${patient.contact?.phone || "N/A"}</td>
                    <td>${new Date(
                      patient.personalInfo.dateOfBirth
                    ).toLocaleDateString()}</td>
                    <td>${patient.personalInfo.gender}</td>
                    <td>${patient.personalInfo.address || "N/A"}</td>
                    <td>
                        <div class="patient-stats">
                            <span title="Medical History">📋 ${
                              patient.medicalHistory?.length || 0
                            }</span>
                            <span title="Allergies">⚠️ ${
                              patient.allergies?.length || 0
                            }</span>
                            <span title="Prescriptions">💊 ${
                              patient.prescriptions?.length || 0
                            }</span>
                            <span title="Visits">🏥 ${
                              patient.visits?.length || 0
                            }</span>
                            <span title="Lab Reports">🔬 ${
                              patient.labReports?.length || 0
                            }</span>
                        </div>
                    </td>
                    <td>
                        <button class="btn secondary-btn view-patient" data-id="${
                          patient._id
                        }">View</button>
                        <button class="btn danger-btn delete-patient" data-id="${
                          patient._id
                        }">Delete</button>
                    </td>
                `;
      });

      // Add event listeners for view buttons
      document.querySelectorAll(".view-patient").forEach((button) => {
        button.addEventListener("click", () => {
          const patientId = button.getAttribute("data-id");
          viewPatientDetails(patientId);
        });
      });

      // Add event listeners for delete buttons
      document.querySelectorAll(".delete-patient").forEach((button) => {
        button.addEventListener("click", () => {
          const patientId = button.getAttribute("data-id");
          deletePatient(patientId);
        });
      });
    } else {
      noPatientsMessage.style.display = "block";
      noPatientsMessage.textContent = "No patients found.";
    }
  } catch (error) {
    console.error("Error fetching patients:", error);
    if (noPatientsMessage) {
      noPatientsMessage.style.display = "block";
      noPatientsMessage.textContent = "Error loading patients.";
    }
  }
}

// Function to view patient details
async function viewPatientDetails(patientId) {
  try {
    const response = await fetch(`/api/v1/patients/${patientId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    const patient = await response.json();

    // Create a modal to display patient details
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>Patient Details</h2>
            <div class="patient-details">
                <h3>Personal Information</h3>
                <p><strong>Patient ID:</strong> ${
                  patient.personalInfo.patientId
                }</p>
                <p><strong>Name:</strong> ${patient.personalInfo.name}</p>
                <p><strong>Date of Birth:</strong> ${new Date(
                  patient.personalInfo.dateOfBirth
                ).toLocaleDateString()}</p>
                <p><strong>Gender:</strong> ${patient.personalInfo.gender}</p>
                <p><strong>Address:</strong> ${
                  patient.personalInfo.address || "N/A"
                }</p>
                
                <h3>Contact Information</h3>
                <p><strong>Email:</strong> ${
                  patient.contact?.email || "N/A"
                }</p>
                <p><strong>Phone:</strong> ${
                  patient.contact?.phone || "N/A"
                }</p>
                
                <h3>Medical Information</h3>
                ${(() => {
                  const user = JSON.parse(localStorage.getItem("user"));
                  const userRole = user ? user.role : "";
                  const userRoleUpper = userRole.toUpperCase();
                  const allowedRolesForDetails = ["DOCTOR", "NURSE"];

                  // Function to format details for a list
                  const formatDetailsList = (items, type) => {
                    if (!items || items.length === 0)
                      return `<p>No ${type} entries.</p>`;
                    return `
                            <h4>${type}</h4>
                            <ul class="medical-info-list">
                                ${items
                                  .map((item) => {
                                    let detail = "Entry Details:";
                                    // Customize formatting based on type
                                    switch (type) {
                                      case "Medical History":
                                        detail = `Condition: ${
                                          item.condition || "N/A"
                                        }, Status: ${
                                          item.status || "N/A"
                                        }, Severity: ${item.severity || "N/A"}`;
                                        if (item.diagnosisDate)
                                          detail += `, Date: ${
                                            item.diagnosisDate
                                              ? new Date(
                                                  item.diagnosisDate
                                                ).toLocaleDateString()
                                              : "N/A"
                                          }`;
                                        if (item.notes)
                                          detail += `, Notes: ${
                                            item.notes || "N/A"
                                          }`;
                                        break;
                                      case "Allergies":
                                        detail = `Allergen: ${
                                          item.allergen || "N/A"
                                        }, Severity: ${item.severity || "N/A"}`;
                                        if (item.reaction)
                                          detail += `, Reaction: ${
                                            item.reaction || "N/A"
                                          }`;
                                        if (item.diagnosedDate)
                                          detail += `, Diagnosed: ${
                                            item.diagnosedDate
                                              ? new Date(
                                                  item.diagnosedDate
                                                ).toLocaleDateString()
                                              : "N/A"
                                          }`;
                                        break;
                                      case "Prescriptions":
                                        detail = `Medication: ${
                                          item.medication || "N/A"
                                        }, Dosage: ${
                                          item.dosage || "N/A"
                                        }, Frequency: ${
                                          item.frequency || "N/A"
                                        }`;
                                        if (item.startDate)
                                          detail += `, Start Date: ${
                                            item.startDate
                                              ? new Date(
                                                  item.startDate
                                                ).toLocaleDateString()
                                              : "N/A"
                                          }`;
                                        if (item.endDate)
                                          detail += `, End Date: ${
                                            item.endDate
                                              ? new Date(
                                                  item.endDate
                                                ).toLocaleDateString()
                                              : "N/A"
                                          }`;
                                        break;
                                      case "Visits":
                                        detail = `Date: ${
                                          item.date
                                            ? new Date(
                                                item.date
                                              ).toLocaleDateString()
                                            : "N/A"
                                        }, Type: ${
                                          item.type || "N/A"
                                        }, Reason: ${item.reason || "N/A"}`;
                                        break;
                                      case "Lab Reports":
                                        detail = `Test: ${
                                          item.testName || "N/A"
                                        }, Date: ${
                                          item.date
                                            ? new Date(
                                                item.date
                                              ).toLocaleDateString()
                                            : "N/A"
                                        }, Status: ${item.status || "N/A"}`;
                                        // You might want a separate view for full results
                                        if (item.results)
                                          detail += `, Results Summary: ${item.results.substring(
                                            0,
                                            50
                                          )}...`;
                                        break;
                                      default:
                                        detail = JSON.stringify(item); // Fallback
                                    }
                                    return `<li>${detail}</li>`;
                                  })
                                  .join("")}
                            </ul>
                        `;
                  };

                  // Check if the user should see detailed medical info
                  if (allowedRolesForDetails.includes(userRoleUpper)) {
                    // Return detailed lists for allowed roles
                    return `
                            ${formatDetailsList(
                              patient.medicalHistory,
                              "Medical History"
                            )}
                            ${formatDetailsList(patient.allergies, "Allergies")}
                            ${formatDetailsList(
                              patient.prescriptions,
                              "Prescriptions"
                            )}
                            ${formatDetailsList(patient.visits, "Visits")}
                            ${formatDetailsList(
                              patient.labReports,
                              "Lab Reports"
                            )}
                        `;
                  } else {
                    // Display counts for other roles
                    return `
                            <p><strong>Medical History:</strong> ${
                              patient.medicalHistory?.length || 0
                            } entries</p>
                            <p><strong>Allergies:</strong> ${
                              patient.allergies?.length || 0
                            } entries</p>
                            <p><strong>Prescriptions:</strong> ${
                              patient.prescriptions?.length || 0
                            } entries</p>
                            <p><strong>Visits:</strong> ${
                              patient.visits?.length || 0
                            } entries</p>
                            <p><strong>Lab Reports:</strong> ${
                              patient.labReports?.length || 0
                            } entries</p>
                        `;
                  }
                })()}

            </div>

            ${(() => {
              const user = JSON.parse(localStorage.getItem("user"));
              const userRole = user ? user.role : "";
              const userRoleUpper = userRole.toUpperCase();
              const allowedRolesForAdding = ["DOCTOR", "NURSE"];

              if (allowedRolesForAdding.includes(userRoleUpper)) {
                return `
                    <div class="medical-add-sections">
                        <h3>Add Medical Information</h3>
                        <button class="btn secondary-btn" id="addMedicalHistoryBtn" data-patient-id="${patient._id}">Add Medical History</button>
                        <button class="btn secondary-btn" id="addAllergyBtn" data-patient-id="${patient._id}">Add Allergy</button>
                        <button class="btn secondary-btn" id="addPrescriptionBtn" data-patient-id="${patient._id}">Add Prescription</button>
                        <button class="btn secondary-btn" id="addLabReportBtn" data-patient-id="${patient._id}">Add Lab Report</button>
                    </div>
                    `;
              } else {
                return "";
              }
            })()}

        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = "block";

    // Close button functionality
    const closeButton = modal.querySelector(".close-button");
    closeButton.onclick = function () {
      modal.remove();
    };

    // Close when clicking outside
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.remove();
      }
    };

    // Add event listeners for the new medical info buttons
    const addMedicalHistoryBtn = modal.querySelector("#addMedicalHistoryBtn");
    const addAllergyBtn = modal.querySelector("#addAllergyBtn");
    const addPrescriptionBtn = modal.querySelector("#addPrescriptionBtn");
    const addLabReportBtn = modal.querySelector("#addLabReportBtn");

    if (addMedicalHistoryBtn) {
      addMedicalHistoryBtn.addEventListener("click", () => {
        openMedicalHistoryModal(patient._id);
        modal.style.display = "none"; // Hide patient details modal
      });
    }
    if (addAllergyBtn) {
      addAllergyBtn.addEventListener("click", () => {
        openAllergyModal(patient._id);
        modal.style.display = "none"; // Hide patient details modal
      });
    }
    if (addPrescriptionBtn) {
      addPrescriptionBtn.addEventListener("click", () => {
        openPrescriptionModal(patient._id);
        modal.style.display = "none"; // Hide patient details modal
      });
    }
    if (addLabReportBtn) {
      addLabReportBtn.addEventListener("click", () => {
        openLabReportModal(patient._id);
        modal.style.display = "none"; // Hide patient details modal
      });
    }
  } catch (error) {
    console.error("Error fetching patient details:", error);
    alert("Error loading patient details");
  }
}

// Function to fetch doctors and populate the dropdown
async function fetchDoctorsAndPopulateDropdown() {
  const doctorSelect = document.getElementById("addPatientDoctorId");
  if (!doctorSelect) {
    console.error("Doctor select dropdown not found");
    return;
  }

  try {
    console.log("Fetching doctors...");
    const response = await fetch("/api/v1/auth/doctors", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const doctors = await response.json();
    console.log("Received doctors:", doctors);

    // Clear existing options except the default one
    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';

    if (doctors.length > 0) {
      doctors.forEach((doctor) => {
        const option = document.createElement("option");
        option.value = doctor._id; // Use doctor's ID as the value
        option.textContent = doctor.name; // Use doctor's name as the displayed text
        doctorSelect.appendChild(option);
      });
    } else {
      // Optionally add a message if no doctors are found
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No doctors available";
      doctorSelect.appendChild(option);
      doctorSelect.disabled = true; // Disable if no doctors
    }
  } catch (error) {
    console.error("Error fetching doctors:", error);
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Error loading doctors";
    doctorSelect.appendChild(option);
    doctorSelect.disabled = true; // Disable on error
  }
}

// Function to delete patient
async function deletePatient(patientId) {
  if (confirm("Are you sure you want to delete this patient?")) {
    try {
      const response = await fetch(`/api/v1/patients/${patientId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        alert("Patient deleted successfully");
        fetchPatients(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.message || "Error deleting patient");
      }
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Error deleting patient");
    }
  }
}

// Handle form submission
if (addPatientForm) {
  addPatientForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(addPatientForm);

    // Validate patientId format
    const patientId = formData.get("patientId");
    if (!/^PAT\d{6}$/.test(patientId)) {
      addPatientMessage.style.display = "block";
      addPatientMessage.style.color = "red";
      addPatientMessage.textContent = "Patient ID must be in format PAT000000";
      return;
    }

    // Format the data
    const patientData = {
      patientId: patientId,
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dateOfBirth: formData.get("dateOfBirth"),
      gender:
        formData.get("gender").charAt(0).toUpperCase() +
        formData.get("gender").slice(1),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      appointmentDate: formData.get("appointmentDate") || undefined,
      doctorId: formData.get("doctorId") || undefined,
    };

    console.log("Sending patient data:", patientData); // Debug log

    try {
      const response = await fetch("/api/v1/patients/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(patientData),
      });

      const result = await response.json();
      console.log("Server response:", result); // Debug log

      if (response.ok) {
        addPatientMessage.style.display = "block";
        addPatientMessage.style.color = "green";
        addPatientMessage.textContent = "Patient added successfully!";
        addPatientForm.reset(); // Clear the form
        await fetchPatients(); // Refresh the patient list immediately
        // Close modal after a short delay
        setTimeout(() => {
          addPatientModal.style.display = "none";
        }, 2000);
      } else {
        addPatientMessage.style.display = "block";
        addPatientMessage.style.color = "red";
        // Show validation errors if available
        if (result.details && Array.isArray(result.details)) {
          addPatientMessage.textContent = result.details
            .map((err) => `${err.field}: ${err.message}`)
            .join(", ");
        } else {
          addPatientMessage.textContent =
            result.error || "Error adding patient.";
        }
      }
    } catch (error) {
      console.error("Error adding patient:", error);
      addPatientMessage.style.display = "block";
      addPatientMessage.style.color = "red";
      addPatientMessage.textContent = "An unexpected error occurred.";
    }
  });
}

// Function to make a modal draggable
function makeModalDraggable(modalElement, dragHandleElement) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  dragHandleElement.addEventListener("mousedown", dragStart);
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("mousemove", drag);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    // Only start dragging if the target is the drag handle
    if (
      e.target === dragHandleElement ||
      dragHandleElement.contains(e.target)
    ) {
      isDragging = true;
      // Prevent text selection during drag
      e.preventDefault();
      // Change cursor while dragging
      dragHandleElement.style.cursor = "grabbing";
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;

    isDragging = false;
    // Restore cursor
    dragHandleElement.style.cursor = "grab";
  }

  function drag(e) {
    if (isDragging) {
      // Disable the initial transform for centering
      modalElement.style.transform = "none";

      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      // Set the new position
      modalElement.style.left = currentX + "px";
      modalElement.style.top = currentY + "px";
    }
  }

  // Set initial cursor style on the handle
  dragHandleElement.style.cursor = "grab";
  // Ensure modal has absolute or fixed position for dragging
  modalElement.style.position = "fixed"; // Ensure fixed position
}

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  // Load patients when the page loads
  fetchPatients();

  // Get the user's role from localStorage
  const user = JSON.parse(localStorage.getItem("user")); // Assuming user object is stored with role
  const userRole = user ? user.role : "";

  // Fetch and populate doctors dropdown only for roles allowed to add patients
  if (
    userRole === "ADMIN" ||
    userRole === "receptionist" ||
    userRole === "nurse" ||
    userRole === "doctor"
  ) {
    fetchDoctorsAndPopulateDropdown();
  } else {
    console.log(
      `User role ${userRole} is not authorized to fetch doctors list.`
    );
  }

  // Make the Add Patient modal draggable
  const addPatientModal = document.getElementById("addPatientModal");
  const addPatientModalHeader = addPatientModal
    ? addPatientModal.querySelector("h2")
    : null;

  if (addPatientModal && addPatientModalHeader) {
    makeModalDraggable(addPatientModal, addPatientModalHeader);
  } else if (!addPatientModal) {
    console.error("Add Patient Modal element (#addPatientModal) not found!");
  } else if (!addPatientModalHeader) {
    console.error("Add Patient Modal Header element (h2) not found!");
  }

  // Add event listener for tab switching
  const patientsTab = document.querySelector(
    '.nav-link[data-section="patients"]'
  );
  if (patientsTab) {
    patientsTab.addEventListener("click", function () {
      fetchPatients();
    });
  }

  // Add event listener for the add patient form
  if (addPatientForm) {
    addPatientForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(addPatientForm);

      // Validate patientId format
      const patientId = formData.get("patientId");
      if (!/^PAT\d{6}$/.test(patientId)) {
        addPatientMessage.style.display = "block";
        addPatientMessage.style.color = "red";
        addPatientMessage.textContent =
          "Patient ID must be in format PAT000000";
        return;
      }

      // Format the data
      const patientData = {
        patientId: patientId,
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        dateOfBirth: formData.get("dateOfBirth"),
        gender:
          formData.get("gender").charAt(0).toUpperCase() +
          formData.get("gender").slice(1),
        email: formData.get("email") || undefined,
        phone: formData.get("phone") || undefined,
        address: formData.get("address") || undefined,
        appointmentDate: formData.get("appointmentDate") || undefined,
        doctorId: formData.get("doctorId") || undefined,
      };

      console.log("Sending patient data:", patientData); // Debug log

      try {
        const response = await fetch("/api/v1/patients/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(patientData),
        });

        const result = await response.json();
        console.log("Server response:", result); // Debug log

        if (response.ok) {
          addPatientMessage.style.display = "block";
          addPatientMessage.style.color = "green";
          addPatientMessage.textContent = "Patient added successfully!";
          addPatientForm.reset();

          // Refresh the patient list immediately
          await fetchPatients();

          // Close modal after a short delay
          setTimeout(() => {
            addPatientModal.style.display = "none";
          }, 2000);
        } else {
          addPatientMessage.style.display = "block";
          addPatientMessage.style.color = "red";
          if (result.details && Array.isArray(result.details)) {
            addPatientMessage.textContent = result.details
              .map((err) => `${err.field}: ${err.message}`)
              .join(", ");
          } else {
            addPatientMessage.textContent =
              result.error || "Error adding patient.";
          }
        }
      } catch (error) {
        console.error("Error adding patient:", error);
        addPatientMessage.style.display = "block";
        addPatientMessage.style.color = "red";
        addPatientMessage.textContent = "An unexpected error occurred.";
      }
    });
  }

  // Add console logs in the search input event listener to check the element and its value
  const patientSearchInput = document.getElementById("patientSearchInput");
  if (patientSearchInput) {
    patientSearchInput.addEventListener("input", () => {
      console.log("Search input element:", patientSearchInput);
      console.log("Search input value:", patientSearchInput.value);
      fetchPatients(patientSearchInput.value);
    });
  }
});

// Export fetchPatients to be called from dashboard.html navigation
window.fetchPatients = fetchPatients;

// --- Add Medical History Functionality ---
// Function to open Add Medical History modal
function openMedicalHistoryModal(patientId) {
  const modal = document.getElementById("addMedicalHistoryModal");
  const patientIdInput = document.getElementById("medicalHistoryPatientId");
  const form = document.getElementById("addMedicalHistoryForm");
  const messageDiv = document.getElementById("addMedicalHistoryMessage");

  if (modal && patientIdInput && form && messageDiv) {
    patientIdInput.value = patientId;
    form.reset(); // Clear previous data
    messageDiv.style.display = "none";
    modal.style.display = "block";

    // Add close button functionality
    const closeButton = modal.querySelector(".close-button");
    if (closeButton) {
      closeButton.onclick = function () {
        modal.style.display = "none";
        // Optionally re-show patient details modal or refresh list
        // viewPatientDetails(patientId); // Re-open details - might need to re-fetch
        fetchPatients(); // Refresh the main list
      };
    }
    // Close when clicking outside
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      }
    };

    // Handle form submission
    form.onsubmit = (e) => handleMedicalHistorySubmit(e, patientId);
  }
}

// Function to handle Add Medical History form submission
async function handleMedicalHistorySubmit(e, patientId) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const medicalHistoryData = Object.fromEntries(formData.entries());

  // Remove the patientId from the payload as it's in the URL
  delete medicalHistoryData.patientId;

  const messageDiv = document.getElementById("addMedicalHistoryMessage");
  messageDiv.style.display = "none";

  try {
    const response = await fetch(
      `/api/v1/patients/${patientId}/medical-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(medicalHistoryData),
      }
    );

    const result = await response.json();

    if (response.ok) {
      messageDiv.style.display = "block";
      messageDiv.style.color = "green";
      messageDiv.textContent = "Medical history added successfully!";
      form.reset();
      // Optionally close modal or keep open for more entries
      setTimeout(() => {
        const modal = document.getElementById("addMedicalHistoryModal");
        if (modal) modal.style.display = "none";
        fetchPatients(); // Refresh the main patient list to show updated count
      }, 1500);
    } else {
      messageDiv.style.display = "block";
      messageDiv.style.color = "red";
      if (result.details && Array.isArray(result.details)) {
        messageDiv.textContent =
          "Validation failed: " +
          result.details
            .map((err) => `${err.field}: ${err.message}`)
            .join(", ");
      } else {
        messageDiv.textContent =
          result.message || result.error || "Error adding medical history.";
      }
    }
  } catch (error) {
    console.error("Error adding medical history:", error);
    messageDiv.style.display = "block";
    messageDiv.style.color = "red";
    messageDiv.textContent = "An unexpected error occurred.";
  }
}

// --- Add Allergy Functionality ---
// Function to open Add Allergy modal
function openAllergyModal(patientId) {
  const modal = document.getElementById("addAllergyModal");
  const patientIdInput = document.getElementById("allergyPatientId");
  const form = document.getElementById("addAllergyForm");
  const messageDiv = document.getElementById("addAllergyMessage");

  if (modal && patientIdInput && form && messageDiv) {
    patientIdInput.value = patientId;
    form.reset(); // Clear previous data
    messageDiv.style.display = "none";
    modal.style.display = "block";

    // Add close button functionality
    const closeButton = modal.querySelector(".close-button");
    if (closeButton) {
      closeButton.onclick = function () {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      };
    }
    // Close when clicking outside
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      }
    };

    // Handle form submission
    form.onsubmit = (e) => handleAllergySubmit(e, patientId);
  }
}

// Function to handle Add Allergy form submission
async function handleAllergySubmit(e, patientId) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const allergyData = Object.fromEntries(formData.entries());

  // Remove the patientId from the payload as it's in the URL
  delete allergyData.patientId;

  const messageDiv = document.getElementById("addAllergyMessage");
  messageDiv.style.display = "none";

  try {
    const response = await fetch(`/api/v1/patients/${patientId}/allergies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(allergyData),
    });

    const result = await response.json();

    if (response.ok) {
      messageDiv.style.display = "block";
      messageDiv.style.color = "green";
      messageDiv.textContent = "Allergy added successfully!";
      form.reset();
      setTimeout(() => {
        const modal = document.getElementById("addAllergyModal");
        if (modal) modal.style.display = "none";
        fetchPatients(); // Refresh the main patient list to show updated count
      }, 1500);
    } else {
      messageDiv.style.display = "block";
      messageDiv.style.color = "red";
      if (result.details && Array.isArray(result.details)) {
        messageDiv.textContent =
          "Validation failed: " +
          result.details
            .map((err) => `${err.field}: ${err.message}`)
            .join(", ");
      } else {
        messageDiv.textContent =
          result.message || result.error || "Error adding allergy.";
      }
    }
  } catch (error) {
    console.error("Error adding allergy:", error);
    messageDiv.style.display = "block";
    messageDiv.style.color = "red";
    messageDiv.textContent = "An unexpected error occurred.";
  }
}

// --- Add Prescription Functionality ---
// Function to open Add Prescription modal
function openPrescriptionModal(patientId) {
  const modal = document.getElementById("addPrescriptionModal");
  const patientIdInput = document.getElementById("prescriptionPatientId");
  const form = document.getElementById("addPrescriptionForm");
  const messageDiv = document.getElementById("addPrescriptionMessage");

  if (modal && patientIdInput && form && messageDiv) {
    patientIdInput.value = patientId;
    form.reset(); // Clear previous data
    messageDiv.style.display = "none";
    modal.style.display = "block";

    // Add close button functionality
    const closeButton = modal.querySelector(".close-button");
    if (closeButton) {
      closeButton.onclick = function () {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      };
    }
    // Close when clicking outside
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      }
    };

    // Handle form submission
    form.onsubmit = (e) => handlePrescriptionSubmit(e, patientId);
  }
}

// Function to handle Add Prescription form submission
async function handlePrescriptionSubmit(e, patientId) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const prescriptionData = Object.fromEntries(formData.entries());

  // Remove the patientId from the payload as it's in the URL
  delete prescriptionData.patientId;

  const messageDiv = document.getElementById("addPrescriptionMessage");
  messageDiv.style.display = "none";

  try {
    const response = await fetch(
      `/api/v1/patients/${patientId}/prescriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(prescriptionData),
      }
    );

    const result = await response.json();

    if (response.ok) {
      messageDiv.style.display = "block";
      messageDiv.style.color = "green";
      messageDiv.textContent = "Prescription added successfully!";
      form.reset();
      setTimeout(() => {
        const modal = document.getElementById("addPrescriptionModal");
        if (modal) modal.style.display = "none";
        fetchPatients(); // Refresh the main patient list to show updated count
      }, 1500);
    } else {
      messageDiv.style.display = "block";
      messageDiv.style.color = "red";
      if (result.details && Array.isArray(result.details)) {
        messageDiv.textContent =
          "Validation failed: " +
          result.details
            .map((err) => `${err.field}: ${err.message}`)
            .join(", ");
      } else {
        messageDiv.textContent =
          result.message || result.error || "Error adding prescription.";
      }
    }
  } catch (error) {
    console.error("Error adding prescription:", error);
    messageDiv.style.display = "block";
    messageDiv.style.color = "red";
    messageDiv.textContent = "An unexpected error occurred.";
  }
}

// --- Add Lab Report Functionality ---
// Function to open Add Lab Report modal
function openLabReportModal(patientId) {
  const modal = document.getElementById("addLabReportModal");
  const patientIdInput = document.getElementById("labReportPatientId");
  const form = document.getElementById("addLabReportForm");
  const messageDiv = document.getElementById("addLabReportMessage");

  if (modal && patientIdInput && form && messageDiv) {
    patientIdInput.value = patientId;
    form.reset(); // Clear previous data
    messageDiv.style.display = "none";
    modal.style.display = "block";

    // Add close button functionality
    const closeButton = modal.querySelector(".close-button");
    if (closeButton) {
      closeButton.onclick = function () {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      };
    }
    // Close when clicking outside
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        fetchPatients(); // Refresh the main list
      }
    };

    // Handle form submission
    form.onsubmit = (e) => handleLabReportSubmit(e, patientId);
  }
}

// Function to handle Add Lab Report form submission
async function handleLabReportSubmit(e, patientId) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const labReportData = Object.fromEntries(formData.entries());

  // Remove the patientId from the payload as it's in the URL
  delete labReportData.patientId;

  const messageDiv = document.getElementById("addLabReportMessage");
  messageDiv.style.display = "none";

  try {
    const response = await fetch(`/api/v1/patients/${patientId}/lab-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(labReportData),
    });

    const result = await response.json();

    if (response.ok) {
      messageDiv.style.display = "block";
      messageDiv.style.color = "green";
      messageDiv.textContent = "Lab report added successfully!";
      form.reset();
      setTimeout(() => {
        const modal = document.getElementById("addLabReportModal");
        if (modal) modal.style.display = "none";
        fetchPatients(); // Refresh the main patient list to show updated count
      }, 1500);
    } else {
      messageDiv.style.display = "block";
      messageDiv.style.color = "red";
      if (result.details && Array.isArray(result.details)) {
        messageDiv.textContent =
          "Validation failed: " +
          result.details
            .map((err) => `${err.field}: ${err.message}`)
            .join(", ");
      } else {
        messageDiv.textContent =
          result.message || result.error || "Error adding lab report.";
      }
    }
  } catch (error) {
    console.error("Error adding lab report:", error);
    messageDiv.style.display = "block";
    messageDiv.style.color = "red";
    messageDiv.textContent = "An unexpected error occurred.";
  }
}
