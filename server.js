require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiverModule = require('archiver');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const compression = require('compression');
const sharp = require('sharp');

// Universal helper to instantiate Archiver across version exports
const createZipArchive = (options) => {
  if (typeof archiverModule === 'function') {
    return archiverModule('zip', options);
  }
  if (archiverModule.ZipArchive) {
    return new archiverModule.ZipArchive(options);
  }
  if (archiverModule.default && typeof archiverModule.default === 'function') {
    return archiverModule.default('zip', options);
  }
  throw new Error('Archiver module constructor not found');
};

const { createClient } = require('@supabase/supabase-js');

const app = express();

// Trust proxy is REQUIRED for rate-limiting to work correctly when deployed behind 
// reverse proxies (like Render, Railway, or Heroku), otherwise all requests share one IP.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── FIX 1: Helmet — HTTP Security Headers ────────────────────────────────────
// Adds X-Frame-Options, X-Content-Type-Options, CSP, HSTS, and more.
app.use(helmet({
  contentSecurityPolicy: false // Disabled to allow CDN scripts (Lottie, FontAwesome, Google Fonts)
}));

// ── FIX 9 & 10: Morgan Logging & Gzip Compression ────────────────────────────
app.use(compression());
app.use(morgan('combined'));

// ── FIX 2: CORS — Lock to Allowed Origins ────────────────────────────────────
// In production, replace 'http://localhost:3000' with your live domain.
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin '${origin}' is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-password', 'Authorization']
}));

// ── FIX 3: Rate Limiting ──────────────────────────────────────────────────────
// Admin login: max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

// Upload/submission endpoints: max 20 requests per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submission requests. Please try again later.' }
});

// General API limiter: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

app.use('/api/', apiLimiter);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// --- 1. Supabase & JWT Initialization ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me-in-production';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_KEY environment variables are missing!');
  console.warn('Please create a .env file based on .env.example with your Supabase credentials.');
}

// Initialize Supabase client
const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-key'
);

// --- 2. Multer Configuration (Memory Storage) ---
// Use memoryStorage so file buffers are kept in RAM for direct upload to Supabase Storage
const storage = multer.memoryStorage();

// ── FIX 4: Multer File Type Validation (MIME whitelist) ──────────────────────
// Only allow images (JPEG, PNG, WebP) and PDF documents.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error(`Invalid file type: '${file.originalname}'. Only JPEG, PNG, WebP, and PDF files are allowed.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 10 }, // 100MB per file, max 10 files
  fileFilter: fileFilter
});

// --- 3. Helper for Local Settings Persistence ---
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── FIX 5: bcrypt password hash helper ───────────────────────────────────────
// On first run, if adminPassword is stored as plaintext (legacy), it stays as-is.
// When admin changes password via settings, it gets hashed automatically.
const BCRYPT_ROUNDS = 12;

const getSettings = () => {
  const defaultSettings = {
    shopName: "Maa Durga Jan Seva Kendra",
    shopOwner: "Ramesh Kumar",
    shopPhone: "918707845206",
    shopEmail: "ramesh.cybercafe@gmail.com",
    shopAddress: "Bindwaliya near ghazipur ghat, ghazipur uttar pradesh 233001",
    shopTimings: "24/7",
    adminPasswordHash: "", // bcrypt hash stored here
    adminPassword: process.env.ADMIN_PASSWORD || "admin123"  // legacy plaintext fallback (migrated on first login)
  };

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return { ...defaultSettings, ...JSON.parse(data || '{}') };
  } catch (error) {
    console.error('[Settings] Error reading settings file:', error.message);
    return defaultSettings;
  }
};

const saveSettings = (settings) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
};

// ── Admin Auth Middleware — now using JWT ────────────────────────────────────
const checkAdmin = (req, res, next) => {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    res.status(403).json({ error: "Access denied. Invalid or expired token." });
  }
};

// Serve static frontend assets
// Serve from client/dist if it exists (Vite build), otherwise fallback to public
const distPath = path.join(__dirname, 'client', 'dist');
const publicPath = path.join(__dirname, 'public');
const frontendPath = fs.existsSync(distPath) ? distPath : publicPath;
app.use(express.static(frontendPath));

// --- 4. API Endpoints ---

// Public Shop Settings
app.get('/api/settings', (req, res) => {
  const settings = getSettings();
  const publicSettings = { ...settings };
  delete publicSettings.adminPassword;
  res.json(publicSettings);
});

