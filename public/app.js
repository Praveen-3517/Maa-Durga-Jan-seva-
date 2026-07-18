// Global Variables & Configuration
const SERVICES = {
  srv_pancard: {
    id: "srv_pancard",
    title: "Pan Card Apply",
    description: "Apply for a new PAN card or make corrections in your existing PAN card details.",
    icon: "fa-solid fa-address-card",
    requirements: [
      "Aadhar Card (Mobile Number should be linked for OTP)",
      "One Passport Size Photograph",
      "Signature on plain white paper (photo or scan)"
    ],
    uploadUrl: "/upload-pancard"
  },
  srv_voterid: {
    id: "srv_voterid",
    title: "Voter ID Card",
    description: "Register as a new voter, download your digital voter card, or apply for corrections.",
    icon: "fa-solid fa-id-card-clip",
    requirements: [
      "Aadhar Card / Age Proof (Birth Certificate or 10th Marksheet)",
      "One Passport Size Photograph",
      "Address Proof (Electricity Bill, Water Bill, or Gas Connection)"
    ],
    uploadUrl: "/upload-voterid"
  },
  srv_income: {
    id: "srv_income",
    title: "Income Certificate",
    description: "Get your official Income Certificate (Aay Praman Patra) processed.",
    icon: "fa-solid fa-file-invoice-dollar",
    requirements: [
      "Aadhar Card",
      "One Passport Size Photograph",
      "Self-Declaration Form (Swasthya/Aay Ghoshna Patra)",
      "Income certificate template signed by Pradhan or Corporator"
    ],
    uploadUrl: "/upload-income"
  },
  srv_caste: {
    id: "srv_caste",
    title: "Caste Certificate",
    description: "Apply for Caste Certificate (Jati Praman Patra) for SC/ST/OBC categories.",
    icon: "fa-solid fa-users",
    requirements: [
      "Aadhar Card",
      "One Passport Size Photograph",
      "Father's Caste Certificate (mandatory for verification)",
      "Ration Card or Land Registry document showing family lineage"
    ],
    uploadUrl: "/upload-caste"
  }
};

let shopSettings = {};
let selectedFiles = [];
let adminPassword = sessionStorage.getItem('adminPassword') || '';

function initThemeSwitcher() {
  const themeSelect = document.getElementById("theme-select");
  const savedTheme = localStorage.getItem("theme") || "system";

  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "system") {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      root.style.colorScheme = prefersLight ? "light" : "dark";
    } else {
      root.style.colorScheme = theme;
    }
    if (themeSelect) {
      themeSelect.value = theme;
    }
  };

  applyTheme(savedTheme);

  if (themeSelect) {
    themeSelect.addEventListener("change", (event) => {
      const nextTheme = event.target.value;
      localStorage.setItem("theme", nextTheme);
      applyTheme(nextTheme);
    });

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if ((localStorage.getItem("theme") || "system") === "system") {
        applyTheme("system");
      }
    });
  }
}

function initMobileMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  if (!menuToggle || !navLinks) return;

  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
  initThemeSwitcher();
  initMobileMenu();
  initTabs();
  fetchSettings();
  renderServices();
  initUploadForm();
  initAdminDashboard();
  initWhatsAppSimulator();
});

// --- HELPER: Toast Notification ---
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toast-icon");
  const toastMsg = document.getElementById("toast-message");

  toast.className = `toast show ${type}`;
  toastMsg.textContent = message;

  if (type === "success") {
    toastIcon.className = "fa-solid fa-circle-check toast-icon";
  } else {
    toastIcon.className = "fa-solid fa-triangle-exclamation toast-icon";
  }

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// --- CORE: Tab Router ---
function initTabs() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  // Handle browser back/forward or initial hash routing
  const handleHashChange = () => {
    let hash = window.location.hash.substring(1) || "portal";
    if (!["portal", "simulator", "admin"].includes(hash)) {
      hash = "portal";
    }

    navItems.forEach(item => {
      if (item.getAttribute("data-tab") === hash) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    tabContents.forEach(tab => {
      if (tab.id === `${hash}-tab`) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    // Run actions depending on tab
    if (hash === 'admin' && adminPassword) {
      loadAdminDashboardData();
    }
  };

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = item.getAttribute("data-tab");
      window.location.hash = tabName;
    });
  });

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange(); // Run on initial load
}

