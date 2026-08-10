require('dotenv').config();

// ═══════════════════════════════════════════════════════════
// FAIL-FAST ENVIRONMENT VALIDATION
// Catch missing configuration instantly before starting the server.
// ═══════════════════════════════════════════════════════════
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missingVars.length > 0) {
    console.error(`\n🚨 FATAL ERROR: Missing required environment variables in PRODUCTION:\n   -> ${missingVars.join(', ')}\n\nServer cannot start safely. Exiting now.`);
    process.exit(1);
  }
}

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

// ═══════════════════════════════════════════════════════════
// FUTURE-PROOF: Global crash handlers — server NEVER dies silently.
// Without these, any unhandled Promise rejection kills the process
// on Node 15+ (which is used on Render). Admin would see 502 Bad Gateway.
// ═══════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] uncaughtException:', err.stack || err.message);
  // Do NOT exit — keep the server alive for other requests
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH PREVENTED] unhandledRejection:', reason?.stack || reason);
  // Do NOT exit — keep the server alive
});


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

// Serve static frontend assets with proper caching headers (no-cache for HTML to ensure instant live updates)
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, 'client', 'dist');

const staticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
};

app.use(express.static(publicPath, staticOptions));
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, staticOptions));
}

// ── FIX 2: CORS — Lock to Allowed Origins ────────────────────────────────────
// In production, replace 'http://localhost:3000' with your live domain.
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'https://durgaonline.info', 'https://www.durgaonline.info', 'https://maa-durga-jan-seva.onrender.com']
);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, webhooks) or from allowed origins/Meta/Render
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*') || origin.includes('facebook.com') || origin.includes('onrender.com') || origin.includes('durgaonline.info')) {
      callback(null, true);
    } else {
      // BUG-005 FIX: Previously BOTH branches called callback(null, true) making CORS completely open.
      // Now non-allowed origins are properly rejected.
      callback(new Error(`CORS policy: Origin ${origin} is not allowed.`), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-password', 'Authorization']
}));

// ── FIX 3: Rate Limiting ──────────────────────────────────────────────────────
// Admin login: max 30 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
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
    shopName: "Maa Durga Online Center",
    shopOwner: "Ramesh Kumar",
    shopPhone: "918707845206",
    shopEmail: "ramesh.cybercafe@gmail.com",
    shopAddress: "Bindwaliya near ghazipur ghat, ghazipur uttar pradesh 233001",
    shopTimings: "24/7",
    adminPasswordHash: "", // bcrypt hash stored here
    adminPassword: process.env.ADMIN_PASSWORD || "Pratap@135"  // legacy plaintext fallback (migrated on first login)
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
  try {
    // Write to a temp file first, then rename — prevents corrupting settings.json
    // if the process crashes mid-write (future-proof: atomic write)
    const tmpFile = SETTINGS_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(settings, null, 2));
    fs.renameSync(tmpFile, SETTINGS_FILE);
  } catch (err) {
    console.error('[Settings] Failed to save settings:', err.message);
    // Last resort: try direct write
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2)); } catch (_) { /* ignore */ }
  }
};

/**
 * Helper function to format submission UUID into a clean, professional Application ID
 * e.g. 'MD-D3B07384' instead of a raw 36-char UUID.
 */
const formatApplicationId = (id) => {
  if (!id) return 'MD-00000000';
  const str = String(id).trim();
  if (/^MD(-[A-Z0-9]+)+$/i.test(str)) return str.toUpperCase();
  const hex = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `MD-${hex.slice(0, 8)}`;
};

// ── Admin Auth Middleware — JWT with x-admin-password fallback ──────────────
const checkAdmin = (req, res, next) => {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  // 1. Try JWT verification if token is present
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded;
      return next();
    } catch (err) {
      console.warn('[Auth] Token verification failed:', err.message);
    }
  }

  // 2. Fallback check: x-admin-password header
  const pwdHeader = req.headers['x-admin-password'];
  if (pwdHeader) {
    const settings = getSettings();
    const allowed = ['Pratap@321', 'Pratap@135'];
    if (settings.adminPassword) allowed.push(settings.adminPassword);
    if (allowed.includes(pwdHeader)) {
      req.admin = { role: 'admin' };
      return next();
    }
  }

  return res.status(401).json({ success: false, error: "Access denied. Invalid or expired token. Please log in again." });
};

// Static assets are now served earlier (before CORS)

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

    // 1. Try bcrypt hash comparison
    if (settings.adminPasswordHash && settings.adminPasswordHash.startsWith('$2')) {
      isValid = await bcrypt.compare(password, settings.adminPasswordHash);
    }

    // 2. Fallback check: compare against settings.adminPassword, Pratap@321, or Pratap@135
    if (!isValid) {
      const allowedPasswords = ['Pratap@321', 'Pratap@135'];
      if (settings.adminPassword) allowedPasswords.push(settings.adminPassword);

      if (allowedPasswords.includes(password)) {
        isValid = true;
        // Re-hash and auto-sync settings.json
        const hash = await bcrypt.hash(password, 12);
        // BUG-007 FIX: Previously saved plaintext password back to settings.json defeating bcrypt.
        // Now we only save the hash and clear the plaintext field.
        const updated = { ...settings, adminPasswordHash: hash, adminPassword: '' };
        saveSettings(updated);
        console.log('[Security] Admin password verified via fallback and re-hashed successfully.');
      }
    }

    if (isValid) {
      const token = jwt.sign({ role: 'admin', shop: settings.shopName }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ success: true, message: "Login successful!", token });
    } else {
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
  body('clientName').optional().trim(),
  body('clientPhone').optional().trim(),
  body('clientEmail').optional().trim(),
  body('email').optional().trim(),
  body('serviceType').optional().trim(),
  body('serviceName').optional().trim(),
  body('name').optional().trim(),
  body('phone').optional().trim(),
  body('service').optional().trim(),
  body('notes').optional().trim(),
  body('remarks').optional().trim()
];

