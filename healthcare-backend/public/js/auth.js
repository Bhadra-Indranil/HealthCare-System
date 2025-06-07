// Authentication functionality
class Auth {
  constructor() {
    this.token = localStorage.getItem("token");
    this.user = JSON.parse(localStorage.getItem("user"));
    this.setupEventListeners();
    this.checkAuth();
  }

  setupEventListeners() {
    // Login form listeners
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", this.handleLogin.bind(this));
    }

    // Register form listeners
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", this.handleRegister.bind(this));
      this.setupRoleListeners();
    }

    // Logout button listener
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", this.logout.bind(this));
    }

    // Terms and Privacy links
    const termsLink = document.getElementById("termsLink");
    const privacyLink = document.getElementById("privacyLink");
    if (termsLink) {
      termsLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showTermsModal("Terms of Service");
      });
    }
    if (privacyLink) {
      privacyLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showTermsModal("Privacy Policy");
      });
    }

    // Check token expiration every minute
    setInterval(() => this.checkTokenExpiration(), 60000);
  }

  setupRoleListeners() {
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const specializationGroup = document.getElementById("specializationGroup");
    const licenseGroup = document.getElementById("licenseGroup");

    console.log("Role Inputs found:", roleInputs.length > 0);
    console.log("specializationGroup found:", !!specializationGroup);
    console.log("licenseGroup found:", !!licenseGroup);

    // Only proceed if all necessary elements are found
    if (!roleInputs.length || !specializationGroup || !licenseGroup) {
      console.error(
        "Required elements (role inputs, specializationGroup, or licenseGroup) for role listeners not found!"
      );
      return; // Exit function if elements are missing
    }

    roleInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const roleValue = input.value.toLowerCase(); // Use lowercase for comparison
        const isDoctor = roleValue === "doctor";
        const isMedical = roleValue === "doctor" || roleValue === "nurse";

        console.log("Role selected (value):", input.value);
        console.log("isDoctor:", isDoctor);
        console.log("isMedical:", isMedical);

        // Update visibility
        specializationGroup.classList.toggle("hidden", !isDoctor);
        licenseGroup.classList.toggle("hidden", !isMedical);

        // Update required attributes and aria-hidden based on visibility
        // Check if elements exist before accessing properties
        const specializationSelect =
          specializationGroup.querySelector("select") ||
          specializationGroup.querySelector("input"); // Handle both select/input
        if (specializationSelect) {
          specializationSelect.required = isDoctor;
          // Set aria-hidden for accessibility when hidden
          specializationGroup.setAttribute("aria-hidden", !isDoctor);
        } else {
          console.error(
            "Specialization select/input element not found within specializationGroup!"
          );
          specializationGroup.setAttribute("aria-hidden", true);
        }

        const licenseInput = licenseGroup.querySelector("input");
        console.log("licenseInput found:", !!licenseInput); // Log if input is found
        if (licenseInput) {
          licenseInput.required = isMedical;
          // Set aria-hidden for accessibility when hidden
          licenseGroup.setAttribute("aria-hidden", !isMedical);
          console.log("licenseInput required set to:", isMedical);
        } else {
          console.error("License input element not found within licenseGroup!");
          licenseGroup.setAttribute("aria-hidden", true);
        }

        // Update requirements text visibility (optional, based on your CSS/needs)
        const specializationRequirements =
          specializationGroup.querySelector(".role-requirements");
        if (specializationRequirements) {
          specializationRequirements.classList.toggle("required", isDoctor);
        }

        const licenseRequirements =
          licenseGroup.querySelector(".role-requirements");
        if (licenseRequirements) {
          licenseRequirements.classList.toggle("required", isMedical);
        }
      });
    });

    // Trigger change on initial load if a radio button is already checked
    const initiallyCheckedRole = document.querySelector(
      'input[name="role"]:checked'
    );
    if (initiallyCheckedRole) {
      initiallyCheckedRole.dispatchEvent(new Event("change"));
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const errorMessage = document.getElementById("errorMessage");
    const loginButton = e.target.querySelector('button[type="submit"]');

    errorMessage.classList.remove("show", "success");
    loginButton.classList.add("loading");
    loginButton.disabled = true;

    const formData = new FormData(e.target);
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
      rememberMe: formData.get("rememberMe") === "on",
    };

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      this.setSession(result.token, result.user);
      errorMessage.textContent = "Login successful! Redirecting...";
      errorMessage.classList.add("success", "show");

      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1000);
    } catch (error) {
      errorMessage.textContent =
        error.message || "Login failed. Please try again.";
      errorMessage.classList.add("show");
    } finally {
      loginButton.classList.remove("loading");
      loginButton.disabled = false;
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const errorMessage = document.getElementById("errorMessage");
    const registerButton = e.target.querySelector('button[type="submit"]');

    errorMessage.classList.remove("show", "success");
    registerButton.classList.add("loading");
    registerButton.disabled = true;

    const formData = new FormData(e.target);
    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      role: formData.get("role"),
      specialization: formData.get("specialization"),
      licenseNumber: formData.get("licenseNumber"),
    };

    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Validate role-specific requirements
      if (data.role === "doctor" && !data.specialization) {
        throw new Error("Specialization is required for doctors");
      }
      if (
        (data.role === "doctor" || data.role === "nurse") &&
        !data.licenseNumber
      ) {
        throw new Error("License number is required for medical professionals");
      }

      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (result.details) {
          const errorMessages = result.details
            .map((err) => `${err.field}: ${err.message}`)
            .join("\n");
          throw new Error(errorMessages);
        }
        throw new Error(result.error || "Registration failed");
      }

      errorMessage.textContent =
        "Registration successful! Redirecting to login...";
      errorMessage.classList.add("success", "show");

      e.target.reset();
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 2000);
    } catch (error) {
      errorMessage.textContent =
        error.message || "Registration failed. Please try again.";
      errorMessage.classList.add("show");
    } finally {
      registerButton.classList.remove("loading");
      registerButton.disabled = false;
    }
  }

  showTermsModal(title) {
    const modal = document.createElement("div");
    modal.className = "modal active";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Please read our ${title.toLowerCase()} carefully before proceeding with registration.</p>
          <!-- Add actual terms/privacy content here -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal handlers
    modal.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => modal.remove());
    });

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  logout() {
    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Clear any session data
    this.token = null;
    this.user = null;

    // Redirect to login page
    window.location.href = "/login.html";
  }

  setSession(token, user) {
    this.token = token;
    this.user = user;

    // Store in localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    // Update UI
    this.updateUI();
  }

  checkAuth() {
    if (this.token) {
      this.checkTokenExpiration();
      this.updateUI();
    } else {
      // Get current page path
      const currentPage = window.location.pathname;

      // List of pages that don't require authentication
      const publicPages = ["/login.html", "/register.html"];

      // Only redirect if not on a public page
      if (!publicPages.some((page) => currentPage.endsWith(page))) {
        window.location.href = "/login.html";
      }
    }
  }

  checkTokenExpiration() {
    if (!this.token) return;

    try {
      const payload = JSON.parse(atob(this.token.split(".")[1]));
      const expiration = payload.exp * 1000; // Convert to milliseconds

      if (Date.now() >= expiration) {
        // Token expired, logout
        this.logout();
      }
    } catch (error) {
      console.error("Error checking token expiration:", error);
      this.logout();
    }
  }

  updateUI() {
    if (this.user) {
      // Update user info in sidebar
      const userNameElement = document.querySelector(".user-name");
      const userRoleElement = document.querySelector(".user-role");

      if (userNameElement) {
        userNameElement.textContent = this.user.name;
      }
      if (userRoleElement) {
        userRoleElement.textContent = this.user.role;
      }

      // Show/hide elements based on user role
      this.updateRoleBasedUI();
    }
  }

  updateRoleBasedUI() {
    const role = this.user?.role;
    const adminElements = document.querySelectorAll('[data-role="admin"]');
    const doctorElements = document.querySelectorAll('[data-role="doctor"]');
    const nurseElements = document.querySelectorAll('[data-role="nurse"]');

    // Hide all role-specific elements first
    [...adminElements, ...doctorElements, ...nurseElements].forEach((el) => {
      el.style.display = "none";
    });

    // Show elements based on role
    switch (role) {
      case "ADMIN":
        adminElements.forEach((el) => (el.style.display = ""));
        doctorElements.forEach((el) => (el.style.display = ""));
        nurseElements.forEach((el) => (el.style.display = ""));
        break;
      case "DOCTOR":
        doctorElements.forEach((el) => (el.style.display = ""));
        nurseElements.forEach((el) => (el.style.display = ""));
        break;
      case "NURSE":
        nurseElements.forEach((el) => (el.style.display = ""));
        break;
    }
  }

  // Helper method to get auth headers for API requests
  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  // Method to refresh token
  async refreshToken() {
    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Token refresh failed");
      }

      this.setSession(data.token, data.user);
      return data;
    } catch (error) {
      console.error("Token refresh error:", error);
      this.logout();
      throw error;
    }
  }

  // Add registration method with validation handling
  async register(userData) {
    try {
      // Validate data before sending
      const validationErrors = this.validateRegistrationData(userData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join("\n"));
      }

      // Check email availability
      const isEmailAvailable = await this.checkEmailAvailability(
        userData.email
      );
      if (!isEmailAvailable) {
        throw new Error("Email is already registered");
      }

      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from server
        if (data.details) {
          const errorMessages = data.details
            .map((err) => `${err.field}: ${err.message}`)
            .join("\n");
          throw new Error(errorMessages);
        }
        throw new Error(data.error || "Registration failed");
      }

      // Store token and user data
      this.setSession(data.token, data.user);

      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  // Add method to validate registration data on client side
  validateRegistrationData(data) {
    const errors = [];

    // Required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "password",
      "role",
    ];
    requiredFields.forEach((field) => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Name validation
    if (data.firstName && !/^[a-zA-Z\s-']{2,50}$/.test(data.firstName)) {
      errors.push(
        "First name must be 2-50 characters and can only contain letters, spaces, hyphens, and apostrophes"
      );
    }
    if (data.lastName && !/^[a-zA-Z\s-']{2,50}$/.test(data.lastName)) {
      errors.push(
        "Last name must be 2-50 characters and can only contain letters, spaces, hyphens, and apostrophes"
      );
    }

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push("Invalid email format");
    }

    // Password validation
    if (data.password) {
      if (data.password.length < 8) {
        errors.push("Password must be at least 8 characters long");
      }
      if (!/[A-Z]/.test(data.password)) {
        errors.push("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(data.password)) {
        errors.push("Password must contain at least one lowercase letter");
      }
      if (!/[0-9]/.test(data.password)) {
        errors.push("Password must contain at least one number");
      }
      if (!/[!@#$%^&*]/.test(data.password)) {
        errors.push(
          "Password must contain at least one special character (!@#$%^&*)"
        );
      }
    }

    // Role-specific validation
    if (data.role === "DOCTOR") {
      if (!data.specialization) {
        errors.push("Specialization is required for doctors");
      }
      if (!data.licenseNumber) {
        errors.push("License number is required for doctors");
      }
    } else if (data.role === "NURSE") {
      if (!data.licenseNumber) {
        errors.push("License number is required for nurses");
      }
    }

    // Password confirmation
    if (data.password !== data.confirmPassword) {
      errors.push("Passwords do not match");
    }

    return errors;
  }

  // Add method to check if email is available
  async checkEmailAvailability(email) {
    try {
      const response = await fetch(
        `/api/v1/auth/check-email?email=${encodeURIComponent(email)}`
      );
      if (!response.ok) {
        throw new Error("Failed to check email availability");
      }
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error("Email check error:", error);
      throw error;
    }
  }
}

// Initialize Auth
document.addEventListener("DOMContentLoaded", () => {
  window.auth = new Auth();
});