// --- CORE: Settings & Config API ---
async function fetchSettings() {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) throw new Error("Failed to load settings");
    shopSettings = await res.json();
    updateUIWithSettings();
  } catch (error) {
    console.error("Settings load error:", error);
    // Fallback UI data
    shopSettings = {
      shopName: "Maa Durga Jan Seva Kendra",
      shopOwner: "Ramesh Kumar",
      shopPhone: "918707845206",
      shopEmail: "info@cybercafe.com",
      shopAddress: "Bindwaliya near ghazipur ghat, ghazipur uttar pradesh 233001",
      shopTimings: "Monday to Saturday: 10:00 AM - 08:00 PM (Sunday Closed)"
    };
    updateUIWithSettings();
  }
}

function updateUIWithSettings() {
  document.getElementById("shop-status-text").textContent = `Timing: ${shopSettings.shopTimings}`;
  document.getElementById("hero-shop-name").textContent = shopSettings.shopName;
  document.getElementById("footer-shop-name").textContent = shopSettings.shopName;
  document.getElementById("sim-shop-name").textContent = shopSettings.shopName;

  document.getElementById("info-address").textContent = shopSettings.shopAddress;

  const phoneLink = document.getElementById("info-phone-link");
  phoneLink.href = `https://wa.me/${shopSettings.shopPhone}`;
  phoneLink.textContent = `+${shopSettings.shopPhone}`;
}

// --- PORTAL: Render Services ---
function renderServices() {
  const grid = document.getElementById("services-grid");
  grid.innerHTML = "";

  Object.values(SERVICES).forEach(service => {
    const card = document.createElement("div");
    card.className = "service-card";
    card.innerHTML = `
      <div class="service-header">
        <div class="service-icon"><i class="${service.icon}"></i></div>
        <span class="service-badge">Online Process</span>
      </div>
      <h3 class="service-title">${service.title}</h3>
      <p class="service-desc">${service.description}</p>
      <div class="service-requirements-preview">
        <h5>Required:</h5>
        <ul>
          ${service.requirements.slice(0, 2).map(req => `<li><i class="fa-solid fa-check"></i> ${req}</li>`).join('')}
          ${service.requirements.length > 2 ? `<li><i class="fa-solid fa-ellipsis"></i> & ${service.requirements.length - 2} more...</li>` : ''}
        </ul>
      </div>
      <button class="btn btn-primary btn-card" data-service-id="${service.id}"><i class="fa-solid fa-cloud-arrow-up"></i> Apply Now</button>
    `;

    // Clicking anywhere on card opens modal
    card.addEventListener("click", () => openUploadModal(service.id));
    grid.appendChild(card);
  });
}

// --- PORTAL: Upload Modal & Form ---
const modal = document.getElementById("upload-modal");
const fileDropArea = document.getElementById("file-drop-area");
const fileInput = document.getElementById("client-files");
const fileListPreview = document.getElementById("file-list-preview");

function openUploadModal(serviceId) {
  const service = SERVICES[serviceId];
  if (!service) return;

  document.getElementById("modal-service-title").innerHTML = `<i class="${service.icon}"></i> Apply for ${service.title}`;
  document.getElementById("form-service-type").value = service.id;
  document.getElementById("form-service-name").value = service.title;

  const reqList = document.getElementById("modal-requirements-list");
  reqList.innerHTML = service.requirements.map(req => `<li>${req}</li>`).join('');

  // Clear form
  document.getElementById("upload-document-form").reset();
  selectedFiles = [];
  renderFilePreview();

  modal.classList.add("open");
}

function closeUploadModal() {
  modal.classList.remove("open");
}

document.getElementById("modal-close-btn").addEventListener("click", closeUploadModal);
document.getElementById("btn-cancel-upload").addEventListener("click", closeUploadModal);

// Drag & Drop / File Select Listeners
fileDropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileDropArea.classList.add("drag-over");
});