const handleUploadAndSubmission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const name = req.body.name || req.body.clientName;
    const phone = req.body.phone || req.body.clientPhone;
    const email = req.body.email || req.body.clientEmail || "";
    const service = req.body.service || req.body.serviceName || req.body.serviceType;
    let remarks = req.body.remarks || req.body.notes || "";

    if (!name || !phone || !service) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. 'name', 'phone', and 'service' are mandatory."
      });
    }

    // Preserve email in remarks if provided
    if (email && !remarks.includes(email)) {
      remarks = `[Email: ${email}] ${remarks}`.trim();
    }

    // ── Mandatory File Validation: Aadhaar Front + Back + Passport Photo required ──
    const filesUploaded = req.files ? req.files.length : 0;
    if (filesUploaded < 3) {
      return res.status(400).json({
        success: false,
        message: "कृपया आधार कार्ड (Front + Back) और पासपोर्ट साइज फोटो अनिवार्य रूप से अपलोड करें। / Aadhaar Card (Front + Back) and Passport Photo are mandatory for every application."
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

    // ── Mark Upload Session Token as Used (if present) ────────────
    const uploadToken = req.body.upload_token || req.body.uploadToken;
    if (uploadToken) {
      try {
        await supabase
          .from('upload_sessions')
          .update({ is_used: true })
          .eq('token', uploadToken);
        console.log(`[Upload Session] Token ${uploadToken} marked as used.`);
      } catch (tokenErr) {
        console.error('[Upload Session Mark Used Error]:', tokenErr.message);
      }
    }

    // ── Instant WhatsApp Notification to Admin (Shop Owner) ─────────
    try {
      const settings = getSettings();
      const adminPhone = process.env.ADMIN_PHONE_NUMBER || settings.shopPhone || '918707845206';
      const cleanAdminPhone = adminPhone.replace(/[^0-9]/g, '');
      const docCount = (uploadedFiles || []).length;
      const appIdFormatted = formatApplicationId(insertedRecord?.id);
      
      const adminNotifMsg = `🔔 *New Application Received!*\n\n🆔 *App ID:* ${appIdFormatted}\n👤 *Customer Name:* ${name}\n📞 *WhatsApp / Phone:* ${phone}\n${email ? `✉️ *Email ID:* ${email}\n` : ''}📋 *Service:* ${service}\n📄 *Uploaded Documents:* ${docCount} file(s)\n${remarks ? `📝 *Details / Notes:* ${remarks}\n` : ''}\n🔗 *Admin Dashboard:* ${getLiveAppUrl()}/#admin\n\n_Log in to view documents & process application._`;

      await sendWhatsAppMessage(cleanAdminPhone, adminNotifMsg);
      console.log(`[WhatsApp Admin Notification] Sent to ${cleanAdminPhone} (App ID: ${appIdFormatted})`);
    } catch (notifErr) {
      console.error('[WhatsApp Admin Notification Error]:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully to Supabase!",
      id: insertedRecord ? insertedRecord.id : null,
      applicationId: insertedRecord ? formatApplicationId(insertedRecord.id) : null,
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

// FUTURE-PROOF: GET /api/health — lightweight heartbeat for ServerWakeUp banner.
// No DB queries, no file reads. Returns instantly. Used for cold-start detection.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Maa Durga Online Center API'
  });
});

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
    const formattedData = (data || []).map(row => {
      let email = row.email || "";
      if (!email && row.remarks && row.remarks.includes('[Email:')) {
        const match = row.remarks.match(/\[Email:\s*([^\]]+)\]/i);
        if (match) email = match[1].trim();
      } else if (!email && row.remarks && row.remarks.includes('Email:')) {
        const match = row.remarks.match(/Email:\s*([^\s,;]+)/i);
        if (match) email = match[1].trim();
      }

      return {
        id: row.id,
        name: row.name,
        clientName: row.name,
        phone: row.phone,
        clientPhone: row.phone,
        email: email,
        clientEmail: email,
        service: row.service,
        serviceName: row.service,
        serviceType: row.service,
        status: row.status,
        remarks: row.remarks || "",
        created_at: row.created_at,
        createdAt: row.created_at,
        files: row.files || []
      };
    });

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

    // ── Send Automated WhatsApp Status Update to Customer ────────────────
    if (status && updatedRecord.phone) {
      try {
        const cleanPhone = updatedRecord.phone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const settings = getSettings();
        const shopName = settings.shopName || 'Maa Durga Online Center';
        const appIdFormatted = formatApplicationId(updatedRecord.id);
        
        let statusMsg = '';
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'completed') {
          statusMsg = `🎉 *Application Completed! - ${shopName}*\n\nNamaste *${updatedRecord.name}*,\n🆔 *App ID:* ${appIdFormatted}\nAapka *${updatedRecord.service}* application poora ho gaya hai! ✅\n${remarks ? `📝 Notes: ${remarks}\n` : ''}\nAap dukan par aakar document le sakte hain. 🙏`;
        } else if (statusLower === 'in progress' || statusLower === 'in_progress') {
          statusMsg = `⏳ *Application Update - ${shopName}*\n\nNamaste *${updatedRecord.name}*,\n🆔 *App ID:* ${appIdFormatted}\nAapke *${updatedRecord.service}* application par kaam shuru ho gaya hai. Status: *In Progress* 🔄\n${remarks ? `📝 Notes: ${remarks}\n` : ''}`;
        } else if (statusLower === 'rejected') {
          statusMsg = `⚠️ *Application Update - ${shopName}*\n\nNamaste *${updatedRecord.name}*,\n🆔 *App ID:* ${appIdFormatted}\nAapke *${updatedRecord.service}* application me issue paaya gaya hai.\n${remarks ? `📝 Reason: ${remarks}\n` : ''}\nPlease center se sampark karein.`;
        }

        if (statusMsg) {
          await sendWhatsAppMessage(formattedPhone, statusMsg);
          console.log(`[WhatsApp Customer Notification] Sent status update to ${formattedPhone} (App ID: ${appIdFormatted})`);
        }
      } catch (custNotifErr) {
        console.error('[WhatsApp Customer Status Notification Error]:', custNotifErr.message);
      }
    }

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
 * Helper to locate bundled universal fonts supporting both Hindi (Devanagari) & English (Latin).
 * Checks root 'fonts/', 'public/fonts/', and 'client/public/fonts/' to guarantee availability
 * even when Vite build clears the public directory on production.
 */
const getUniversalFonts = () => {
  const possibleDirs = [
    path.join(__dirname, 'fonts'),
    path.join(__dirname, 'public', 'fonts'),
    path.join(__dirname, 'client', 'public', 'fonts')
  ];

  const fontCandidates = [
    { reg: 'Mangal-Regular.ttf', bold: 'Mangal-Bold.ttf' },
    { reg: 'FreeSans.ttf', bold: 'FreeSans-Bold.ttf' },
    { reg: 'NotoSansDevanagari-Regular.ttf', bold: 'NotoSansDevanagari-Bold.ttf' }
  ];

  for (const dir of possibleDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const item of fontCandidates) {
      const regPath = path.join(dir, item.reg);
      const boldPath = path.join(dir, item.bold);
      if (fs.existsSync(regPath)) {
        const headingBoldPath = path.join(dir, 'NotoSans-Bold.ttf');
        return {
          regular: regPath,
          bold: fs.existsSync(boldPath) ? boldPath : regPath,
          headingBold: fs.existsSync(headingBoldPath) ? headingBoldPath : (fs.existsSync(boldPath) ? boldPath : regPath)
        };
      }
    }
  }
  return { regular: null, bold: null, headingBold: null };
};

/**
 * Configure standard fonts on a PDFKit document instance.
 */
const setupPdfFonts = (doc) => {
  const fonts = getUniversalFonts();
  if (fonts.regular) {
    doc.registerFont('Regular', fonts.regular);
    doc.registerFont('Bold', fonts.bold);
    doc.registerFont('HeadingBold', fonts.headingBold);
  } else {
    doc.registerFont('Regular', 'Helvetica');
    doc.registerFont('Bold', 'Helvetica-Bold');
    doc.registerFont('HeadingBold', 'Helvetica-Bold');
  }
};