// Admin Login — rate limited + bcrypt verification
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: "Password is required." });
  }

  const settings = getSettings();

  try {
    let isValid = false;

    if (settings.adminPasswordHash && settings.adminPasswordHash.startsWith('$2')) {
      // Secure bcrypt comparison
      isValid = await bcrypt.compare(password, settings.adminPasswordHash);
    } else {
      // Legacy plaintext — compare and auto-migrate to hash
      isValid = (password === settings.adminPassword);
      if (isValid) {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const updated = { ...settings, adminPasswordHash: hash, adminPassword: '' };
        saveSettings(updated);
        console.log('[Security] Admin password migrated to bcrypt hash on login.');
      }
    }

    if (isValid) {
      const token = jwt.sign({ role: 'admin', shop: settings.shopName }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ success: true, message: "Login successful!", token });
    } else {
      // Use same generic message to prevent user enumeration
      res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    }
  } catch (err) {
    console.error('[Login] Error during admin login:', err.message);
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

/**
 * Common handler for uploading documents & creating submission records in Supabase.
 * Accepts both legacy frontend payload fields (clientName, clientPhone, serviceName) 
 * and standard schema fields (name, phone, service).
 */
const submissionValidators = [
  body('clientName').optional().trim().escape(),
  body('clientPhone').optional().trim().escape(),
  body('serviceType').optional().trim().escape(),
  body('serviceName').optional().trim().escape(),
  body('name').optional().trim().escape(),
  body('phone').optional().trim().escape(),
  body('service').optional().trim().escape(),
  body('notes').optional().trim().escape(),
  body('remarks').optional().trim().escape()
];

const handleUploadAndSubmission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const name = req.body.name || req.body.clientName;
    const phone = req.body.phone || req.body.clientPhone;
    const service = req.body.service || req.body.serviceName || req.body.serviceType;
    const remarks = req.body.remarks || req.body.notes || "";

    if (!name || !phone || !service) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. 'name', 'phone', and 'service' are mandatory."
      });
    }

    const uploadedFiles = [];

    // Process file uploads to Supabase Storage bucket 'client_documents'
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        let fileBuffer = file.buffer;
        let ext = path.extname(file.originalname).toLowerCase();
        let mimetype = file.mimetype;

        // ── Image Compression (if > 600KB) ──
        if (mimetype.startsWith('image/') && file.size > 600 * 1024) {
          try {
            fileBuffer = await sharp(file.buffer)
              .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 75 }) // WebP provides excellent compression with transparency
              .toBuffer();
            ext = '.webp';
            mimetype = 'image/webp';
            console.log(`[Compression] ${file.originalname} compressed successfully.`);
          } catch (e) {
            console.error("[Compression Error] Failed to compress:", file.originalname, e);
            // Fallback to original buffer if compression fails
          }
        }

        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;

        // Upload buffer directly to Supabase storage bucket
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('client_documents')
          .upload(filename, fileBuffer, {
            contentType: mimetype,
            upsert: false
          });

        if (storageError) {
          console.error("Supabase Storage Upload Error:", storageError);
          throw new Error(`Failed to upload ${file.originalname} to Supabase Storage: ${storageError.message}`);
        }

        // Get public URL of the uploaded file
        const { data: publicUrlData } = supabase
          .storage
          .from('client_documents')
          .getPublicUrl(filename);

        const publicUrl = publicUrlData.publicUrl;

        uploadedFiles.push({
          originalname: file.originalname,
          filename: filename,
          size: file.size,
          mimetype: file.mimetype,
          url: publicUrl
        });
      }
    }

    // Insert record into Supabase PostgreSQL 'submissions' table
    const { data: submissionData, error: dbError } = await supabase
      .from('submissions')
      .insert([
        {
          name: name,
          phone: phone,
          service: service,
          status: 'Pending',
          remarks: remarks || null,
          files: uploadedFiles
        }
      ])
      .select();

    if (dbError) {
      console.error("Supabase Database Insert Error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    const insertedRecord = submissionData && submissionData[0] ? submissionData[0] : null;

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully to Supabase!",
      id: insertedRecord ? insertedRecord.id : null,
      submission: insertedRecord
    });

  } catch (error) {
    // ── FIX 6: Sanitized error response — never expose internal details ────
    console.error('[Upload] Error in upload/submission endpoint:', error.message);
    // Pass multer file type errors to client (they are user-facing)
    const isUserError = error.message && error.message.startsWith('Invalid file type');
    return res.status(isUserError ? 400 : 500).json({
      success: false,
      message: isUserError ? error.message : "Failed to process your submission. Please try again."
    });
  }
};