fileDropArea.addEventListener("dragleave", () => {
  fileDropArea.classList.remove("drag-over");
});

fileDropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  fileDropArea.classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files);
  handleFilesSelection(files);
});

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  handleFilesSelection(files);
});

function handleFilesSelection(files) {
  const validFiles = files.filter(file => {
    // Validate sizes and types
    const isValidType = file.type.startsWith("image/") || file.type === "application/pdf";
    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
    return isValidType && isValidSize;
  });

  if (validFiles.length < files.length) {
    showToast("Some files were skipped. Only Images & PDFs under 10MB are supported.", "error");
  }

  // Combine and enforce max 5 files
  selectedFiles = [...selectedFiles, ...validFiles].slice(0, 5);
  renderFilePreview();
}

function renderFilePreview() {
  fileListPreview.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-preview-item";

    const sizeKB = (file.size / 1024).toFixed(1);
    const icon = file.type === "application/pdf" ? "fa-solid fa-file-pdf" : "fa-solid fa-file-image";

    item.innerHTML = `
      <span class="file-preview-name" title="${file.name}">
        <i class="${icon}"></i> ${file.name} (${sizeKB} KB)
      </span>
      <button type="button" class="file-preview-remove" data-index="${index}">&times;</button>
    `;

    item.querySelector(".file-preview-remove").addEventListener("click", (e) => {
      const idx = parseInt(e.target.getAttribute("data-index"));
      selectedFiles.splice(idx, 1);
      renderFilePreview();
    });

    fileListPreview.appendChild(item);
  });

  // Make file inputs required if no files uploaded yet
  fileInput.required = selectedFiles.length === 0;
}

function initUploadForm() {
  const form = document.getElementById("upload-document-form");
  const submitText = document.getElementById("submit-btn-text");
  const submitSpinner = document.getElementById("submit-btn-spinner");
  const submitBtn = document.getElementById("btn-submit-upload");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      showToast("Please upload at least one document.", "error");
      return;
    }

    submitText.style.display = "none";
    submitSpinner.classList.remove("hidden");
    submitBtn.disabled = true;

    // Build Form Data
    const formData = new FormData();
    formData.append("clientName", document.getElementById("client-name").value);
    formData.append("clientPhone", document.getElementById("client-phone").value);
    formData.append("serviceType", document.getElementById("form-service-type").value);
    formData.append("serviceName", document.getElementById("form-service-name").value);
    formData.append("notes", document.getElementById("client-notes").value);

    selectedFiles.forEach(file => {
      formData.append("documents", file);
    });

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit application");

      showToast("Application submitted successfully! Shop owner will contact you shortly.");
      closeUploadModal();
      form.reset();
      selectedFiles = [];
      renderFilePreview();

      // Update admin panel lists if already logged in
      if (adminPassword) loadAdminDashboardData();

    } catch (error) {
      console.error("Submission error:", error);
      showToast(error.message || "Server error occurred.", "error");
    } finally {
      submitText.style.display = "inline-flex";
      submitSpinner.classList.add("hidden");
      submitBtn.disabled = false;
    }
  });
}