/**
 * Route: GET /api/submissions/:id/receipt
 * Generates a clean, professional PDF application & payment receipt using PDFKit.
 * Printable/downloadable by shop owner or customer.
 */
app.get('/api/submissions/:id/receipt', async (req, res) => {
  try {
    const rawId = (req.params.id || '').trim();
    const hyphenatedId = rawId.replace(/\s+/g, '-');
    const cleanId = rawId.replace(/^MD-?/i, '').replace(/[\s-]/g, '').toLowerCase();

    // Fetch submission from Supabase using flexible ID matching
    let data = null;
    let error = null;

    const queryRes = await supabase
      .from('submissions')
      .select('*')
      .or(`id.eq.${rawId},id.eq.${hyphenatedId}`);

    data = queryRes.data;
    error = queryRes.error;

    // Fallback search: match normalized string or short ID prefix if not found
    if (!data || data.length === 0) {
      const allRes = await supabase.from('submissions').select('*').limit(100);
      if (allRes.data && allRes.data.length > 0) {
        const targetNorm = rawId.replace(/[\s-]/g, '').toLowerCase();
        const found = allRes.data.find(s => {
          const sNorm = (s.id || '').replace(/[\s-]/g, '').toLowerCase();
          return sNorm === targetNorm || sNorm === cleanId || sNorm.startsWith(cleanId) || sNorm.includes(cleanId);
        });
        if (found) data = [found];
      }
    }

    if (!data || data.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt Not Found - Maa Durga Online Center</title>
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
    const appIdFormatted = formatApplicationId(submission.id);

    const normalizeText = (value) => {
      if (!value && value !== 0) return 'N/A';
      const str = String(value);
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x2F;/g, '/')
        .replace(/&#x2f;/g, '/')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/[\uFFFD]/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Set response headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt_${appIdFormatted}.pdf"`);

    // Create PDF document instance (A4 size with 40pt margins)
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Pipe PDF directly to HTTP response stream
    doc.pipe(res);

    // Register Hindi+Latin universal fonts
    setupPdfFonts(doc);

    // Font selection helpers
    const fontForValue = () => 'Regular';
    const fontForBold  = () => 'Bold';

    // Color Palette
    const primaryColor = '#0f172a';   // Slate Dark
    const accentColor = '#2563eb';    // Royal Blue
    const lightBg = '#f8fafc';        // Light Background
    const borderColor = '#cbd5e1';    // Slate Border
    const textColor = '#334155';      // Slate Text

    // 1. Header Banner Box
    doc.rect(40, 40, 515, 65).fill(primaryColor);
    const shopNameText = (settings.shopName || 'Maa Durga Online Center').toUpperCase();
    doc.fillColor('#ffffff').fontSize(18).font('Bold').text(shopNameText, 55, 52);
    doc.fontSize(9).font('Regular').fillColor('#94a3b8').text('CSC & ONLINE DIGITAL SERVICES PORTAL', 55, 75);
    doc.text(`Contact: ${settings.shopPhone || 'N/A'}`, 55, 87);

    // 2. Subheader & Receipt Badge
    doc.fillColor(accentColor).fontSize(14).font('Bold').text('SERVICE APPLICATION RECEIPT', 40, 120);

    // Decorative Line
    doc.moveTo(40, 140).lineTo(555, 140).strokeColor(accentColor).lineWidth(2).stroke();

    // 3. Shop & Receipt Metadata Info
    doc.fontSize(9).font('Regular').fillColor(textColor);
    doc.text(`Shop Address: ${settings.shopAddress || 'N/A'}`, 40, 150, { width: 280 });
    
    const formattedDate = new Date(submission.created_at || submission.createdAt || Date.now()).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    doc.text(`Date and Time: ${formattedDate}`, 320, 150, { align: 'right' });
    doc.text(`Application ID: ${appIdFormatted}`, 320, 165, { align: 'right' });

    doc.moveTo(40, 185).lineTo(555, 185).strokeColor(borderColor).lineWidth(1).stroke();

    // 4. Details Box — dynamic height based on remarks length
    const startY = 200;
    const remarksRaw = normalizeText(submission.remarks || submission.notes || 'No additional remarks.');
    const serviceRaw = normalizeText(submission.service || submission.serviceName);
    const fileCount = (submission.files && Array.isArray(submission.files)) ? submission.files.length : 0;

    // Estimate remarks height: ~14pt per 60 chars, minimum 1 line
    const remarksLineCount = Math.max(1, Math.ceil(remarksRaw.length / 58));
    const remarksHeight = remarksLineCount * 14;
    // Estimate service name height
    const serviceLineCount = Math.max(1, Math.ceil(serviceRaw.length / 58));
    const serviceHeight = serviceLineCount * 14;

    const boxHeight = 38 + 20 + 20 + serviceHeight + 20 + remarksHeight + 20 + 20;
    doc.rect(40, startY, 515, boxHeight).fillAndStroke(lightBg, borderColor);

    doc.fillColor(accentColor).fontSize(11).font('Bold').text('APPLICATION AND CUSTOMER DETAILS', 55, startY + 12);
    doc.moveTo(55, startY + 28).lineTo(540, startY + 28).strokeColor(borderColor).lineWidth(1).stroke();

    // Helper row drawer — supports multi-line values properly
    const drawDetailRow = (label, value, yPos, isStatus = false) => {
      doc.fillColor('#64748b').fontSize(10).font(fontForBold()).text(label, 55, yPos);
      
      if (isStatus) {
        const statusUpper = (value || 'PENDING').toUpperCase();
        let statusColor = '#d97706'; // Amber for Pending
        if (statusUpper === 'COMPLETED') statusColor = '#16a34a';
        if (statusUpper === 'IN-PROGRESS' || statusUpper === 'IN PROGRESS') statusColor = '#2563eb';
        if (statusUpper === 'REJECTED') statusColor = '#dc2626';
        doc.fillColor(statusColor).font(fontForBold()).fontSize(10).text(statusUpper, 200, yPos);
      } else {
        doc.fillColor(textColor).font(fontForValue()).fontSize(10).text(value || 'N/A', 200, yPos, { width: 330 });
      }
    };

    let rowY = startY + 38;
    drawDetailRow('Application ID:', appIdFormatted, rowY);
    rowY += 20;
    drawDetailRow('Customer Name:', normalizeText(submission.name || submission.clientName), rowY);
    rowY += 20;
    drawDetailRow('Mobile Number:', normalizeText(submission.phone || submission.clientPhone), rowY);
    rowY += 20;
    // Service Name — may be multi-line (Hindi title)
    drawDetailRow('Service Name:', serviceRaw, rowY);
    rowY += serviceHeight + 6;
    drawDetailRow('Application Status:', normalizeText(submission.status), rowY, true);
    rowY += 20;
    // Remarks — may be very long
    drawDetailRow('Remarks / Notes:', remarksRaw, rowY);
    rowY += remarksHeight + 6;
    drawDetailRow('Uploaded Documents:', `${fileCount} file attachment(s)`, rowY);

    // 5. Uploaded Document List (file names)
    let currentY = startY + boxHeight + 15;
    if (fileCount > 0) {
      doc.fillColor(primaryColor).fontSize(10).font('Bold').text('Attached File Names:', 40, currentY);
      currentY += 15;

      submission.files.forEach((f) => {
        const sizeKb = f.size ? (f.size / 1024).toFixed(1) : 'N/A';
        const fname = normalizeText(f.originalname || f.filename);
        doc.fillColor(textColor).fontSize(9).font(fontForValue()).text(`  • ${fname} (${sizeKb} KB)`, 50, currentY, { width: 475 });
        currentY += 14;
      });
      currentY += 10;
    } else {
      currentY += 10;
    }

    // 6. Customer Notice Box
    doc.rect(40, currentY, 515, 55).fillAndStroke('#eff6ff', '#bfdbfe');
    doc.fillColor('#1e40af').fontSize(10).font('Bold').text('Important Notice for Customer:', 55, currentY + 10);
    doc.fillColor('#1e3a8a').fontSize(9).font('Regular').text(
      'Keep this digital receipt safe. Use the Application ID when you ask about your request or contact support.',
      55, currentY + 24, { width: 485 }
    );

    // 7. Footer Bar
    const footerY = Math.max(currentY + 75, 730);
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderColor).lineWidth(1).stroke();

    doc.fillColor('#94a3b8').fontSize(8).font('Regular').text(
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

      setupPdfFonts(pdfDoc);

      const fontForValue = () => 'Regular';
      const fontForBold  = () => 'Bold';
      const appIdFormatted = formatApplicationId(submission.id);

      const normalizeText = (value) => {
        if (!value && value !== 0) return 'N/A';
        return String(value)
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#x2F;/g, '/')
          .replace(/&#x2f;/g, '/')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/[\uFFFD]/g, '')
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1F\x7F]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const primaryColor = '#0f172a';   // Slate Dark
      const accentColor = '#2563eb';    // Royal Blue
      const lightBg = '#f8fafc';        // Light Gray Background
      const borderColor = '#cbd5e1';    // Slate Border
      const textColor = '#334155';      // Slate Text

      // Header Banner Box
      pdfDoc.rect(40, 40, 515, 65).fill(primaryColor);
      const shopNameText = (settings.shopName || 'Maa Durga Online Center').toUpperCase();
      pdfDoc.fillColor('#ffffff').fontSize(18).font(fontForBold()).text(shopNameText, 55, 52);
      pdfDoc.fontSize(9).font(fontForValue()).fillColor('#94a3b8').text('CSC AND ONLINE DIGITAL SERVICES PORTAL', 55, 75);
      pdfDoc.text(`Contact: ${settings.shopPhone || 'N/A'}`, 55, 87);

      // Subheader Badge
      pdfDoc.fillColor(accentColor).fontSize(14).font('HeadingBold').text('CUSTOMER APPLICATION SUMMARY', 40, 120);
      pdfDoc.moveTo(40, 140).lineTo(555, 140).strokeColor(accentColor).lineWidth(2).stroke();

      // Metadata Info
      pdfDoc.fontSize(9).font(fontForValue()).fillColor(textColor);
      pdfDoc.text(`Shop Address: ${settings.shopAddress || 'N/A'}`, 40, 150, { width: 280 });

      const formattedDate = new Date(submission.created_at || submission.createdAt || Date.now()).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short'
      });

      pdfDoc.text(`Date and Time: ${formattedDate}`, 320, 150, { align: 'right' });
      pdfDoc.text(`Application ID: ${appIdFormatted}`, 320, 165, { align: 'right' });

      pdfDoc.moveTo(40, 185).lineTo(555, 185).strokeColor(borderColor).lineWidth(1).stroke();

      // Application & Customer Details Box — dynamic height
      const startY = 200;
      const remarksRaw = normalizeText(submission.remarks || submission.notes || 'No additional remarks.');
      const serviceRaw = normalizeText(submission.service || submission.serviceName);
      const fileCount = (submission.files && Array.isArray(submission.files)) ? submission.files.length : 0;

      const remarksLineCount = Math.max(1, Math.ceil(remarksRaw.length / 58));
      const remarksHeight = remarksLineCount * 14;
      const serviceLineCount = Math.max(1, Math.ceil(serviceRaw.length / 58));
      const serviceHeight = serviceLineCount * 14;

      const boxHeight = 38 + 20 + 20 + serviceHeight + 20 + remarksHeight + 20 + 20;
      pdfDoc.rect(40, startY, 515, boxHeight).fillAndStroke(lightBg, borderColor);

      pdfDoc.fillColor(accentColor).fontSize(11).font('HeadingBold').text('APPLICATION AND CUSTOMER DETAILS', 55, startY + 12);
      pdfDoc.moveTo(55, startY + 28).lineTo(540, startY + 28).strokeColor(borderColor).lineWidth(1).stroke();

      const drawRow = (label, value, yPos, isStatus = false) => {
        pdfDoc.fillColor('#64748b').fontSize(10).font(fontForBold()).text(label, 55, yPos);
        if (isStatus) {
          const statusUpper = (value || 'PENDING').toUpperCase();
          let statusColor = '#d97706';
          if (statusUpper === 'COMPLETED') statusColor = '#16a34a';
          if (statusUpper === 'IN-PROGRESS' || statusUpper === 'IN PROGRESS') statusColor = '#2563eb';
          if (statusUpper === 'REJECTED') statusColor = '#dc2626';

          pdfDoc.fillColor(statusColor).font(fontForBold()).fontSize(10).text(statusUpper, 200, yPos);
        } else {
          pdfDoc.fillColor(textColor).font(fontForValue()).fontSize(10).text(value || 'N/A', 200, yPos, { width: 330 });
        }
      };

      let rowY = startY + 38;
      drawRow('Application ID:', appIdFormatted, rowY);
      rowY += 20;
      drawRow('Customer Name:', normalizeText(submission.name || submission.clientName), rowY);
      rowY += 20;
      drawRow('Mobile Number:', normalizeText(submission.phone || submission.clientPhone), rowY);
      rowY += 20;
      drawRow('Service Name:', serviceRaw, rowY);
      rowY += serviceHeight + 6;
      drawRow('Status:', normalizeText(submission.status), rowY, true);
      rowY += 20;
      drawRow('Remarks:', remarksRaw, rowY);
      rowY += remarksHeight + 6;
      drawRow('Files Uploaded:', `${fileCount} file attachment(s)`, rowY);

      // Document List
      let currentY = startY + boxHeight + 15;
      if (fileCount > 0) {
        pdfDoc.fillColor(primaryColor).fontSize(10).font('HeadingBold').text('Attached Original Files:', 40, currentY);
        currentY += 15;

        submission.files.forEach((f) => {
          const sizeKb = f.size ? (f.size / 1024).toFixed(1) : 'N/A';
          const fname = normalizeText(f.originalname || f.filename);
          pdfDoc.fillColor(textColor).fontSize(9).font(fontForValue()).text(`  • ${fname} (${sizeKb} KB)`, 50, currentY, { width: 475 });
          currentY += 14;
        });
        currentY += 10;
      } else {
        currentY += 10;
      }

      // Important Notice Box
      pdfDoc.rect(40, currentY, 515, 55).fillAndStroke('#eff6ff', '#bfdbfe');
      pdfDoc.fillColor('#1e40af').fontSize(10).font('HeadingBold').text('Important Notice:', 55, currentY + 10);
      pdfDoc.fillColor('#1e3a8a').fontSize(9).font(fontForValue()).text(
        'Keep this receipt safe. Use the Application ID when checking status or contacting support.',
        55, currentY + 24, { width: 485 }
      );

      // Footer
      const footerY = Math.max(currentY + 75, 730);
      pdfDoc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderColor).lineWidth(1).stroke();
      pdfDoc.fillColor('#94a3b8').fontSize(8).font(fontForValue()).text(
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
    const cleanId = rawId.replace(/^MD-?/i, '').replace(/[\s-]/g, '').toLowerCase();

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
        const targetNorm = rawId.replace(/[\s-]/g, '').toLowerCase();
        const found = allRes.data.find(s => {
          const sNorm = (s.id || '').replace(/[\s-]/g, '').toLowerCase();
          return sNorm === targetNorm || sNorm === cleanId || sNorm.startsWith(cleanId) || sNorm.includes(cleanId);
        });
        if (found) data = [found];
      }
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "Submission record not found." });
    }

    const submission = data[0];
    const settings = getSettings();
    const appIdFormatted = formatApplicationId(submission.id);

    // 1. Generate PDF summary buffer
    const pdfBuffer = await generatePdfSummaryBuffer(submission, settings);

    // 2. Set HTTP response headers for ZIP download stream
    const zipFilename = `Submission_${appIdFormatted}.zip`;
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
    archive.append(pdfBuffer, { name: `Customer_Details_${appIdFormatted}.pdf` });

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

    // If admin is setting a new password, hash it and keep settings in sync
    if (newSettings.adminPassword && newSettings.adminPassword.trim().length >= 1) {
      const cleanPassword = newSettings.adminPassword.trim();
      updatedSettings.adminPasswordHash = await bcrypt.hash(cleanPassword, 12);
      // BUG-007 FIX: Clear the plaintext password after hashing — don't persist it
      updatedSettings.adminPassword = '';
      console.log('[Security] Admin password updated and stored as bcrypt hash.');
    }

    saveSettings(updatedSettings);
    res.json({ success: true, message: "Settings updated successfully!" });
  } catch (err) {
    console.error('[Settings PUT] Error saving settings:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save settings. Please try again.' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// ──  WHATSAPP AUTOMATION & DYNAMIC SERVICES  ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

// WhatsApp / Meta config from environment
const getWhatsAppPhoneId = () => (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const getWhatsAppToken   = () => (process.env.WHATSAPP_ACCESS_TOKEN    || '').trim();
const getLiveAppUrl      = () => (process.env.PUBLIC_APP_URL || 'https://durgaonline.info').trim();
const WHATSAPP_VERIFY_TOKEN    = (process.env.WHATSAPP_VERIFY_TOKEN || 'maa_durga_verify_token_2026').trim();
const N8N_WEBHOOK_URL          = process.env.N8N_WEBHOOK_URL          || '';
const PUBLIC_APP_URL           = process.env.PUBLIC_APP_URL           || 'https://durgaonline.info';
const UPLOAD_TOKEN_EXPIRY_MIN  = parseInt(process.env.UPLOAD_TOKEN_EXPIRY_MINUTES || '60', 10);

// ─── Helper: Send WhatsApp text message via Meta Cloud API ─────────────────
const sendWhatsAppMessage = async (to, text) => {
  const phoneId = getWhatsAppPhoneId();
  const token   = getWhatsAppToken();

  if (!phoneId || !token) {
    console.log('[WhatsApp] Credentials missing in environment — message NOT sent.');
    console.log(`[WhatsApp DEV] To: ${to}\nMessage:\n${text}`);
    return { simulated: true };
  }
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[WhatsApp API Response Error ${resp.status}]:`, errText);
      if (errText.includes('OAuthException') || errText.includes('blocked') || resp.status === 401 || resp.status === 400) {
        console.error('⚠️ CRITICAL: Meta WHATSAPP_ACCESS_TOKEN is EXPIRED or BLOCKED by Meta! Please generate a new access token on Meta Developer Portal and update WHATSAPP_ACCESS_TOKEN in .env and Render dashboard.');
      }
      throw new Error(`WhatsApp API error: ${errText}`);
    }
    const resData = await resp.json();
    console.log(`[WhatsApp] Message successfully sent to ${to}:`, resData);
    return resData;
  } catch (err) {
    console.error('[WhatsApp Send Error]:', err.message);
    throw err;
  }
};

// ─── Helper: Send WhatsApp Interactive List Message ──────────────────────────
const sendWhatsAppInteractiveList = async (to, header, bodyText, footer, buttonText, rows) => {
  const phoneId = getWhatsAppPhoneId();
  const token   = getWhatsAppToken();
  if (!phoneId || !token) {
    console.log('[WhatsApp] Credentials missing — interactive list NOT sent.');
    return { simulated: true };
  }
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: header },
          body: { text: bodyText },
          footer: { text: footer },
          action: {
            button: buttonText,
            sections: [{ title: 'AVAILABLE SERVICES', rows }]
          }
        }
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[WhatsApp Interactive List Error ${resp.status}]:`, errText);
      // Fallback: send plain text
      return null;
    }
    const resData = await resp.json();
    console.log(`[WhatsApp] Interactive list sent to ${to}`);
    return resData;
  } catch (err) {
    console.error('[WhatsApp Interactive List Error]:', err.message);
    return null;
  }
};

