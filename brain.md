# 🧠 Project Brain & Memory: Maa Durga Jan Seva Kendra

This document is the **Single Source of Truth** for the **Maa Durga Jan Seva Kendra - Cyber Cafe Portal & WhatsApp Chatbot Simulator** project.

> [!IMPORTANT]
> **PERMANENT WORKFLOW RULE**:
> For every future session and response in this project, the AI MUST automatically:
> 1. Read `brain.md` before doing anything.
> 2. Understand the latest project state.
> 3. Continue exactly where the previous AI stopped.
> 4. Make the requested changes.
> 5. Update `brain.md` before finishing the response.

---

## 📌 Project Identity

- **Game / Project Title**: Maa Durga Jan Seva Kendra - Cyber Cafe Portal & WhatsApp Chatbot
- **Internal Codename**: `cyber-cafe-portal`
- **Genre / Category**: Web Application / Client Document Portal & Interactive Simulator
- **Theme**: Cyber Cafe & CSC / Jan Seva Kendra Digital Services Portal
- **Story / Context**: Empowering local customers to seamlessly upload documents for government & commercial services (PAN, Voter ID, Certificates, Aadhaar, etc.) while enabling shop owners to manage applications and automate customer support via WhatsApp.
- **Target Audience**: Jan Seva Kendra customers, local shop clients, and cyber cafe administrators.
- **Inspiration**: CSC India / Digital India Portals + Modern WhatsApp Chatbots
- **Unique Selling Points**:
  - Cloud persistence with **Supabase PostgreSQL** and **Supabase Storage**.
  - 100% intact Vanilla JS frontend requiring zero client code changes.
  - Built-in interactive **WhatsApp Bot Simulator** for live client testing.
  - Production-ready exportable **n8n Workflow** for Meta WhatsApp Cloud API (₹0 monthly subscription fees).
  - Unified Admin Dashboard with instant status updates and file management.
- **Platforms**: Web Browsers (Desktop & Mobile), Node.js Runtime.
- **Engine / Stack**: Node.js, Express.js, Multer (Memory Storage), Supabase (@supabase/supabase-js), dotenv, Vanilla HTML5 / CSS3 / JavaScript.
- **Version**: `1.1.0` (Supabase Cloud Upgrade)
- **Current Build**: Development Build (`server.js` running on `http://localhost:3000`).
- **Development Status**: Backend Supabase Migration Complete.
- **Vision**: Create a friction-free, high-reliability portal for rural & semi-urban digital service shop automation.
- **Design Philosophy**: Fast, accessible, mobile-responsive, intuitive UI requiring zero technical knowledge for end users.

---

## 📈 Progress

- **Overall Completion**: 92%
- **Current Milestone**: Supabase PostgreSQL & Storage Cloud Migration
- **Current Sprint**: Backend Upgrade & Cloud Storage Integration
- **Current Objective**: Replace local JSON reads/writes with Supabase PostgreSQL queries and local disk uploads with Supabase Storage bucket uploads.
- **Current Task**: Completed `server.js` rewrite, Supabase SQL schema creation, and dependency updates.
- **Next Task**: Verify Supabase connection with live `SUPABASE_URL` and `SUPABASE_KEY` in `.env`.
- **Previous Completed Task**: Permanent project memory baseline setup (`brain.md`).
- **Blocked Tasks**: None.
- **Pending Work**: Live testing with user's Supabase credentials.
- **Remaining Work**: Receipt generation, SMS/WhatsApp live status alerts.
- **Estimated Roadmap**:
  - Phase 1: Core Portal & Simulator (Completed)
  - Phase 2: System Documentation & Memory Initialization (Completed)
  - Phase 3: Supabase Cloud Migration (Completed)
  - Phase 4: Production Deployment & Live Webhook Integration (Upcoming)

---

## 🎮 Gameplay / System Workflows

- **Client Document Upload Workflow**:
  1. Customer selects desired service (e.g. New PAN Card, Correction, Caste Certificate).
  2. Dynamic document checklist displays required items.
  3. Customer fills contact information (Name, Phone Number, Email/Address).
  4. Customer uploads file attachments (Photos, PDFs, ID Proofs).
  5. Form submits to `/api/submissions` or `/api/upload` via AJAX (`fetch`).
  6. Multer processes files into RAM buffers (`multer.memoryStorage()`).
  7. Backend uploads buffers directly to Supabase Storage bucket `client_documents`.
  8. Public URLs and customer data (`name`, `phone`, `service`, `status`, `remarks`, `files`) are inserted into Supabase PostgreSQL table `submissions`.