// Route: POST /api/upload (Standard Supabase Endpoint) — rate limited
app.post('/api/upload', uploadLimiter, upload.array('documents', 10), submissionValidators, handleUploadAndSubmission);

// Route: POST /api/submissions (Frontend Compatibility Route) — rate limited
app.post('/api/submissions', uploadLimiter, upload.array('documents', 10), submissionValidators, handleUploadAndSubmission);

/**
 * Route: GET /api/submissions
 * Fetch all records from Supabase 'submissions' table, ordered by created_at descending.
 * Compatible with Admin Dashboard.
 */
app.get('/api/submissions', checkAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Submissions GET] Supabase Select Error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch submissions. Please try again.' });
    }

    // Format fields so both new Supabase schema keys and frontend legacy keys work seamlessly
    const formattedData = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      clientName: row.name,
      phone: row.phone,
      clientPhone: row.phone,
      service: row.service,
      serviceName: row.service,
      serviceType: row.service,
      status: row.status,
      remarks: row.remarks || "",
      created_at: row.created_at,
      createdAt: row.created_at,
      files: row.files || []
    }));

    res.json(formattedData);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching submissions." });
  }
});

/**
 * Common handler to update submission status and remarks by UUID in Supabase.
 * Supports both PATCH /api/submissions/:id/status and PUT /api/submissions/:id
 */
const handleStatusUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (remarks !== undefined) updates.remarks = remarks;

    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Status Update] Supabase Update Error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to update submission. Please try again.' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "Submission record not found." });
    }

    const updatedRecord = data[0];

    res.json({
      success: true,
      message: "Submission updated successfully in Supabase!",
      submission: {
        ...updatedRecord,
        clientName: updatedRecord.name,
        clientPhone: updatedRecord.phone,
        serviceName: updatedRecord.service,
        createdAt: updatedRecord.created_at
      }
    });

  } catch (error) {
    console.error("Error updating submission:", error);
    res.status(500).json({ success: false, message: "Internal server error while updating submission." });
  }
};

// Route: PATCH /api/submissions/:id/status
app.patch('/api/submissions/:id/status', checkAdmin, handleStatusUpdate);

// Route: PUT /api/submissions/:id
app.put('/api/submissions/:id', checkAdmin, handleStatusUpdate);

/**
 * Route: DELETE /api/submissions/:id
 * Delete submission record and associated files from Supabase Storage.
 */
app.delete('/api/submissions/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Retrieve submission to get file details
    const { data: record, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !record) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    // 2. Delete files from Supabase Storage bucket 'client_documents'
    if (record.files && Array.isArray(record.files) && record.files.length > 0) {
      const filenames = record.files.map(f => f.filename).filter(Boolean);
      if (filenames.length > 0) {
        const { error: storageDeleteError } = await supabase
          .storage
          .from('client_documents')
          .remove(filenames);

        if (storageDeleteError) {
          console.warn("Warning: Could not remove files from Supabase Storage:", storageDeleteError.message);
        }
      }
    }

    // 3. Delete record from Supabase 'submissions' table
    const { error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Delete] Supabase Delete Error:', deleteError.message);
      throw new Error('Database delete operation failed.');
    }

    res.json({ success: true, message: "Submission and associated files deleted from Supabase." });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({ success: false, message: "Internal server error while deleting submission." });
  }
});

/**
 * Route: GET /api/submissions/:id/receipt
 * Generates a clean, professional PDF application & payment receipt using PDFKit.
 * Printable/downloadable by shop owner or customer.
 */