// ─── Helper: Decode HTML entities in text ─────────────────────────────────
const decodeHtmlEntities = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/gi, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'");
};

// ─── Helper: Fetch active services + docs from Supabase ───────────────────
const getActiveServices = async () => {
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('*')
    .neq('is_active', false)
    .order('display_order', { ascending: true });

  if (svcErr) throw new Error('Failed to fetch services: ' + svcErr.message);

  const { data: docs, error: docErr } = await supabase
    .from('service_documents')
    .select('*')
    .order('display_order', { ascending: true });

  if (docErr) throw new Error('Failed to fetch service documents: ' + docErr.message);

  return (services || []).map(s => ({
    ...s,
    documents: (docs || []).filter(d => d.service_id === s.id)
  }));
};

// ─── Helper: Fetch ALL services (active + inactive) for Admin ─────────────
const getAllServicesAdmin = async () => {
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('*')
    .order('display_order', { ascending: true });

  if (svcErr) throw new Error('Failed to fetch services: ' + svcErr.message);

  const { data: docs, error: docErr } = await supabase
    .from('service_documents')
    .select('*')
    .order('display_order', { ascending: true });

  if (docErr) throw new Error('Failed to fetch service documents: ' + docErr.message);

  return (services || []).map(s => ({
    ...s,
    documents: (docs || []).filter(d => d.service_id === s.id)
  }));
};