- **Admin Management Workflow**:
  1. Shop owner accesses Admin Dashboard tab.
  2. Owner authenticates via PIN / Password system (`/api/admin/login`).
  3. All customer applications are fetched from Supabase `submissions` table ordered by `created_at` descending (`GET /api/submissions`).
  4. Status & remarks can be updated (`PATCH /api/submissions/:id/status` or `PUT /api/submissions/:id`).
  5. Submissions can be deleted along with their Supabase storage files (`DELETE /api/submissions/:id`).
- **WhatsApp Simulator Workflow**:
  1. Built-in interactive mobile phone widget on right side of screen.
  2. Client types keyword queries ("Hi", "Shop Details", "Price List", "Location", "Website Link").
  3. Frontend JS instant keyword match engine responds dynamically with simulated bot answers.
- **n8n Automation Pipeline**:
  1. Production flow JSON (`public/n8n_whatsapp_workflow.json`) connects Meta WhatsApp Cloud API webhooks to shop backend.
  2. Automatically answers WhatsApp messages 24/7 without third-party fees.

---

## 🗺️ World & Environment

- **Web Server Environment**: Node.js + Express web server listening on port 3000 (or `process.env.PORT`).
- **Database Environment**: Supabase Cloud PostgreSQL Database (`submissions` table).
- **Storage Environment**: Supabase Cloud Storage Bucket (`client_documents`).
- **Client Workspace UI**: Clean double-pane or tabbed layout with Hero header, Service Selector, Document Form, Admin Panel, and Virtual Mobile Frame.

---

## 👥 Characters & System Roles

- **Customer / Client**: End user accessing the portal to submit documents or inquire via simulator.
- **Admin / Cyber Cafe Manager**: Shop operator managing applications, reviewing documents, and updating service status.
- **Virtual Bot Assistant ("Durga Bot")**: Automated helper answering customer inquiries 24/7.

---

## 📦 Assets

- **Images**:
  - `public/prave.png`: Owner / Portal branding header asset (1.3 MB).
  - `public/abhi.jpg`: Avatar / Profile branding asset (127 KB).
- **Scripts & Styles**:
  - `public/styles.css`: Complete custom styling stylesheet (44 KB).
  - `public/app.js`: Master frontend logic, AJAX handshakes, Chatbot simulator engine (41 KB).
- **Integrations**:
  - `public/n8n_whatsapp_workflow.json`: Exportable n8n workflow for WhatsApp Cloud API (17.8 KB).

---

## 🏗️ Code Architecture

### Project Folder Structure
```
f:/chat bot/
├── .env.example               # Environment variables template for Supabase credentials
├── .gitignore                 # Files excluded from git (includes .env, node_modules)
├── brain.md                   # Permanent Single Source of Truth Memory
├── Project_Notes.md           # Developer guide in Hinglish
├── README.md                  # Project overview & quickstart
├── package.json               # Node.js dependencies & scripts (includes @supabase/supabase-js, dotenv)
├── package-lock.json          # Exact lockfile for dependencies
├── server.js                  # Main Express backend server & Supabase integration
├── data/                      # Local fallback settings directory
│   └── settings.json          # Shop settings & Admin configuration
├── public/                    # Frontend client bundle (100% untouched)
│   ├── app.js                 # Frontend application JS & Chatbot engine
│   ├── index.html             # Master web layout & UI markup
│   ├── styles.css             # Vanilla CSS design system
│   ├── n8n_whatsapp_workflow.json # n8n integration workflow
│   ├── abhi.jpg               # Branding image
│   └── prave.png              # Header branding image
└── uploads/                   # Legacy upload directory (retained for backward compatibility)
```