app.get('/api/submissions/:id/receipt', async (req, res) => {
  try {
    const rawId = (req.params.id || '').trim();
    const hyphenatedId = rawId.replace(/\s+/g, '-');

    // Fetch submission from Supabase using flexible ID matching
    let data = null;
    let error = null;

    const queryRes = await supabase
      .from('submissions')
      .select('*')
      .or(`id.eq.${rawId},id.eq.${hyphenatedId}`);

    data = queryRes.data;
    error = queryRes.error;

    // Fallback search: match normalized string if not found
    if ((!data || data.length === 0)) {
      const allRes = await supabase.from('submissions').select('*').limit(100);
      if (allRes.data && allRes.data.length > 0) {
        const targetNorm = rawId.replace(/[\s\-]/g, '').toLowerCase();
        const found = allRes.data.find(s => (s.id || '').replace(/[\s\-]/g, '').toLowerCase() === targetNorm);
        if (found) data = [found];
      }
    }

    if (!data || data.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt Not Found - Maa Durga Jan Seva Kendra</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 2rem; border-radius: 12px; max-width: 450px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #f43f5e; font-size: 1.5rem; margin-top: 0; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #38bdf8; word-break: break-all; }
            a { display: inline-block; margin-top: 1rem; padding: 0.6rem 1.2rem; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Receipt Not Found</h1>
            <p>Could not find an application record for ID: <br><code>${rawId}</code></p>
            <p>Please check the application ID or contact shop support.</p>
            <a href="/">Return to Home Page</a>
          </div>
        </body>
        </html>
      `);
    }

    const submission = data[0];
    const settings = getSettings();

    // Set response headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt_${submission.id}.pdf"`);

    // Create PDF document instance (A4 size with 40pt margins)
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Pipe PDF directly to HTTP response stream
    doc.pipe(res);

    // Color Palette
    const primaryColor = '#0f172a';   // Slate Dark
    const accentColor = '#2563eb';    // Royal Blue
    const lightBg = '#f8fafc';        // Light Background
    const borderColor = '#cbd5e1';    // Slate Border
    const textColor = '#334155';      // Slate Text

    // 1. Header Banner Box
    doc.rect(40, 40, 515, 65).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text((settings.shopName || 'MAA DURGA JAN SEVA KENDRA').toUpperCase(), 55, 52);
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('CSC & ONLINE DIGITAL SERVICES PORTAL', 55, 75);
    doc.text(`Contact: ${settings.shopPhone || 'N/A'}`, 55, 87);

    // 2. Subheader & Receipt Badge
    doc.fillColor(accentColor).fontSize(14).font('Helvetica-Bold').text('DIGITAL SERVICE APPLICATION RECEIPT', 40, 120);

    // Decorative Line
    doc.moveTo(40, 140).lineTo(555, 140).strokeColor(accentColor).lineWidth(2).stroke();

    // 3. Shop & Receipt Metadata Info
    doc.fontSize(9).font('Helvetica').fillColor(textColor);
    doc.text(`Shop Address: ${settings.shopAddress || 'N/A'}`, 40, 150, { width: 280 });
    
    const formattedDate = new Date(submission.created_at || submission.createdAt || Date.now()).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    doc.text(`Date & Time: ${formattedDate}`, 320, 150, { align: 'right' });
    doc.text(`Receipt ID: ${submission.id}`, 320, 165, { align: 'right' });

    doc.moveTo(40, 185).lineTo(555, 185).strokeColor(borderColor).lineWidth(1).stroke();

    // 4. Details Table Container Box
    const startY = 200;
    doc.rect(40, startY, 515, 205).fillAndStroke(lightBg, borderColor);

    doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text('APPLICATION & CUSTOMER DETAILS', 55, startY + 12);
    doc.moveTo(55, startY + 28).lineTo(540, startY + 28).strokeColor(borderColor).lineWidth(1).stroke();

    // Helper row drawer
    const drawDetailRow = (label, value, yPos, isStatus = false) => {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text(label, 55, yPos);
      
      if (isStatus) {
        const statusUpper = (value || 'PENDING').toUpperCase();
        let statusColor = '#d97706'; // Amber for Pending
        if (statusUpper === 'COMPLETED') statusColor = '#16a34a';
        if (statusUpper === 'IN-PROGRESS' || statusUpper === 'IN PROGRESS') statusColor = '#2563eb';
        if (statusUpper === 'REJECTED') statusColor = '#dc2626';

        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(10).text(statusUpper, 200, yPos);
      } else {
        doc.fillColor(textColor).font('Helvetica').fontSize(10).text(value || 'N/A', 200, yPos, { width: 330 });
      }
    };

    drawDetailRow('Application ID:', submission.id, startY + 38);
    drawDetailRow('Customer Name:', submission.name || submission.clientName, startY + 58);
    drawDetailRow('Mobile Number:', submission.phone || submission.clientPhone, startY + 78);
    drawDetailRow('Service Name:', submission.service || submission.serviceName, startY + 98);
    drawDetailRow('Application Status:', submission.status, startY + 118, true);
    drawDetailRow('Remarks / Notes:', submission.remarks || submission.notes || 'No additional remarks.', startY + 138);

    const fileCount = (submission.files && Array.isArray(submission.files)) ? submission.files.length : 0;
    drawDetailRow('Uploaded Documents:', `${fileCount} file attachment(s)`, startY + 175);

    // 5. Uploaded Document List (if present)
    let currentY = startY + 220;
    if (fileCount > 0) {
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('Attached File Names:', 40, currentY);
      currentY += 15;

      submission.files.forEach((f) => {
        const sizeKb = f.size ? (f.size / 1024).toFixed(1) : 'N/A';
        doc.fillColor(textColor).fontSize(9).font('Helvetica').text(`  • ${f.originalname || f.filename} (${sizeKb} KB)`, 50, currentY);
        currentY += 14;
      });
      currentY += 10;
    } else {
      currentY += 10;
    }

    // 6. Customer Notice Box
    doc.rect(40, currentY, 515, 55).fillAndStroke('#eff6ff', '#bfdbfe');
    doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold').text('📌 Important Notice for Customer:', 55, currentY + 10);
    doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica').text(
      'Please keep this official digital receipt for your reference. Mention your Application ID when tracking your status or inquiring via WhatsApp support.',
      55, currentY + 24, { width: 485 }
    );

    // 7. Footer Bar
    const footerY = 730;
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderColor).lineWidth(1).stroke();

    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
      `Generated automatically by ${settings.shopName || 'Cyber Cafe Portal System'} • Timings: ${settings.shopTimings || '9 AM - 8 PM'}`,
      40, footerY + 10, { align: 'center', width: 515 }
    );

    // End PDF stream
    doc.end();

  } catch (error) {
    console.error("PDF Receipt Generation Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate receipt PDF." });
    }
  }
});