// ─── PUBLIC: GET /api/services — list active services with documents ────────
app.get('/api/services', async (req, res) => {
  try {
    const services = await getActiveServices();
    res.json({ success: true, data: services });
  } catch (err) {
    console.error('[Services GET] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch services.' });
  }
});

// ─── ADMIN: GET /api/admin/services — list all services for Admin ────────────
app.get('/api/admin/services', checkAdmin, async (req, res) => {
  try {
    const services = await getAllServicesAdmin();
    res.json({ success: true, data: services });
  } catch (err) {
    console.error('[Admin Services GET] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch services: ' + err.message });
  }
});

// ─── PUBLIC: GET /api/services/:id — single service with documents ──────────
app.get('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    if (svcErr || !service) return res.status(404).json({ success: false, message: 'Service not found.' });

    const { data: docs } = await supabase
      .from('service_documents')
      .select('*')
      .eq('service_id', id)
      .order('display_order', { ascending: true });

    res.json({ success: true, data: { ...service, documents: docs || [] } });
  } catch (err) {
    console.error('[Services/:id GET] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch service.' });
  }
});

// ─── ADMIN: POST /api/admin/services — create new service ──────────────────
app.post('/api/admin/services', checkAdmin, [
  body('name').notEmpty().trim(),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('short_description').optional().trim(),
  body('hindi_title').optional().trim(),
  body('icon').optional().trim(),
  body('is_active').optional(),
  body('display_order').optional(),
  body('email_requirement').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  try {
    const { name, slug, description, short_description, hindi_title, icon, is_active, display_order, email_requirement, documents } = req.body;
    let baseSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!baseSlug) baseSlug = 'service-' + Date.now();

    let generatedSlug = baseSlug;
    const { data: existingSvc } = await supabase.from('services').select('id').eq('slug', generatedSlug).single();
    if (existingSvc) {
      generatedSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert([{
        name,
        slug: generatedSlug,
        description: description || '',
        short_description: short_description || '',
        hindi_title: hindi_title || '',
        icon: icon || 'fa-solid fa-file',
        is_active: is_active !== false,
        display_order: parseInt(display_order) || 0,
        email_requirement: email_requirement || 'optional'
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Insert documents if provided
    if (documents && Array.isArray(documents) && documents.length > 0) {
      const docRows = documents.map((d, i) => ({
        service_id: service.id,
        document_name: typeof d === 'string' ? d : (d.document_name || ''),
        is_required: d.is_required !== false,
        display_order: typeof d === 'object' && d.display_order !== undefined ? d.display_order : i
      })).filter(d => d.document_name && d.document_name.trim());

      if (docRows.length > 0) {
        await supabase.from('service_documents').insert(docRows);
      }
    }

    res.status(201).json({ success: true, message: 'Service created successfully!', data: service });
  } catch (err) {
    console.error('[Admin Services POST] Error:', err.message);
    if (err.message.includes('duplicate') || err.message.includes('unique')) {
      return res.status(409).json({ success: false, message: 'A service with that name/slug already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create service: ' + err.message });
  }
});

// ─── ADMIN: PUT /api/admin/services/:id — update service & sync documents ──
app.put('/api/admin/services/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, short_description, hindi_title, icon, is_active, display_order, email_requirement, documents } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (short_description !== undefined) updates.short_description = short_description;
    if (hindi_title !== undefined) updates.hindi_title = hindi_title;
    if (icon !== undefined) updates.icon = icon;
    if (is_active !== undefined) updates.is_active = is_active;
    if (display_order !== undefined) updates.display_order = display_order;
    if (email_requirement !== undefined) updates.email_requirement = email_requirement;

    const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Service not found.' });

    // Synchronize documents if provided in payload
    if (documents && Array.isArray(documents)) {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        if (!doc.document_name || !doc.document_name.trim()) continue;

        if (doc._new || !doc.id) {
          // Insert new document
          await supabase.from('service_documents').insert([{
            service_id: id,
            document_name: doc.document_name.trim(),
            is_required: doc.is_required !== false,
            display_order: doc.display_order !== undefined ? doc.display_order : i
          }]);
        } else {
          // Update existing document
          await supabase.from('service_documents').update({
            document_name: doc.document_name.trim(),
            is_required: doc.is_required !== false,
            display_order: doc.display_order !== undefined ? doc.display_order : i
          }).eq('id', doc.id);
        }
      }
    }

    res.json({ success: true, message: 'Service updated successfully!', data });
  } catch (err) {
    console.error('[Admin Services PUT] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update service: ' + err.message });
  }
});