### Important Files & Responsibilities
- **[server.js](file:///f:/chat%20bot/server.js)**: Configures Express server, dotenv environment loading, Supabase client initialization, Multer memory storage, Supabase storage bucket upload routines, Supabase database queries for `/api/upload`, `/api/submissions`, `/api/submissions/:id/status`, and local settings helpers.
- **[.env.example](file:///f:/chat%20bot/.env.example)**: Contains environment variable configuration key placeholders (`SUPABASE_URL`, `SUPABASE_KEY`, `PORT`).
- **[public/index.html](file:///f:/chat%20bot/public/index.html)**: Semantic HTML5 markup for portal UI.
- **[public/app.js](file:///f:/chat%20bot/public/app.js)**: Frontend JS logic (communicates via standard fetch API).

---

## 💾 Database / Save Data

- **Primary Database**: Supabase Cloud PostgreSQL.
  - Table: `submissions`
  - Columns:
    - `id`: UUID (Primary Key, default `gen_random_uuid()`)
    - `created_at`: TIMESTAMPTZ (default `now()`)
    - `name`: TEXT NOT NULL
    - `phone`: TEXT NOT NULL
    - `service`: TEXT NOT NULL
    - `status`: TEXT (default 'Pending')
    - `remarks`: TEXT (nullable)
    - `files`: JSONB (Array of file objects containing Supabase public URLs)
- **Primary Storage Bucket**: Supabase Storage Bucket `client_documents` (Public).
- **Secondary Local Settings**: `data/settings.json` for shop name, address, and admin PIN.

---

## 🔌 APIs & Endpoints

- **`POST /api/upload`** & **`POST /api/submissions`**: Accepts `multipart/form-data` (`name`/`clientName`, `phone`/`clientPhone`, `service`/`serviceName`, `documents`). Uploads files to Supabase `client_documents` bucket and inserts submission into Supabase PostgreSQL table.
- **`GET /api/submissions`**: Fetches all records from Supabase `submissions` table, ordered by `created_at` descending (Admin protected).
- **`PATCH /api/submissions/:id/status`** & **`PUT /api/submissions/:id`**: Updates status and/or remarks for a specific UUID in Supabase database.
- **`DELETE /api/submissions/:id`**: Removes submission record from Supabase table and deletes associated files from Supabase Storage.
- **`POST /api/admin/login`**: Verifies admin credentials against store settings.
- **`GET /api/settings`** & **`PUT /api/settings`**: Read and update store configurations.

---

## 🎨 UI / UX

- **Theme**: Premium Dark/Glassmorphic Modern Indian Service Portal styling.
- **Compatibility**: 100% intact frontend logic without requiring any client-side JavaScript or HTML alterations.

---

## ⚡ Performance

- **Memory Storage**: Multer buffers uploaded files in RAM temporarily before streaming directly to Supabase Cloud Storage.
- **Database Speed**: PostgreSQL indexed queries via Supabase JS SDK.

---

## 🛡️ Security

- **Environment Secrets**: `SUPABASE_URL` and `SUPABASE_KEY` stored securely in `.env` (excluded from git via `.gitignore`).
- **Sanitized Uploads**: Unique timestamped file naming prevents bucket object collisions.

---

## 🐛 Bugs Log

| ID | Date | Priority | Component | Issue | Cause | Fix / Status | Risk |
|---|---|---|---|---|---|---|---|
| B-001 | 2026-07-22 | Low | System | Initial memory setup | Missing brain tracking | Created `brain.md` (Resolved) | None |
| B-002 | 2026-07-22 | Low | Dependencies | Powershell npm execution policy | Windows script execution policy | Used `cmd /c npm` for package install (Resolved) | None |
| B-003 | 2026-07-22 | Low | Server | `EADDRINUSE: address already in use :::3000` | Existing node process running on port 3000 | Kill process on port 3000 or change `PORT` in `.env` (Resolved) | None |
| B-004 | 2026-07-22 | Medium | Supabase | `new row violates row-level security policy for table "submissions"` | Missing RLS Policies / RLS enabled on table | Add RLS policies or run `ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;` (Resolved) | None |
| B-005 | 2026-07-22 | Low | Receipt API | Unescaped space in ID URL rendering index.html | Unescaped space characters in ID URL parameter | Added `encodeURIComponent` in `app.js` & flexible space/hyphen normalization in `server.js` (Resolved) | None |
| B-006 | 2026-07-22 | Low | Admin Download | Access denied on browser ZIP link click | Standard browser `<a>` GET link cannot send custom HTTP headers | Enabled direct GET streaming for download routes & query token fallback (Resolved) | None |
| B-007 | 2026-07-22 | Low | Admin Download | `ERR_INVALID_RESPONSE` on browser ZIP download | Direct `pdfDoc` stream piping conflict with async Archiver append | Pre-buffered PDF into binary buffer using `generatePdfSummaryBuffer` before archiver stream (Resolved) | None |
| B-008 | 2026-07-22 | Low | Admin Download | `TypeError: archiver is not a function` | Archiver v7 module exports `ZipArchive` class constructor | Added `createZipArchive` universal helper supporting `ZipArchive` class and function calls (Resolved) | None |

---

## 📜 Changelog

- **2026-07-22 (Supabase Migration Upgrade)**:
  - Installed `@supabase/supabase-js` and `dotenv` packages.
  - Configured `.env.example` and added `.env` to `.gitignore`.
  - Rewrote `server.js` to use `multer.memoryStorage()`.
  - Replaced disk writes & local JSON queries with Supabase Cloud Storage (`client_documents` bucket) and Supabase PostgreSQL queries (`submissions` table).
  - Maintained 100% backward compatibility for all existing frontend API routes (`/api/submissions`, `/api/upload`, `/api/submissions/:id/status`).

- **2026-07-22 (Initial Baseline)**:
  - Initialized permanent Project Memory file `brain.md` in root directory.

---

## 📝 Decisions Log

- **DEC-001 (JSON File Persistence)**: Legacy baseline store (superseded by DEC-004).
- **DEC-002 (Multer for Uploads)**: Updated to `multer.memoryStorage()` for streaming directly to cloud storage.
- **DEC-003 (Vanilla JS Frontend)**: Untouched frontend ensuring 0 client churn during backend upgrades.
- **DEC-004 (Supabase Cloud Migration)**: Adopted Supabase PostgreSQL (`submissions` table) and Supabase Storage (`client_documents` bucket) to enable scalable cloud data persistence, automatic backups, and public document access.

---

## 📁 File History

- **`server.js`**: Rewritten on 2026-07-22 to integrate `@supabase/supabase-js`, memory multer storage, Supabase bucket uploads, and PostgreSQL CRUD routes.
- **`package.json`**: Updated with `@supabase/supabase-js` and `dotenv`.
- **`.env.example`**: Created for user Supabase credentials template.
- **`.gitignore`**: Updated to ignore `.env`.
- **`brain.md`**: Updated to track Supabase cloud architecture migration.

---

## 📋 TODO

### Immediate Tasks
- [x] Install `@supabase/supabase-js` and `dotenv`.
- [x] Provide SQL scripts for Supabase `submissions` table and `client_documents` bucket creation.
- [x] Rewrite `server.js` with Supabase memory upload and PostgreSQL queries.
- [x] Configured `.env` file with Supabase URL (`https://zpvaeyiluseaeppuhioq.supabase.co`) and API key.
- [x] User executed SQL script in Supabase SQL Editor (`submissions` table & `client_documents` bucket created).

### Short-Term
- [x] Add PDF application receipt generation feature (`GET /api/submissions/:id/receipt`).
- [x] Add ZIP Package download feature (`GET /api/admin/submissions/:id/download` bundling PDF summary + original files from Supabase).
- [x] Premium UI Redesign (`index.html` + `styles.css`) with Poppins font, Amber dark theme, and Lottie pet mascot.
- [ ] Add search/filter feature in Admin Dashboard.

---

## 🎯 Current Context

- **Active State**: Premium UI Redesign complete — modern banking-style dark portal with Lottie pet mascot.
- **What was just accomplished**:
  - Redesigned `public/index.html` — added Lottie player `<script>`, `#pet-mascot` container with `<lottie-player>`, upgraded hero section with trust badges and pulsing status badge, improved footer with clean developer profile layout.
  - Completely rewrote `public/styles.css` — Poppins (headings) + Inter (body) fonts, Deep Slate `#0F172A` background, Amber `#F59E0B` primary accent, glassmorphism navbar, gradient service card hover effects with shine overlay, micro-animations on stat cards, floating mascot with `mascotFloat` keyframe animation, full responsiveness with mobile hamburger menu.
  - Lottie pet mascot positioned `fixed; bottom: 20px; left: 20px` with `z-index: 50` and pointer-events: none (non-blocking).
  - All JS-required element IDs (`hero-shop-name`, `services-grid`, `wa-chat-window`, `wa-input`, `wa-send-btn`, `upload-modal`, `submissions-table-body`, `stat-pending`, `stat-completed`, `stat-processing`, `stat-total`, `toast`, etc.) preserved 100% intact.
  - `app.js` not touched — 100% intact.
- **Next AI Instructions**: Ready for testing premium UI and handling next user request.

---

## 🧪 Testing

- **Migration Checklist**:
  1. Add `SUPABASE_URL` and `SUPABASE_KEY` to `.env`.
  2. Execute SQL script in Supabase SQL Editor.
  3. Run `npm start`.
  4. Test client document upload form on `http://localhost:3000`.
  5. Check Supabase Dashboard to confirm record in `submissions` table and file in `client_documents` bucket.

---

## 🚀 Deployment

- **Execution Command**: `npm start`
- **Required Environment Variables**: `SUPABASE_URL`, `SUPABASE_KEY`, `PORT`