/**
 * Helper function to generate PDF document as a complete Buffer instance using PDFKit.
 * Prevents stream piping errors and guarantees valid PDF binary output.
 */
const generatePdfSummaryBuffer = (submission, settings) => {
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      pdfDoc.on('data', chunk => buffers.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(buffers)));
      pdfDoc.on('error', err => reject(err));

      const primaryColor = '#0f172a';   // Slate Dark
      const accentColor = '#2563eb';    // Royal Blue
      const lightBg = '#f8fafc';        // Light Gray Background
      const borderColor = '#cbd5e1';    // Slate Border
      const textColor = '#334155';      // Slate Text

      // Header Banner Box
      pdfDoc.rect(40, 40, 515, 65).fill(primaryColor);
      pdfDoc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text((settings.shopName || 'MAA DURGA JAN SEVA KENDRA').toUpperCase(), 55, 52);
      pdfDoc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('CSC AND ONLINE DIGITAL SERVICES PORTAL', 55, 75);
      pdfDoc.text(`Contact: ${settings.shopPhone || 'N/A'}`, 55, 87);

      // Subheader Badge
      pdfDoc.fillColor(accentColor).fontSize(14).font('Helvetica-Bold').text('CUSTOMER APPLICATION SUMMARY', 40, 120);
      pdfDoc.moveTo(40, 140).lineTo(555, 140).strokeColor(accentColor).lineWidth(2).stroke();

      // Metadata Info
      pdfDoc.fontSize(9).font('Helvetica').fillColor(textColor);
      pdfDoc.text(`Shop Address: ${settings.shopAddress || 'N/A'}`, 40, 150, { width: 280 });

      const formattedDate = new Date(submission.created_at || submission.createdAt || Date.now()).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short'
      });

      pdfDoc.text(`Date and Time: ${formattedDate}`, 320, 150, { align: 'right' });
      pdfDoc.text(`Application ID: ${submission.id}`, 320, 165, { align: 'right' });

      pdfDoc.moveTo(40, 185).lineTo(555, 185).strokeColor(borderColor).lineWidth(1).stroke();

      // Application & Customer Details Box
      const startY = 200;
      pdfDoc.rect(40, startY, 515, 205).fillAndStroke(lightBg, borderColor);

      pdfDoc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text('APPLICATION AND CUSTOMER DETAILS', 55, startY + 12);
      pdfDoc.moveTo(55, startY + 28).lineTo(540, startY + 28).strokeColor(borderColor).lineWidth(1).stroke();

      const drawRow = (label, value, yPos, isStatus = false) => {
        pdfDoc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text(label, 55, yPos);
        if (isStatus) {
          const statusUpper = (value || 'PENDING').toUpperCase();
          let statusColor = '#d97706';
          if (statusUpper === 'COMPLETED') statusColor = '#16a34a';
          if (statusUpper === 'IN-PROGRESS' || statusUpper === 'IN PROGRESS') statusColor = '#2563eb';
          if (statusUpper === 'REJECTED') statusColor = '#dc2626';

          pdfDoc.fillColor(statusColor).font('Helvetica-Bold').fontSize(10).text(statusUpper, 200, yPos);
        } else {
          pdfDoc.fillColor(textColor).font('Helvetica').fontSize(10).text(value || 'N/A', 200, yPos, { width: 330 });
        }
      };

      drawRow('Application ID:', submission.id, startY + 38);
      drawRow('Customer Name:', submission.name || submission.clientName, startY + 58);
      drawRow('Mobile Number:', submission.phone || submission.clientPhone, startY + 78);
      drawRow('Service Category:', submission.service || submission.serviceName, startY + 98);
      drawRow('Application Status:', submission.status, startY + 118, true);
      drawRow('Remarks / Notes:', submission.remarks || submission.notes || 'No additional remarks.', startY + 138);

      const fileCount = (submission.files && Array.isArray(submission.files)) ? submission.files.length : 0;
      drawRow('Uploaded Documents:', `${fileCount} file attachment(s)`, startY + 175);

      // Document List
      let currentY = startY + 220;
      if (fileCount > 0) {
        pdfDoc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('Attached Original Files:', 40, currentY);
        currentY += 15;

        submission.files.forEach((f) => {
          const sizeKb = f.size ? (f.size / 1024).toFixed(1) : 'N/A';
          pdfDoc.fillColor(textColor).fontSize(9).font('Helvetica').text(`  - ${f.originalname || f.filename} (${sizeKb} KB)`, 50, currentY);
          currentY += 14;
        });
        currentY += 10;
      } else {
        currentY += 10;
      }

      // Important Notice Box (PLAIN TEXT ONLY - NO EMOJIS)
      pdfDoc.rect(40, currentY, 515, 55).fillAndStroke('#eff6ff', '#bfdbfe');
      pdfDoc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold').text('Important Notice for Customer:', 55, currentY + 10);
      pdfDoc.fillColor('#1e3a8a').fontSize(9).font('Helvetica').text(
        'Please keep this official digital summary for your records. Quote your Application ID when tracking status or inquiring via shop support or WhatsApp.',
        55, currentY + 24, { width: 485 }
      );

      // Footer
      const footerY = 730;
      pdfDoc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderColor).lineWidth(1).stroke();
      pdfDoc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        `Generated automatically by ${settings.shopName || 'Cyber Cafe Portal System'} - Timings: ${settings.shopTimings || '9 AM - 8 PM'}`,
        40, footerY + 10, { align: 'center', width: 515 }
      );

      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Route: GET /api/admin/submissions/:id/download & GET /api/submissions/:id/download
 * Generates a ZIP archive containing:
 *  1. Customer_Details.pdf (Clean PDF summary generated via PDFKit)
 *  2. original_documents/ (All original uploaded files downloaded from Supabase Storage)
 */