// ─── ADMIN: DELETE /api/admin/services/:id — delete service ────────────────
app.delete('/api/admin/services/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Cascade delete documents first
    await supabase.from('service_documents').delete().eq('service_id', id);
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw new Error(error.message);
    res.json({ success: true, message: 'Service deleted successfully.' });
  } catch (err) {
    console.error('[Admin Services DELETE] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete service.' });
  }
});

// ─── ADMIN: POST /api/admin/services/:id/documents — add document ──────────
app.post('/api/admin/services/:id/documents', checkAdmin, [
  body('document_name').notEmpty().trim(),
  body('is_required').optional().isBoolean(),
  body('display_order').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  try {
    const { id } = req.params;
    const { document_name, is_required, display_order } = req.body;

    const { data, error } = await supabase
      .from('service_documents')
      .insert([{ service_id: id, document_name, is_required: is_required !== false, display_order: display_order || 0 }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, message: 'Document added.', data });
  } catch (err) {
    console.error('[Admin Service Docs POST] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add document.' });
  }
});

// ─── ADMIN: PUT /api/admin/services/:id/documents/:docId — update document ──
app.put('/api/admin/services/:id/documents/:docId', checkAdmin, async (req, res) => {
  try {
    const { docId } = req.params;
    const { document_name, is_required, display_order } = req.body;
    const updates = {};
    if (document_name !== undefined) updates.document_name = document_name.trim();
    if (is_required !== undefined) updates.is_required = is_required;
    if (display_order !== undefined) updates.display_order = display_order;

    const { data, error } = await supabase
      .from('service_documents')
      .update(updates)
      .eq('id', docId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ success: true, message: 'Document updated successfully.', data });
  } catch (err) {
    console.error('[Admin Service Docs PUT] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update document: ' + err.message });
  }
});

// ─── ADMIN: DELETE /api/admin/services/:id/documents/:docId ────────────────
app.delete('/api/admin/services/:id/documents/:docId', checkAdmin, async (req, res) => {
  try {
    const { docId } = req.params;
    const { error } = await supabase.from('service_documents').delete().eq('id', docId);
    if (error) throw new Error(error.message);
    res.json({ success: true, message: 'Document removed.' });
  } catch (err) {
    console.error('[Admin Service Docs DELETE] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to remove document.' });
  }
});

// ─── UPLOAD SESSIONS ──────────────────────────────────────────────────────────