// --- ADMIN: Authentication & Dashboard ---
function initAdminDashboard() {
  const loginForm = document.getElementById("admin-login-form");
  const logoutBtn = document.getElementById("btn-admin-logout");
  const loginCard = document.getElementById("admin-login-card");
  const adminPanel = document.getElementById("admin-panel");
  const togglePass = document.getElementById("toggle-password");
  const passInput = document.getElementById("admin-password");

  // Show/Hide password toggle
  togglePass.addEventListener("click", () => {
    if (passInput.type === "password") {
      passInput.type = "text";
      togglePass.className = "fa-solid fa-eye";
    } else {
      passInput.type = "password";
      togglePass.className = "fa-solid fa-eye-slash";
    }
  });

  // Login handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = passInput.value;
    const loginError = document.getElementById("login-error");
    loginError.textContent = "";

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        adminPassword = password;
        sessionStorage.setItem("adminPassword", password);

        loginCard.classList.add("hidden");
        adminPanel.classList.remove("hidden");

        showToast("Logged in as Administrator.");
        loadAdminDashboardData();
      } else {
        throw new Error(data.message || "Incorrect password");
      }
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    adminPassword = '';
    sessionStorage.removeItem("adminPassword");
    adminPanel.classList.add("hidden");
    loginCard.classList.remove("hidden");
    loginForm.reset();
  });

  // Auto-login if session exists
  if (adminPassword) {
    loginCard.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    loadAdminDashboardData();
  }

  // Dashboard Sub-navigation Tabs
  const adminTabBtns = document.querySelectorAll(".admin-tab-btn");
  const adminSubContents = document.querySelectorAll(".admin-subcontent");

  adminTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const subTab = btn.getAttribute("data-admin-tab");

      adminTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      adminSubContents.forEach(content => {
        if (content.id === `admin-${subTab}`) {
          content.classList.add("active");
        } else {
          content.classList.remove("active");
        }
      });
    });
  });

  // Settings Save Handler
  document.getElementById("shop-settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const settingsData = {
      shopName: document.getElementById("settings-shop-name").value,
      shopOwner: document.getElementById("settings-owner").value,
      shopPhone: document.getElementById("settings-phone").value,
      shopEmail: document.getElementById("settings-email").value,
      shopAddress: document.getElementById("settings-address").value,
      shopTimings: document.getElementById("settings-timings").value,
    };

    const newPass = document.getElementById("settings-password").value;
    if (newPass) {
      settingsData.adminPassword = newPass;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify(settingsData)
      });

      if (!res.ok) throw new Error("Failed to update settings");
      showToast("Shop settings saved successfully!");

      if (newPass) {
        adminPassword = newPass;
        sessionStorage.setItem("adminPassword", newPass);
      }

      fetchSettings(); // Refresh settings UI
      document.getElementById("settings-password").value = ""; // Clear password input
    } catch (error) {
      console.error(error);
      showToast("Failed to save settings.", "error");
    }
  });

  // Dynamic filter / search logic
  document.getElementById("search-submissions").addEventListener("input", filterTable);
  document.getElementById("filter-status").addEventListener("change", filterTable);
}

let loadedSubmissions = [];

async function loadAdminDashboardData() {
  if (!adminPassword) return;

  try {
    // 1. Fetch Submissions
    const resSub = await fetch("/api/submissions", {
      headers: { "x-admin-password": adminPassword }
    });
    if (!resSub.ok) throw new Error("Access Denied or Failed to Load Submissions");
    loadedSubmissions = await resSub.json();

    // 2. Fetch Settings for setting fields
    const resSet = await fetch("/api/settings");
    const rawSettings = await resSet.json();

    // Hydrate Settings Inputs
    document.getElementById("settings-shop-name").value = rawSettings.shopName || "";
    document.getElementById("settings-owner").value = rawSettings.shopOwner || "";
    document.getElementById("settings-phone").value = rawSettings.shopPhone || "";
    document.getElementById("settings-email").value = rawSettings.shopEmail || "";
    document.getElementById("settings-address").value = rawSettings.shopAddress || "";
    document.getElementById("settings-timings").value = rawSettings.shopTimings || "";

    // Render stats and tables
    renderStats(loadedSubmissions);
    renderSubmissionsTable(loadedSubmissions);

  } catch (error) {
    console.error(error);
    showToast("Dashboard sync failed. Please check login.", "error");
  }
}

function renderStats(submissions) {
  const total = submissions.length;
  const pending = submissions.filter(s => s.status === 'pending').length;
  const processing = submissions.filter(s => s.status === 'in-progress').length;
  const completed = submissions.filter(s => s.status === 'completed').length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-processing").textContent = processing;
  document.getElementById("stat-completed").textContent = completed;
}

