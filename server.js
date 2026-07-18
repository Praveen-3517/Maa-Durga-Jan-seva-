const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure required directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Serve uploaded files statically (for admin download/view)
app.use('/uploads', express.static(UPLOADS_DIR));
// Serve frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique name keeping the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

// Helper function to read/write submissions
const getSubmissions = () => {
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading submissions:', error);
    return [];
  }
};

const saveSubmissions = (submissions) => {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
};

// Helper function to read/write settings
const getSettings = () => {
  const defaultSettings = {
    shopName: "Maa Durga Jan Seva Kendra",
    shopOwner: "Ramesh Kumar",
    shopPhone: "918707845206",
    shopEmail: "ramesh.cybercafe@gmail.com",
    shopAddress: "Bindwaliya near ghazipur ghat, ghazipur uttar pradesh 233001",
    shopTimings: "Monday to Saturday: 09:00 AM - 08:00 PM (Sunday Closed)",
    adminPassword: "admin123"
  };

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return { ...defaultSettings, ...JSON.parse(data || '{}') };
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaultSettings;
  }
};

const saveSettings = (settings) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
};

// --- API Endpoints ---

// Get shop settings (Public)
app.get('/api/settings', (req, res) => {
  const settings = getSettings();
  // Don't leak the password in the public endpoint
  const publicSettings = { ...settings };
  delete publicSettings.adminPassword;
  res.json(publicSettings);
});

// Admin verification (Internal check)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const settings = getSettings();
  if (password === settings.adminPassword) {
    res.json({ success: true, message: "Login successful!" });
  } else {
    res.status(401).json({ success: false, message: "Incorrect password!" });
  }
});

// Middleware to check admin authorization
const checkAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  const settings = getSettings();
  if (password === settings.adminPassword) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Invalid credentials." });
  }
};

// Save a new application/submission (Public with file uploads)
app.post('/api/submissions', upload.array('documents', 5), (req, res) => {
  try {
    const { clientName, clientPhone, serviceType, serviceName, notes } = req.body;

    if (!clientName || !clientPhone || !serviceType || !serviceName) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const files = (req.files || []).map(file => ({
      originalname: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`
    }));

    const newSubmission = {
      id: uuidv4(),
      clientName,
      clientPhone,
      serviceType,
      serviceName,
      notes: notes || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      files,
      remarks: ""
    };

    const submissions = getSubmissions();
    submissions.push(newSubmission);
    saveSubmissions(submissions);

    res.status(201).json({ 
      success: true, 
      message: "Application submitted successfully!",
      id: newSubmission.id 
    });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ success: false, message: "Server error occurred while submitting documents." });
  }
});

// Get all submissions (Admin Only)
app.get('/api/submissions', checkAdmin, (req, res) => {
  const submissions = getSubmissions();
  // Return sorted by date (newest first)
  submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(submissions);
});

// Update submission status or remarks (Admin Only)
app.put('/api/submissions/:id', checkAdmin, (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const submissions = getSubmissions();
  const index = submissions.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: "Submission not found." });
  }

  if (status) submissions[index].status = status;
  if (remarks !== undefined) submissions[index].remarks = remarks;

  saveSubmissions(submissions);
  res.json({ success: true, message: "Submission updated successfully!", submission: submissions[index] });
});

// Delete a submission (Admin Only)
app.delete('/api/submissions/:id', checkAdmin, (req, res) => {
  const { id } = req.params;
  const submissions = getSubmissions();
  const index = submissions.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: "Submission not found." });
  }

  // Delete associated files
  const submission = submissions[index];
  if (submission.files && submission.files.length > 0) {
    submission.files.forEach(file => {
      const filePath = path.join(UPLOADS_DIR, file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete file ${file.filename}:`, e);
        }
      }
    });
  }

  submissions.splice(index, 1);
  saveSubmissions(submissions);

  res.json({ success: true, message: "Submission and associated files deleted." });
});

// Update settings (Admin Only)
app.put('/api/settings', checkAdmin, (req, res) => {
  const newSettings = req.body;
  const currentSettings = getSettings();

  // Validate settings structure
  const updatedSettings = {
    shopName: newSettings.shopName || currentSettings.shopName,
    shopOwner: newSettings.shopOwner || currentSettings.shopOwner,
    shopPhone: newSettings.shopPhone || currentSettings.shopPhone,
    shopEmail: newSettings.shopEmail || currentSettings.shopEmail,
    shopAddress: newSettings.shopAddress || currentSettings.shopAddress,
    shopTimings: newSettings.shopTimings || currentSettings.shopTimings,
    adminPassword: newSettings.adminPassword || currentSettings.adminPassword
  };

  saveSettings(updatedSettings);
  res.json({ success: true, message: "Settings updated successfully!" });
});

// Fallback to serve index.html for client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Cyber Cafe Portal running on http://localhost:${PORT}`);
  console.log(`📂 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`🗃️ Database directory: ${DATA_DIR}`);
  console.log(`==================================================`);
});