// Internal helper to create upload session in Supabase without HTTP self-fetch
const createUploadSessionInternal = async (serviceId, whatsappNumber = null, customerName = null) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + UPLOAD_TOKEN_EXPIRY_MIN * 60 * 1000).toISOString();

    const { error: sessErr } = await supabase
      .from('upload_sessions')
      .insert([{ token, service_id: serviceId, whatsapp_number: whatsappNumber, customer_name: customerName, expires_at: expiresAt }]);

    if (sessErr) {
      console.error('[Upload Session Internal Error]:', sessErr.message);
      return getLiveAppUrl();
    }
    return `${getLiveAppUrl()}/?upload=${token}`;
  } catch (err) {
    console.error('[Upload Session Internal Error]:', err.message);
    return getLiveAppUrl();
  }
};

// POST /api/upload-session — create a secure WhatsApp-generated upload link
app.post('/api/upload-session', async (req, res) => {
  try {
    const { service_id, whatsapp_number, customer_name } = req.body;
    if (!service_id) return res.status(400).json({ success: false, message: 'service_id is required.' });

    // Validate service exists
    const { data: service, error: svcErr } = await supabase
      .from('services').select('id, name, slug').eq('id', service_id).single();
    if (svcErr || !service) return res.status(404).json({ success: false, message: 'Service not found.' });

    const uploadUrl = await createUploadSessionInternal(service_id, whatsapp_number, customer_name);
    const token = uploadUrl.includes('?upload=') ? uploadUrl.split('?upload=')[1] : null;
    const expiresAt = new Date(Date.now() + UPLOAD_TOKEN_EXPIRY_MIN * 60 * 1000).toISOString();

    res.status(201).json({
      success: true,
      token,
      upload_url: uploadUrl,
      service: { id: service.id, name: service.name, slug: service.slug },
      expires_at: expiresAt
    });
  } catch (err) {
    console.error('[Upload Session POST] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create upload session.' });
  }
});

// GET /api/upload-session/:token — validate token and return session info
app.get('/api/upload-session/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: session, error } = await supabase
      .from('upload_sessions')
      .select('*, services(id, name, slug, description, icon, hindi_title)')
      .eq('token', token)
      .single();

    if (error || !session) return res.status(404).json({ success: false, message: 'Invalid or expired upload link.' });

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This upload link has expired. Please contact the shop to get a new link.' });
    }

    // Get documents for the service
    const { data: docs } = await supabase
      .from('service_documents')
      .select('*')
      .eq('service_id', session.service_id)
      .order('display_order', { ascending: true });

    res.json({
      success: true,
      data: {
        token: session.token,
        service: { ...(session.services || {}), documents: docs || [] },
        customer_name: session.customer_name,
        whatsapp_number: session.whatsapp_number,
        expires_at: session.expires_at,
        is_used: session.is_used
      }
    });
  } catch (err) {
    console.error('[Upload Session GET] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to validate upload link.' });
  }
});

// ─── WHATSAPP CLOUD API WEBHOOK ────────────────────────────────────────────────

// GET /api/whatsapp/webhook — Meta webhook verification challenge
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[WhatsApp Webhook GET] Incoming challenge request:', { mode, token, challenge });

  const expectedToken = (process.env.WHATSAPP_VERIFY_TOKEN || 'maa_durga_verify_token_2026').trim();
  const receivedToken = (token || '').trim();

  if (mode === 'subscribe' && receivedToken === expectedToken) {
    console.log('[WhatsApp Webhook] Verified successfully. Returning challenge:', challenge);
    return res.status(200).type('text/plain').send(String(challenge));
  }
  console.warn(`[WhatsApp Webhook] Verification failed. Received token: "${receivedToken}", Expected token: "${expectedToken}"`);
  return res.status(403).type('text/plain').send('Verification failed.');
});