function renderSubmissionsTable(submissions) {
  const tbody = document.getElementById("submissions-table-body");
  tbody.innerHTML = "";

  if (submissions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">No submissions found.</td></tr>`;
    return;
  }

  submissions.forEach(sub => {
    const row = document.createElement("tr");
    row.id = `row-${sub.id}`;
    row.setAttribute("data-status", sub.status);

    const dateStr = new Date(sub.createdAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const fileLinks = (sub.files || []).map(f => `
      <a href="${f.url}" target="_blank" class="admin-file-link" title="${f.originalname}">
        <i class="fa-solid fa-paperclip"></i> ${f.originalname}
      </a>
    `).join('');

    row.innerHTML = `
      <td>${dateStr}</td>
      <td>
        <div class="cust-name">${escapeHtml(sub.clientName)}</div>
        <div class="cust-phone">
          <i class="fa-brands fa-whatsapp"></i> 
          <a href="https://wa.me/${sub.clientPhone}" target="_blank">${escapeHtml(sub.clientPhone)}</a>
        </div>
      </td>
      <td>
        <span class="service-type-badge">${escapeHtml(sub.serviceName)}</span>
      </td>
      <td>
        <div class="file-links-container">
          ${fileLinks || '<span class="text-muted">No files</span>'}
        </div>
      </td>
      <td>
        <select class="status-select-inline" id="status-${sub.id}">
          <option value="pending" ${sub.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="in-progress" ${sub.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${sub.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="rejected" ${sub.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
      <td>
        <textarea class="admin-remarks-area" id="remarks-${sub.id}" placeholder="Add remarks...">${escapeHtml(sub.remarks || "")}</textarea>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-primary btn-icon btn-save-row" title="Save status/remarks" onclick="saveRow('${sub.id}')">
            <i class="fa-solid fa-floppy-disk"></i>
          </button>
          <button class="btn btn-delete-row btn-icon" title="Delete submission" onclick="deleteRow('${sub.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function filterTable() {
  const query = document.getElementById("search-submissions").value.toLowerCase();
  const statusFilter = document.getElementById("filter-status").value;

  const rows = document.querySelectorAll("#submissions-table-body tr");

  rows.forEach(row => {
    if (row.classList.contains("loading-cell") || row.cells.length < 5) return;

    const name = row.cells[1].querySelector(".cust-name").textContent.toLowerCase();
    const phone = row.cells[1].querySelector(".cust-phone").textContent.toLowerCase();
    const service = row.cells[2].textContent.toLowerCase();
    const status = row.getAttribute("data-status");

    const matchesQuery = name.includes(query) || phone.includes(query) || service.includes(query);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    if (matchesQuery && matchesStatus) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Global actions accessed by row buttons
window.saveRow = async function (id) {
  const status = document.getElementById(`status-${id}`).value;
  const remarks = document.getElementById(`remarks-${id}`).value;

  try {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword
      },
      body: JSON.stringify({ status, remarks })
    });

    if (!res.ok) throw new Error("Failed to save submission");

    // Update local record
    const subIdx = loadedSubmissions.findIndex(s => s.id === id);
    if (subIdx !== -1) {
      loadedSubmissions[subIdx].status = status;
      loadedSubmissions[subIdx].remarks = remarks;
    }

    // Refresh display status attribute for CSS filters
    document.getElementById(`row-${id}`).setAttribute("data-status", status);

    renderStats(loadedSubmissions);
    showToast("Changes saved successfully!");
  } catch (error) {
    console.error(error);
    showToast("Failed to save changes.", "error");
  }
};

window.deleteRow = async function (id) {
  if (!confirm("Are you sure you want to delete this submission? All uploaded files will be permanently deleted from the server.")) return;

  try {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": adminPassword }
    });

    if (!res.ok) throw new Error("Failed to delete submission");

    // Remove from loaded list
    loadedSubmissions = loadedSubmissions.filter(s => s.id !== id);
    renderStats(loadedSubmissions);
    renderSubmissionsTable(loadedSubmissions);
    showToast("Submission deleted successfully!");
  } catch (error) {
    console.error(error);
    showToast("Deletion failed.", "error");
  }
};

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


// --- SIMULATOR: WhatsApp Bot Simulation Logic ---
function initWhatsAppSimulator() {
  const chatWindow = document.getElementById("wa-chat-window");
  const inputField = document.getElementById("wa-input");
  const sendBtn = document.getElementById("wa-send-btn");

  // Load Initial Welcome Bot Messages
  setTimeout(() => {
    addBotMessage("Hi! Maa Durga Jan Seva Kendra me aapka swagat hai. Main aapki kya madad kar sakta hoon?");
    addBotWelcomeMenu();
  }, 1000);

  // Send input handlers
  const sendMessage = () => {
    const text = inputField.value.trim();
    if (!text) return;

    addUserMessage(text);
    inputField.value = "";

    // Process Response based on Keywords
    setTimeout(() => {
      processIncomingUserMessage(text.toLowerCase());
    }, 1000);
  };

  sendBtn.addEventListener("click", sendMessage);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
}

function addUserMessage(text) {
  const chat = document.getElementById("wa-chat-window");
  const msg = document.createElement("div");
  msg.className = "wa-msg out";

  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  msg.innerHTML = `
    ${escapeHtml(text)}
    <span class="wa-time">${timeStr} <i class="fa-solid fa-check-double"></i></span>
  `;

  chat.appendChild(msg);
  scrollToBottom(chat);
}

function addBotMessage(text) {
  const chat = document.getElementById("wa-chat-window");
  const msg = document.createElement("div");
  msg.className = "wa-msg in";

  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  msg.innerHTML = `
    ${text.replace(/\n/g, "<br>")}
    <span class="wa-time">${timeStr}</span>
  `;

  chat.appendChild(msg);
  scrollToBottom(chat);
}

// Visual Interactive Menu Simulator
function addBotWelcomeMenu() {
  const chat = document.getElementById("wa-chat-window");
  const card = document.createElement("div");
  card.className = "wa-interactive-card";

  card.innerHTML = `
    <div class="wa-interactive-header">Maa Durga Jan Seva Kendra</div>
    <div class="wa-interactive-body">Hello! 🙏 Hamare Jan Seva Kendra me aapka swagat hai. Aapko jis bhi service ke baare me jaan-na hai, niche diye gaye button par click karke select karein:</div>
    <div class="wa-interactive-footer">Chunein aur aage badhein</div>
    <div class="wa-interactive-action-btn" onclick="openWhatsAppMenuModal()">
      <i class="fa-solid fa-list-ul"></i> Services Menu 👇
    </div>
  `;

  chat.appendChild(card);
  scrollToBottom(chat);

  // Update Payload Box with the outgoing Interactive List Menu structure
  updatePayloadViewer("n8n: HTTP Request (Welcome Menu)", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "CUSTOMER_PHONE_NUMBER",
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Cyber Cafe Online Services" },
      body: { text: "Hello! 🙏 Hamare Cyber Cafe me aapka swagat hai. Aapko jis bhi service..." },
      footer: { text: "Chunein aur aage badhein" },
      action: {
        button: "Services Menu 👇",
        sections: [
          {
            title: "Government ID Cards",
            rows: [
              { id: "srv_pancard", title: "Pan Card Apply", description: "Naya Pan Card ya Correction" },
              { id: "srv_voterid", title: "Voter ID Card", description: "Naya Voter ID card banayein" }
            ]
          },
          {
            title: "Certificates & Others",
            rows: [
              { id: "srv_income", title: "Income Certificate", description: "Aay Praman Patra" },
              { id: "srv_caste", title: "Caste Certificate", description: "Jati Praman Patra" }
            ]
          }
        ]
      }
    }
  });
}

// Open custom mock overlay on the simulated phone
window.openWhatsAppMenuModal = function () {
  // Create modal markup inside whatsapp layout if not already created
  const container = document.querySelector(".whatsapp-container");

  let modal = document.getElementById("wa-mock-list-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "wa-mock-list-modal";
    modal.className = "wa-mock-menu-modal";
    modal.innerHTML = `
      <div class="wa-mock-menu-header">
        <h4>Choose Service</h4>
        <button class="wa-mock-menu-close" onclick="closeWhatsAppMenuModal()">&times;</button>
      </div>
      <div class="wa-mock-menu-body">
        <div class="wa-mock-menu-section-title">Government ID Cards</div>
        <div class="wa-mock-menu-row" onclick="selectWhatsAppRow('srv_pancard', 'Pan Card Apply')">
          <div class="wa-mock-menu-row-title">Pan Card Apply</div>
          <div class="wa-mock-menu-row-desc">Naya Pan Card ya Correction</div>
        </div>
        <div class="wa-mock-menu-row" onclick="selectWhatsAppRow('srv_voterid', 'Voter ID Card')">
          <div class="wa-mock-menu-row-title">Voter ID Card</div>
          <div class="wa-mock-menu-row-desc">Naya Voter ID card banayein</div>
        </div>
        
        <div class="wa-mock-menu-section-title">Certificates & Others</div>
        <div class="wa-mock-menu-row" onclick="selectWhatsAppRow('srv_income', 'Income Certificate')">
          <div class="wa-mock-menu-row-title">Income Certificate</div>
          <div class="wa-mock-menu-row-desc">Aay Praman Patra (आय प्रमाण पत्र)</div>
        </div>
        <div class="wa-mock-menu-row" onclick="selectWhatsAppRow('srv_caste', 'Caste Certificate')">
          <div class="wa-mock-menu-row-title">Caste Certificate</div>
          <div class="wa-mock-menu-row-desc">Jati Praman Patra (जाति प्रमाण पत्र)</div>
        </div>
      </div>
    `;
    container.appendChild(modal);
  }

  setTimeout(() => modal.classList.add("open"), 50);
};

window.closeWhatsAppMenuModal = function () {
  const modal = document.getElementById("wa-mock-list-modal");
  if (modal) modal.classList.remove("open");
};

window.selectWhatsAppRow = function (id, title) {
  closeWhatsAppMenuModal();
  addUserMessage(title);

  // Show JSON coming FROM meta into n8n Webhook Node
  updatePayloadViewer("n8n Webhook (List Reply Input)", {
    object: "whatsapp_business_account",
    entry: [{
      id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "918312345678", phone_number_id: "PHONE_NUMBER_ID" },
          contacts: [{ profile: { name: "John Doe" }, wa_id: "CUSTOMER_PHONE" }],
          messages: [{
            from: "CUSTOMER_PHONE",
            id: "wamid.HBgLOTE4MzEyMzQ1Njc4FQIAERgSRDMxQzE4MkYwRTc4Q0I3MjlDRQA=",
            timestamp: Math.round(Date.now() / 1000).toString(),
            type: "interactive",
            interactive: {
              type: "list_reply",
              list_reply: { id: id, title: title, description: "Description..." }
            }
          }]
        },
        field: "messages"
      }]
    }]
  });

  // Bot processes response after slight delay
  setTimeout(() => {
    processBotMenuChoice(id);
  }, 1000);
};

function processIncomingUserMessage(text) {
  // Logic mimicking the Switch Node in n8n
  // Matches keywords or redirects to welcome menu

  // Show payload incoming
  updatePayloadViewer("n8n Webhook (Text Message)", {
    messages: [{
      from: "CUSTOMER_PHONE",
      type: "text",
      text: { body: text }
    }]
  });

  // Switch node routing simulation
  if (text.includes("shop") || text.includes("timing") || text.includes("address") || text.includes("location")) {
    const shopDetailsMsg = `📍 *Hamari Shop ki Details:*\n\n🏠 *Address:* ${shopSettings.shopAddress || "123, Main Market, Sector 5, Mumbai"}\n⏰ *Timing:* ${shopSettings.shopTimings || "Subah 10:00 AM se Raat 9:00 PM tak (Sunday Closed)"}`;
    addBotMessage(shopDetailsMsg);

    updatePayloadViewer("n8n: HTTP Request (Shop Details)", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "CUSTOMER_PHONE",
      type: "text",
      text: {
        preview_url: false,
        body: shopDetailsMsg
      }
    });
  } else if (text.includes("website") || text.includes("link") || text.includes("upload")) {
    const websiteMsg = `🌐 *Hamari Website:*\n\nAap niche diye gaye link par click karke hamare products dekh sakte hain aur documents upload kar sakte hain:\n\n👉 ${window.location.origin}/#portal`;
    addBotMessage(websiteMsg);

    updatePayloadViewer("n8n: HTTP Request (Website Link)", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "CUSTOMER_PHONE",
      type: "text",
      text: {
        preview_url: true,
        body: websiteMsg
      }
    });
  } else if (text.includes("pan") || text.includes("pancard")) {
    processBotMenuChoice("srv_pancard");
  } else if (text.includes("income") || text.includes("aay")) {
    processBotMenuChoice("srv_income");
  } else if (text.includes("voter") || text.includes("voterid")) {
    processBotMenuChoice("srv_voterid");
  } else if (text.includes("caste") || text.includes("jati")) {
    processBotMenuChoice("srv_caste");
  } else {
    // Default welcome menu trigger
    addBotMessage("Main aapka message samajh nahi paya. Kripya niche diye gaye menu me se sahi option select karein:");
    setTimeout(() => {
      addBotWelcomeMenu();
    }, 500);
  }
}

function processBotMenuChoice(id) {
  const origin = window.location.origin;

  if (id === "srv_pancard") {
    const panMsg = `💳 *Pan Card Banane Ke Liye Zaroori Documents:*\n\n1️⃣ Aadhar Card (Mobile No. Link hona chahiye)\n2️⃣ Ek Passport Size Photo\n3️⃣ Ek Signature (White Paper par)\n\n👇 *Document Upload Karein:*\nNiche diye gaye link par click karke apne documents upload karein aur form fill karein:\n👉 ${origin}/#portal`;
    addBotMessage(panMsg);

    updatePayloadViewer("n8n: HTTP Request (Pan Card Reply)", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "CUSTOMER_PHONE",
      type: "text",
      text: {
        preview_url: true,
        body: panMsg
      }
    });
  } else if (id === "srv_income") {
    const incomeMsg = `📄 *Income Certificate (Aay Praman Patra) Ke Liye Documents:*\n\n1️⃣ Aadhar Card\n2️⃣ Ek Passport Size Photo\n3️⃣ Purana Income Certificate (Agar ho toh)\n4️⃣ Pradhan ya Corporator ka Swasthya/Aay Ghoshna Patra\n\n👇 *Document Upload Karein:*\nNiche diye gaye link par click karke apne documents upload karein:\n👉 ${origin}/#portal`;
    addBotMessage(incomeMsg);

    updatePayloadViewer("n8n: HTTP Request (Income Cert Reply)", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "CUSTOMER_PHONE",
      type: "text",
      text: {
        preview_url: true,
        body: incomeMsg
      }
    });
  } else if (id === "srv_voterid") {
    const voterMsg = `🗳️ *Voter ID Card Banane Ke Liye Documents:*\n\n1️⃣ Aadhar Card / Age Proof (Age 18+ hona chahiye)\n2️⃣ Ek Passport Size Photo\n3️⃣ Address Proof (Electricity bill / Family member ka Voter ID card)\n\n👇 *Document Upload Link:*\nNiche diye gaye link par upload karein:\n👉 ${origin}/#portal`;
    addBotMessage(voterMsg);

    updatePayloadViewer("n8n: HTTP Request (Voter ID Reply)", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "CUSTOMER_PHONE",
      type: "text",
      text: {
        preview_url: true,
        body: voterMsg
      }
    });
  } else if (id === "srv_caste") {
    const casteMsg = `👥 *Caste Certificate (Jati Praman Patra) Ke Documents:*\n\n1️⃣ Aadhar Card\n2️⃣ Passport Size Photo\n3️⃣ Father ka Jati Praman Patra (Mandatory proof)\n4️⃣ Address/Registry copy\n\n👇 *Document Upload Link:*\nDocuments upload karne ke liye click karein:\n👉 ${origin}/#portal`;
    addBotMessage(casteMsg);

    updatePayloadViewer("n8n: HTTP Request (Caste Cert Reply)", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "CUSTOMER_PHONE",
      type: "text",
      text: {
        preview_url: true,
        body: casteMsg
      }
    });
  }
}

function updatePayloadViewer(nodeName, payload) {
  document.getElementById("payload-node-name").textContent = nodeName;
  document.getElementById("payload-code").textContent = JSON.stringify(payload, null, 2);
}

function scrollToBottom(el) {
  el.scrollTop = el.scrollHeight;
}