const handleZipDownload = async (req, res) => {
  try {
    const rawId = (req.params.id || '').trim();
    const hyphenatedId = rawId.replace(/\s+/g, '-');

    // Fetch submission record from Supabase
    let data = null;
    let error = null;

    const queryRes = await supabase
      .from('submissions')
      .select('*')
      .or(`id.eq.${rawId},id.eq.${hyphenatedId}`);

    data = queryRes.data;
    error = queryRes.error;

    if (!data || data.length === 0) {
      const allRes = await supabase.from('submissions').select('*').limit(100);
      if (allRes.data && allRes.data.length > 0) {
        const targetNorm = rawId.replace(/[\s\-]/g, '').toLowerCase();
        const found = allRes.data.find(s => (s.id || '').replace(/[\s\-]/g, '').toLowerCase() === targetNorm);
        if (found) data = [found];
      }
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "Submission record not found." });
    }

    const submission = data[0];
    const settings = getSettings();

    // 1. Generate PDF summary buffer
    const pdfBuffer = await generatePdfSummaryBuffer(submission, settings);

    // 2. Set HTTP response headers for ZIP download stream
    const zipFilename = `Submission_${submission.id}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // 3. Initialize archiver instance
    const archive = createZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error("Archive Zip Stream Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Error creating zip package." });
      }
    });

    // Pipe archive directly to HTTP response
    archive.pipe(res);

    // 4. Append PDF summary buffer to archive
    archive.append(pdfBuffer, { name: 'Customer_Details.pdf' });

    // 5. Download and append original customer files from Supabase Storage
    if (submission.files && Array.isArray(submission.files) && submission.files.length > 0) {
      for (const file of submission.files) {
        const filename = file.filename;
        if (filename) {
          try {
            const { data: fileBlob, error: downloadErr } = await supabase
              .storage
              .from('client_documents')
              .download(filename);

            if (!downloadErr && fileBlob) {
              const buffer = Buffer.from(await fileBlob.arrayBuffer());
              const zipPath = 'original_documents/' + (file.originalname || filename);
              archive.append(buffer, { name: zipPath });
            }
          } catch (e) {
            console.error(`Failed to download file ${filename} for zip archive:`, e);
          }
        }
      }
    }

    // Finalize the zip archive stream
    await archive.finalize();

  } catch (error) {
    console.error("Zip Download Route Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate ZIP download package." });
    }
  }
};

app.get('/api/admin/submissions/:id/download', handleZipDownload);
app.get('/api/submissions/:id/download', handleZipDownload);

// Update Settings Endpoint — bcrypt-aware password handling
app.put('/api/settings', checkAdmin, async (req, res) => {
  const newSettings = req.body;
  const currentSettings = getSettings();

  try {
    const updatedSettings = {
      shopName: newSettings.shopName || currentSettings.shopName,
      shopOwner: newSettings.shopOwner || currentSettings.shopOwner,
      shopPhone: newSettings.shopPhone || currentSettings.shopPhone,
      shopEmail: newSettings.shopEmail || currentSettings.shopEmail,
      shopAddress: newSettings.shopAddress || currentSettings.shopAddress,
      shopTimings: newSettings.shopTimings || currentSettings.shopTimings,
      adminPasswordHash: currentSettings.adminPasswordHash || '',
      adminPassword: ''  // always clear plaintext after first migration
    };

    // If admin is setting a new password, hash it before saving
    if (newSettings.adminPassword && newSettings.adminPassword.trim().length >= 6) {
      updatedSettings.adminPasswordHash = await bcrypt.hash(newSettings.adminPassword.trim(), BCRYPT_ROUNDS);
      updatedSettings.adminPassword = ''; // clear legacy field
      console.log('[Security] Admin password updated and stored as bcrypt hash.');
    }

    saveSettings(updatedSettings);
    res.json({ success: true, message: "Settings updated successfully!" });
  } catch (err) {
    console.error('[Settings PUT] Error saving settings:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save settings. Please try again.' });
  }
});

// ── FIX 6 cont.: Global 404 handler ─────────────────────────────────────────
app.use((req, res, next) => {
  // Only send 404 for API routes; let the SPA fallback handle the rest
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found.' });
  }
  next();
});

// Fallback to serve index.html for client-side routing (SPA)
app.get('*', (req, res) => {
  const distPath = path.join(__dirname, 'client', 'dist');
  const publicPath = path.join(__dirname, 'public');
  const frontendPath = fs.existsSync(distPath) ? distPath : publicPath;
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ── FIX 6 cont.: Global Error Handler — never expose stack traces ─────────────
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err.stack || err.message);
  // Handle CORS errors explicitly
  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({ error: err.message });
  }
  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB per file.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum 5 files per submission.' });
  }
  // Generic fallback — never expose internal details
  res.status(err.status || 500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Cyber Cafe Portal running on http://localhost:${PORT}`);
  console.log(`🔒 Security: Helmet + Rate Limiting + CORS Locked`);
  console.log(`🔑 Auth: bcrypt password hashing active`);
  console.log(`⚡ Supabase Integration Active`);
  console.log(`☁️  Storage Bucket: client_documents`);
  console.log(`📊 Database Table: submissions`);
  console.log(`==================================================`);
});