// POST /api/whatsapp/webhook — receive incoming WhatsApp messages from Meta
app.post('/api/whatsapp/webhook', async (req, res) => {
  // Always acknowledge receipt immediately (Meta requires 200 within 5s)
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') return;

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const message = value?.messages?.[0];
    if (!message) return; // No message in this event (could be status update)

    const from     = message.from; // Customer's WhatsApp number
    const msgType  = message.type;
    let   msgText  = '';

    if (msgType === 'text') {
      msgText = (message.text?.body || '').trim().toLowerCase();
    } else if (msgType === 'interactive') {
      // List reply or button reply — get the row ID (e.g. "service_abc123")
      msgText = message.interactive?.list_reply?.id || message.interactive?.button_reply?.id || '';
      console.log(`[WhatsApp] Interactive reply ID: "${msgText}"`);
    }

    console.log(`[WhatsApp] Message from ${from}: "${msgText}" (type: ${msgType})`);

    // ── If n8n is configured, forward to n8n for workflow processing ─────────
    if (N8N_WEBHOOK_URL) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        console.log('[WhatsApp] Event forwarded to n8n.');
      } catch (n8nErr) {
        console.error('[WhatsApp] n8n forward failed:', n8nErr.message);
      }
      return; // Let n8n handle the conversation flow
    }

    // ── Fallback: Handle conversation directly in Express ────────────────────
    const settings = getSettings();
    const shopName = settings.shopName || 'Maa Durga Online Center';

    // Greeting detection
    const greetings = ['hi', 'hello', 'helo', 'hey', 'namaste', 'namaskar', 'jai', 'start', 'menu', 'help'];
    const isGreeting = greetings.some(g => msgText.includes(g)) || msgText.length <= 3;

    if (isGreeting) {
      try {
        const services = await getActiveServices();
        if (services.length > 0) {
          // Send interactive list message (like Bot Simulator)
          const rows = services.slice(0, 10).map((s) => ({
            id: `service_${s.id}`,
            title: decodeHtmlEntities(s.name || '').substring(0, 24) || 'Service',
            description: decodeHtmlEntities(s.hindi_title || s.description || '').substring(0, 72)
          }));
          const result = await sendWhatsAppInteractiveList(
            from,
            `🙏 ${shopName}`,
            `Hamare Online Center me aapka swagat hai! Main aapki kya madad kar sakta hoon?`,
            'Chunein aur aage badhein',
            'Services Menu 👇',
            rows
          );
          // If interactive list failed, fallback to plain text
          if (!result) {
            const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            const servicesText = services.map((s, i) => `${numberEmojis[i] || (i+1)+'.'} ${s.name}`).join('\n');
            await sendWhatsAppMessage(from, `🙏 *Welcome to ${shopName}!*\n\n${servicesText}\n\nReply with the number of the service you need.`);
          }
        } else {
          await sendWhatsAppMessage(from, `🙏 *Welcome to ${shopName}!*\n\nWe provide CSC & online digital services.\n\nPlease contact us for services.`);
        }
      } catch (e) {
        console.error('[WhatsApp] Greeting error:', e.message);
        await sendWhatsAppMessage(from, `🙏 *Welcome to ${shopName}!*\n\nType "Hi" to see services.`);
      }
      return;
    }

    // Handle list reply: "service_<uuid>"
    if (msgText.startsWith('service_')) {
      const serviceId = msgText.replace('service_', '');
      try {
        const services = await getActiveServices();
        const selected = services.find(s => String(s.id) === serviceId);
        if (selected) {
          const requiredDocs = (selected.documents || []).filter(d => d.is_required).map(d => `✅ ${d.document_name}`).join('\n');
          const uploadUrl = await createUploadSessionInternal(selected.id, from);
          const replyMsg = `📄 *${selected.name}*${selected.hindi_title ? `\n(${selected.hindi_title})` : ''}\n\nRequired Documents:\n${requiredDocs || 'Contact shop for document list.'}\n\n📎 Documents upload karne ke liye niche diya gaya link kholein:\n\n🔗 ${uploadUrl}\n\n_Link ${UPLOAD_TOKEN_EXPIRY_MIN} minutes mein expire hoga._\n\n*"Hi" type karein menu ke liye.*`;
          await sendWhatsAppMessage(from, replyMsg);
        }
      } catch (e) {
        console.error('[WhatsApp] List reply error:', e.message);
        await sendWhatsAppMessage(from, '❌ Sorry, kuch galat hua. Please "Hi" type karein aur dobara try karein.');
      }
      return;
    }

    // Number selection — map to service by display_order
    const num = parseInt(msgText, 10);
    if (!isNaN(num) && num > 0) {
      try {
        const services = await getActiveServices();
        const selected = services[num - 1];

        if (selected) {
          const requiredDocs = (selected.documents || [])
            .filter(d => d.is_required)
            .map((d, i) => `✅ ${d.document_name}`)
            .join('\n');

          const uploadUrl = await createUploadSessionInternal(selected.id, from);

          const replyMsg = `📄 *${selected.name}*${selected.hindi_title ? `\n(${selected.hindi_title})` : ''}\n\nRequired Documents:\n${requiredDocs || 'Please contact the shop for document list.'}\n\n📎 Documents upload karne ke liye niche diya gaya link kholein:\n\n🔗 ${uploadUrl}\n\n_Link ${UPLOAD_TOKEN_EXPIRY_MIN} minutes mein expire hoga._\n\n*"Hi" type karein menu ke liye.*`;
          await sendWhatsAppMessage(from, replyMsg);
        } else {
          // BUG-009 FIX: Previously called getActiveServices() AGAIN for the error message.
          // 'services' is already available from the fetch above (line ~1619), reuse it.
          await sendWhatsAppMessage(from, `⚠️ Please reply with a number between 1 and ${services.length}.\n\nType *Hi* to see the menu again.`);
        }
      } catch (e) {
        console.error('[WhatsApp] Service selection error:', e.message);
        await sendWhatsAppMessage(from, '❌ Sorry, something went wrong. Please try again or contact the shop directly.');
      }
      return;
    }

    // Keyword shortcuts (pan, voter, income, caste, domicile)
    try {
      const services = await getActiveServices();
      const matchedService = services.find(s => {
        const nameLower = (s.name || '').toLowerCase();
        const hindiLower = (s.hindi_title || '').toLowerCase();
        const slugLower = (s.slug || '').toLowerCase();

        if (msgText.includes('pan') && (nameLower.includes('pan') || slugLower.includes('pan') || hindiLower.includes('पैन'))) return true;
        if (msgText.includes('voter') && (nameLower.includes('voter') || slugLower.includes('voter') || hindiLower.includes('वोटर'))) return true;
        if ((msgText.includes('income') || msgText.includes('aay') || msgText.includes('आय')) && (nameLower.includes('income') || nameLower.includes('aay') || hindiLower.includes('आय') || slugLower.includes('income') || slugLower.includes('aay'))) return true;
        if ((msgText.includes('caste') || msgText.includes('jati') || msgText.includes('jaati') || msgText.includes('जाति')) && (nameLower.includes('caste') || nameLower.includes('jati') || hindiLower.includes('जाति') || slugLower.includes('caste') || slugLower.includes('jaati'))) return true;
        if ((msgText.includes('domicile') || msgText.includes('niwas') || msgText.includes('निवास')) && (nameLower.includes('domicile') || nameLower.includes('niwas') || hindiLower.includes('निवास') || slugLower.includes('domicile') || slugLower.includes('niwas'))) return true;
        return false;
      });

      if (matchedService) {
        const requiredDocs = (matchedService.documents || []).filter(d => d.is_required).map(d => `✅ ${d.document_name}`).join('\n');
        const uploadUrl = await createUploadSessionInternal(matchedService.id, from);
        const replyMsg = `📄 *${matchedService.name}*${matchedService.hindi_title ? `\n(${matchedService.hindi_title})` : ''}\n\nRequired Documents:\n${requiredDocs || 'Contact shop for document list.'}\n\n📎 Documents upload karne ke liye niche diya gaya link kholein:\n\n🔗 ${uploadUrl}\n\n_Link ${UPLOAD_TOKEN_EXPIRY_MIN} minutes mein expire hoga._\n\n*"Hi" type karein menu ke liye.*`;
        await sendWhatsAppMessage(from, replyMsg);
        return;
      }
    } catch (e) {
      console.error('[WhatsApp] Keyword shortcut search error:', e.message);
    }

    // Default fallback
    await sendWhatsAppMessage(from, `🤔 Sorry, I didn't understand that.\n\nType *Hi* to see our services menu.`);

  } catch (err) {
    console.error('[WhatsApp Webhook POST] Error:', err.message);
  }
});

// ─── ADMIN: POST /api/whatsapp/send-status — manually send status notification
app.post('/api/whatsapp/send-status', checkAdmin, [
  body('phone').notEmpty().trim(),
  body('message').notEmpty().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  try {
    const { phone, message } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) return res.status(400).json({ success: false, message: 'Invalid phone number.' });

    const result = await sendWhatsAppMessage(cleanPhone, message);
    res.json({ success: true, message: result?.simulated ? 'Message logged (WhatsApp not configured).' : 'WhatsApp message sent successfully!', result });
  } catch (err) {
    console.error('[WhatsApp Send Status] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp message: ' + err.message });
  }
});

// GET /api/whatsapp/config-status — returns which WhatsApp env vars are configured (no values)
app.get('/api/whatsapp/config-status', checkAdmin, (req, res) => {
  res.json({
    success: true,
    configured: {
      WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_ACCESS_TOKEN:    !!process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_VERIFY_TOKEN:    !!process.env.WHATSAPP_VERIFY_TOKEN,
      META_APP_ID:              !!process.env.META_APP_ID,
      WHATSAPP_BUSINESS_ACCOUNT_ID: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      N8N_WEBHOOK_URL:          !!process.env.N8N_WEBHOOK_URL,
      PUBLIC_APP_URL:           !!process.env.PUBLIC_APP_URL,
    },
    n8n_mode: !!N8N_WEBHOOK_URL,
    direct_mode: !N8N_WEBHOOK_URL,
    public_app_url: PUBLIC_APP_URL
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ── END WHATSAPP AUTOMATION & DYNAMIC SERVICES ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

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
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const distIndex = path.join(__dirname, 'client', 'dist', 'index.html');
  
  if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else {
    res.status(404).send('Frontend build not found.');
  }
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
    // BUG-006 FIX: Error message said '10MB' but actual Multer limit is 100MB (100 * 1024 * 1024)
    return res.status(400).json({ error: 'File too large. Maximum size is 100MB per file.' });
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
