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

- **Project Title**: Maa Durga Jan Seva Kendra - Cyber Cafe Portal & WhatsApp Chatbot
- **Internal Codename**: `cyber-cafe-portal`
- **Category**: Web Application / Client Document Portal & Interactive Simulator
- **Theme**: Cyber Cafe & CSC / Jan Seva Kendra Digital Services Portal
- **Story / Context**: Empowering local customers to upload documents for government & commercial services (PAN, Voter ID, Certificates, Aadhaar, etc.) while enabling shop owners to manage applications and automate customer support via WhatsApp.
- **Target Audience**: Jan Seva Kendra customers, local shop clients, and cyber cafe administrators.
- **Unique Selling Points**:
  - Cloud persistence with **Supabase PostgreSQL** and **Supabase Storage**.
  - **React (Vite) frontend** — fully component-based, hot-reload dev experience.
  - Built-in interactive **WhatsApp Bot Simulator** (now fetches services dynamically from API).
  - **Real WhatsApp Cloud API integration** — webhook, message handling, upload session generation.
  - **Dynamic Service Management** — Admin can add/edit/delete/toggle services without code changes.
  - Production-ready exportable **n8n Workflow** for Meta WhatsApp Cloud API (₹0 monthly fees).
  - Unified Admin Dashboard with Service Management, instant status updates, and file management.
- **Platforms**: Web Browsers (Desktop & Mobile), Node.js Runtime.
- **Engine / Stack**: Node.js, Express.js, React 19 (Vite), Supabase, Multer (Memory Storage), dotenv.
- **Version**: `3.2.0` (UI Polish, Light Mode Fix, Form Enhancements)
- **Current Build**: Development — Express backend on `http://localhost:3000` | React dev server on `http://localhost:5173`.
- **Development Status**: UI polish + form enhancements complete. Build verified ✅.

---

## 📈 Progress

- **Overall Completion**: 99%
- **Current Milestone**: WhatsApp Cloud API Automation + Dynamic Service Management — COMPLETE
- **Completed Phases**:
  - Phase 1: Core Portal & Simulator ✅
  - Phase 2: System Documentation & Memory Initialization ✅
  - Phase 3: Supabase Cloud Migration ✅
  - Phase 4: Premium UI Redesign (Amber dark theme, Lottie mascot) ✅
  - Phase 5: React (Vite) Frontend Migration ✅
  - Phase 6: Real WhatsApp Cloud API Integration + Dynamic Services ✅
- **Next Task**: Run Supabase SQL migration → Connect real WhatsApp phone when available.
- **Pending Work**:
  - Run `data/supabase_migration.sql` in Supabase SQL Editor (⚠️ REQUIRED before new features work)
  - WhatsApp number physical verification (needs owner + phone in-person)
  - SMS notifications (optional)

---

## 🏗️ Code Architecture

### Project Folder Structure
```
f:/chat bot/
├── .env                        # Environment secrets (gitignored) ← UPDATED with WhatsApp vars
├── .env.example                # Safe-to-commit env template ← NEW
├── .gitignore                  # Excludes .env, node_modules
├── brain.md                    # ← This file: Single Source of Truth
├── package.json                # Root scripts (dev, build:client, etc.)
├── server.js                   # Express backend ← +500 lines: WhatsApp routes, services API
├── data/
│   ├── settings.json           # Shop settings & Admin config (persistent)
│   └── supabase_migration.sql  # ← NEW: Run in Supabase SQL Editor
├── public/                     # Static assets served by Express
│   ├── abhi.jpg                # Abhishek's footer avatar
│   ├── logo.jpeg               # Shop logo / favicon
│   ├── prave.png               # Praveen's footer avatar
│   └── n8n_whatsapp_workflow.json  # ← UPDATED: Dynamic services + upload session
└── client/                     # ← React (Vite) frontend app
    ├── index.html              # App entry point
    ├── vite.config.js          # Proxy /api → :3000, build outDir → ../public
    ├── package.json            # React deps
    └── src/
        ├── main.jsx            # React entry (createRoot)
        ├── App.jsx             # Root: hash router, tab state, layout
        ├── index.css           # Full design system
        ├── constants/
        │   └── services.js     # SERVICES config (static fallback if DB unavailable)
        ├── hooks/
        │   ├── useSettings.js  # Fetches /api/settings → shopSettings state
        │   └── useAdminAuth.js # JWT login/logout → adminToken state
        ├── components/
        │   ├── Toast.jsx       # Toast notification + useToast hook
        │   ├── Navbar.jsx      # Top navbar with tab switching & theme switcher
        │   ├── PetMascot.jsx   # Lottie floating pet mascot
        │   └── FloatingWhatsApp.jsx  # Fixed WhatsApp CTA button
        └── pages/
            ├── CustomerPortal/
            │   └── index.jsx   # Hero + ServicesGrid + UploadModal ← +?upload=token handling
            ├── BotSimulator/
            │   └── index.jsx   # ← Now fetches services from /api/services dynamically
            └── AdminDashboard/
                └── index.jsx   # ← +Service Management tab, +WhatsApp config status
```

### Important Files & Responsibilities

| File | Role |
|---|---|
| [server.js](file:///f:/chat%20bot/server.js) | Express backend — all `/api/` routes, Supabase, Multer, JWT, WhatsApp webhook, services CRUD, upload sessions |
| [client/src/pages/AdminDashboard/index.jsx](file:///f:/chat%20bot/client/src/pages/AdminDashboard/index.jsx) | Admin login, stats, submissions, **Service Management** tab, shop settings, n8n+WhatsApp status |
| [client/src/pages/CustomerPortal/index.jsx](file:///f:/chat%20bot/client/src/pages/CustomerPortal/index.jsx) | Hero, service cards, upload modal — **now handles ?upload=token from WhatsApp** |
| [client/src/pages/BotSimulator/index.jsx](file:///f:/chat%20bot/client/src/pages/BotSimulator/index.jsx) | WhatsApp simulator — **now fetches services from /api/services (dynamic)** |
| [data/supabase_migration.sql](file:///f:/chat%20bot/data/supabase_migration.sql) | SQL to create services, service_documents, upload_sessions tables + seed data |
| [.env.example](file:///f:/chat%20bot/.env.example) | Documented env var template (safe to commit) |
| [public/n8n_whatsapp_workflow.json](file:///f:/chat%20bot/public/n8n_whatsapp_workflow.json) | Updated n8n workflow with dynamic services + upload session |

---

## 🔌 APIs & Endpoints

All routes served by `server.js` on **port 3000**. Vite dev server proxies `/api/*` to Express.

### Existing Routes (UNCHANGED)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/submissions` | Upload files + create submission in Supabase | Public |
| `GET` | `/api/submissions` | Fetch all submissions (admin) | JWT |
| `PUT` | `/api/submissions/:id` | Update status & remarks | JWT |
| `DELETE` | `/api/submissions/:id` | Delete submission + Supabase storage files | JWT |
| `GET` | `/api/submissions/:id/receipt` | Generate PDF receipt | Public |
| `GET` | `/api/admin/submissions/:id/download` | Download ZIP (PDF + files) | JWT |
| `POST` | `/api/admin/login` | Verify password, return JWT | Public |
| `GET` | `/api/settings` | Read shop settings | Public |
| `PUT` | `/api/settings` | Update shop settings | JWT |

### New Routes (ADDED in v3.0.0)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/services` | List all active services with documents | Public |
| `GET` | `/api/services/:id` | Get single service + documents | Public |
| `POST` | `/api/admin/services` | Create new service | JWT |
| `PUT` | `/api/admin/services/:id` | Update service | JWT |
| `DELETE` | `/api/admin/services/:id` | Delete service | JWT |
| `POST` | `/api/admin/services/:id/documents` | Add document to service | JWT |
| `DELETE` | `/api/admin/services/:id/documents/:docId` | Remove document | JWT |
| `POST` | `/api/upload-session` | Create secure WhatsApp upload token | Public |
| `GET` | `/api/upload-session/:token` | Validate token + get session info | Public |
| `GET` | `/api/whatsapp/webhook` | Meta webhook verification challenge | Public |
| `POST` | `/api/whatsapp/webhook` | Receive incoming WhatsApp messages | Public |
| `POST` | `/api/whatsapp/send-status` | Manually send WhatsApp notification | JWT |
| `GET` | `/api/whatsapp/config-status` | Check which env vars are configured | JWT |

---

## 💾 Database / Storage

- **Primary Database**: Supabase Cloud PostgreSQL.
  - Table: `submissions` — (UNCHANGED) id, created_at, name, phone, service, status, remarks, files
  - Table: `services` — ← NEW: id, name, slug, description, icon, hindi_title, is_active, display_order
  - Table: `service_documents` — ← NEW: id, service_id, document_name, is_required, display_order
  - Table: `upload_sessions` — ← NEW: id, token, service_id, whatsapp_number, is_used, expires_at

> [!IMPORTANT]
> **Run `data/supabase_migration.sql` in Supabase SQL Editor** before the new service management and WhatsApp features will work!

- **Primary Storage**: Supabase Storage Bucket `client_documents` (Public).
- **Local Settings**: `data/settings.json` — shop name, address, timings, hashed admin password.

---

## ⚙️ Environment Variables

### Existing (Required)
```
PORT=3000
SUPABASE_URL=https://zpvaeyiluseaeppuhioq.supabase.co
SUPABASE_KEY=<service_role secret key> (REQUIRED to bypass RLS)
JWT_SECRET=<strong random secret>
```

### New WhatsApp (Optional — leave empty until phone is verified)
```
META_APP_ID=
META_APP_SECRET=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=maa_durga_verify_token_2026
N8N_WEBHOOK_URL=
PUBLIC_APP_URL=http://localhost:3000
UPLOAD_TOKEN_EXPIRY_MINUTES=60
```

---

## 🤖 WhatsApp Architecture

```
Customer
↓
WhatsApp (sends "Hi")
↓
Meta WhatsApp Cloud API
↓
POST /api/whatsapp/webhook  (Express)
↓ (if N8N_WEBHOOK_URL set)
n8n workflow (orchestration)
↓
GET /api/services (fetch dynamic menu)
POST /api/upload-session (create secure link)
↓
Customer receives service info + upload link
↓
Customer opens link: /?upload=TOKEN
↓
CustomerPortal (React) detects token → fetches session info → opens pre-filled modal
↓
Customer uploads documents → POST /api/submissions → Supabase
↓
Admin sees application in Admin Dashboard
```

### WhatsApp Bot Modes
- **Direct Mode** (default): Express handles conversation logic directly. No n8n needed.
- **n8n Mode**: If `N8N_WEBHOOK_URL` is set, Meta events are forwarded to n8n for advanced workflow processing.

---

## 🎨 UI / Design System

- **Theme**: Premium Dark Glassmorphic — Deep Slate `#0F172A` background, Amber `#F59E0B` accent. **UNCHANGED.**
- **Typography**: Poppins (headings) + Inter (body) — loaded via Google Fonts CDN. **UNCHANGED.**
- **New UI**: Service Management sub-tab in Admin Dashboard — follows existing glassmorphic design system exactly.

---

## ⚡ Dev Workflow

```bash
# Backend (Express on :3000)
npm run dev               # from f:\chat bot\

# Frontend (React / Vite on :5173)
npm run dev:client        # from f:\chat bot\

# Production build (compiles React → f:\chat bot\public\)
npm run build             # from f:\chat bot\
```

> [!TIP]
> During development, open **http://localhost:5173** (React dev server with HMR).
> In production, Express serves the built React app from `/public` on port 3000.

---

## 🛡️ Security

- **JWT Auth**: All admin routes require `Authorization: Bearer <token>`. Token issued via bcrypt password verification.
- **Secure Upload Tokens**: `crypto.randomBytes(32).toString('hex')` — 64-char hex token, stored in Supabase with expiry.
- **Token Expiry**: Configurable via `UPLOAD_TOKEN_EXPIRY_MINUTES` (default 60 min).
- **Environment Secrets**: All WhatsApp credentials in `.env` (gitignored). Never exposed to frontend.
- **Config Status API**: `/api/whatsapp/config-status` shows ✅/❌ per variable without revealing values.
- **Rate Limiting**: `express-rate-limit` applied on login, upload, and general API routes.
- **Helmet**: HTTP security headers via `helmet` middleware.
- **Input Validation**: `express-validator` sanitizes all user input including new service routes.

---

## 🐛 Bugs Log

| ID | Date | Priority | Component | Issue | Status |
|---|---|---|---|---|---|
| B-001 | 2026-07-22 | Low | System | Initial memory setup | Resolved |
| B-002 | 2026-07-22 | Low | Dependencies | Powershell npm execution policy | Resolved |
| B-003 | 2026-07-22 | Low | Server | `EADDRINUSE` port 3000 conflict | Resolved |
| B-004 | 2026-07-22 | Medium | Supabase | RLS policy blocking inserts | Resolved |
| B-005 | 2026-07-22 | Low | Receipt API | Unescaped space in ID URL | Resolved |
| B-006 | 2026-07-22 | Low | Admin Download | Auth header blocked on GET link | Resolved |
| B-007 | 2026-07-22 | Low | Admin Download | ERR_INVALID_RESPONSE on ZIP | Resolved |
| B-008 | 2026-07-22 | Low | Admin Download | `archiver is not a function` | Resolved |
| B-009 | 2026-07-23 | High | Auth / CORS | Admin login returning 403 Forbidden on React dev server | Resolved |
| B-010 | 2026-07-23 | Medium | Auth | `adminPassword` in settings.json was `Admin123`, user was using `Pratap@135` | Resolved |
| B-011 | 2026-07-24 | High | Deployment | Render serving 404 because server looked for `public/index.html` instead of Vite's `client/dist` | Resolved |
| B-012 | 2026-07-24 | High | Deployment | Render `npm install` omitted Vite `devDependencies`, breaking build | Resolved |
| B-013 | 2026-07-24 | Medium | UI | Footer profile images missing after React migration | Resolved |
| B-014 | 2026-07-29 | Low | Development | Local environment showing old UI instead of new changes when running server.js | Resolved |
| B-015 | 2026-07-29 | High | UI | WhatsApp simulator buttons disappearing due to flexbox `flex-shrink` | Resolved |
| B-016 | 2026-07-29 | High | Admin | Failed to create services due to RLS blocking anon key. Fixed by using `service_role` key in .env | Resolved |
| B-017 | 2026-07-31 | High | Auth / UI | Password hash mismatch in settings.json & broken password eye toggle styling in Admin Login | Resolved |

---

## 📜 Changelog

- **2026-07-31 (v3.2.3 — Strict Service Deduplication Fix)**:
  - Added strict deduplication logic to `CustomerPortal` & `BotSimulator` service fetching.
  - Excludes DB duplicate rows of core services (PAN Card, Voter ID, Income/Caste/Domicile) so cards never double-display.
  - Ensures clean 1-to-1 card rendering on Customer Portal & WhatsApp Bot Simulator.

- **2026-07-31 (v3.2.2 — OBC Sub-caste Datalist & Custom Typing Support)**:
  - Exported 160+ UP OBC Castes & Sub-castes list (`OBC_SUBCASTES`) in `client/src/constants/services.js`.
  - Dynamically attaches HTML5 `<datalist>` to `upjaati` and `jaati` fields when Category is selected as `OBC`.
  - Allows users to search/select from all 160 OBC options OR type custom sub-castes freely.
  - Restricted strictly to `OBC` category selection.

- **2026-07-31 (v3.2.1 — Admin Login Layout & Password Fix)**:
  - Fixed password hash mismatch in `data/settings.json` so `Pratap@135` authenticates cleanly.
  - Increased `loginLimiter` rate limit threshold from 10 to 30 attempts per 15 minutes in `server.js`.
  - Refactored Admin Login password field structure and `.password-input-wrapper` / `.password-toggle-btn` CSS in `index.css` & `AdminDashboard/index.jsx`.
  - Compacted the password form width (`max-width: 320px` centered inside card) for a clean, proportional layout.

- **2026-07-30 (v3.1.0 — Merged Certificates Flow)**:
  - Replaced individual Income/Caste certificate services with a merged `srv_certificates` group (AAY / JAATI / NIWAS).
  - Implemented a two-step application flow in `CustomerPortal`: `CertificatePickerModal` for type selection followed by `CertificateFormModal` for data entry.
  - Added customized form fields specific to each certificate type (e.g., `jaati` and `upjaati` for Caste, `thana` for Domicile).
  - Set fixed default values for specific regional fields (e.g., District and Tahsil locked to 'Ghazipur').

- **2026-07-30 (v3.2.0 — UI Polish, Light Mode Fix, Form Enhancements)**:
  - Added **"All" (सभी)** 4th certificate option combining AAY + JAATI + NIWAS requirements.
  - Added **Category dropdown** (OBC/GENERAL/SC/ST/Any other) to all certificate forms.
  - Changed **Tahsil** from fixed text to **dropdown** with 7 Ghazipur tehsils.
  - Split document upload into **mandatory** (Aadhar Card + Photo — required before submit) + **other** (drag-and-drop).
  - Replaced navbar icon with **CSC logo** (`logo.jpeg`).
  - Made **address clickable** → Google Maps link.
  - Full **Light Mode CSS fixes**: missing system theme variables, explicit `!important` overrides for contact bar.
  - **Service card** spacing reduced; removed `height:100%` + `flex-grow:1` for content-driven sizing.
  - Mobile responsiveness improvements for file upload boxes.
  - Build verified ✅.

- **2026-07-29 (v3.1.0 — Merged Certificates Flow)**:
  - Replaced individual Income/Caste certificate services with a merged `srv_certificates` group (AAY / JAATI / NIWAS).
  - Two-step flow: CertificatePickerModal → CertificateFormModal with dynamic fields + docs per type.
  - Build verified ✅.

- **2026-07-29 (v3.0.0 — WhatsApp Automation + Dynamic Services)**:
  - Added 13 new API routes to `server.js`: services CRUD, upload sessions, WhatsApp webhook.
  - WhatsApp Cloud API webhook handler (GET verification + POST message handling).
  - Dynamic service retrieval from Supabase — bot menu builds from DB, not hardcoded.
  - Secure upload session system: `crypto.randomBytes(32)` token + Supabase `upload_sessions` table.
  - Admin Dashboard: New "Service Management" sub-tab with full CRUD for services and documents.
  - Admin Dashboard: WhatsApp config status card in n8n Setup tab.
  - CustomerPortal: Handles `?upload=TOKEN` URL — auto-opens pre-filled modal for correct service.
  - BotSimulator: Fetches services from `/api/services` API (dynamic), falls back to hardcoded SERVICES.
  - Supabase SQL migration file created: `data/supabase_migration.sql`.
  - `.env` updated with WhatsApp env var placeholders. `.env.example` created.
  - n8n workflow JSON updated (v3.0.0) with dynamic services and upload session support.
  - `admin123` default password updated to `Pratap@135` in server.js fallback.
  - Build verified: `npm run build` ✅ (424 modules, no errors).

- **2026-07-24 (v2.0.2 — Render Deployment Fixes)**: ...

- **2026-07-23 (v2.0.1 — Auth & CORS Hotfix)**: ...

- **2026-07-23 (v2.0.0 — React Migration)**: ...

---

## 📝 Decisions Log

| ID | Decision | Reason |
|---|---|---|
| DEC-001 | JSON File Persistence (legacy) | Superseded by DEC-004 |
| DEC-002 | Multer `memoryStorage()` | Stream directly to cloud, no disk writes |
| DEC-003 | ~~Vanilla JS Frontend~~ → **React (Vite)** | Better component reuse, HMR, hooks for state management |
| DEC-004 | Supabase Cloud | Scalable, free tier, auto-backups, public file URLs |
| DEC-005 | Hash-based routing (`#portal`, `#admin`) | No need for React Router — simple 3-tab app |
| DEC-006 | CSS in single `index.css` | Avoid CSS modules complexity; design system already well-structured |
| DEC-007 | Add Vite port 5173 to CORS whitelist | Express was rejecting all API calls from React dev server (403 Forbidden) |
| DEC-008 | Plain-text password fallback in `settings.json` | Server auto-upgrades to bcrypt hash on first successful login |
| DEC-009 | `crypto.randomBytes(32)` for upload tokens | Cryptographically secure, 64-char hex — impossible to guess |
| DEC-010 | Direct mode + n8n mode for WhatsApp | If N8N_WEBHOOK_URL is set, forward to n8n. Otherwise handle directly in Express. Allows testing without n8n. |
| DEC-011 | Services stored in Supabase (not hardcoded) | Admin can add/remove/edit services without code changes. Keeps n8n workflow stable. |
| DEC-012 | Bot Simulator falls back to hardcoded SERVICES | Allows simulator to work even if Supabase tables not yet created |

---

## 📋 TODO

### Completed ✅
- [x] Supabase PostgreSQL & Storage migration
- [x] PDF receipt generation
- [x] ZIP download (PDF + files)
- [x] Premium UI redesign (Amber dark theme + Lottie mascot)
- [x] React (Vite) frontend migration
- [x] Theme switcher (Dark/Light/System)
- [x] Search & filter in Admin submissions table
- [x] Shop timings changed to "24/7"
- [x] Delete old vanilla JS files
- [x] Production deployment to live server (Render)
- [x] Dynamic Service Management (Admin UI + Supabase)
- [x] WhatsApp Cloud API webhook handler
- [x] Secure upload session (token-based upload links)
- [x] WhatsApp URL pre-fills Customer Portal upload modal
- [x] Bot Simulator fetches services from API
- [x] n8n workflow updated (dynamic services + upload session)

### Pending — Required ⚠️
- [ ] **RUN** `data/supabase_migration.sql` in Supabase SQL Editor (new tables + seed data)
- [ ] **Set** `PUBLIC_APP_URL` in `.env` to live site URL when deploying

### Pending — When WhatsApp Phone Available 📱
- [ ] Create Meta Developer App
- [ ] Add phone number to WhatsApp Business Platform (needs physical phone for OTP)
- [ ] Generate permanent Access Token (System User)
- [ ] Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` in `.env`
- [ ] Configure webhook in Meta Dashboard: `https://your-app.onrender.com/api/whatsapp/webhook`
- [ ] Verify token: `maa_durga_verify_token_2026`
- [ ] Test with real "Hi" message

### Optional 🔜
- [ ] WhatsApp status notification automation when admin changes status
- [ ] SMS notifications on submission status change

---

## 🎯 Current Context

- **Active State**: All features built and verified. UI fully polished with light/dark mode support. Form fields enhanced with Category + Tahsil dropdowns. Mandatory Aadhar/Photo upload enforced. Service cards compact and content-driven.
- **What was just accomplished (v3.2.0 — 2026-07-30)**:
  - **"All" Certificate Option**: Added `all` (सभी — आय, जाति, निवास) as 4th option in certificate picker, combining requirements of all three certificates.
  - **Category Dropdown**: Added `जाति श्रेणी / Category` select field (OBC, GENERAL, SC, ST, Any other) to all 4 certificate forms.
  - **Tahsil Dropdown**: Replaced fixed "Ghazipur" text with a proper dropdown: Ghazipur, Jakhaniya, Kasamabad, Mohamdabad, Saidpur, Sevrai, Jamaniya.
  - **Mandatory Aadhar + Photo Upload**: Separated mandatory uploads (Aadhar Card + Passport Photo) as individual required file inputs. Form won't submit unless both are uploaded. Other supporting docs remain in drag-and-drop area.
  - **CSC Logo in Navbar**: Replaced FontAwesome laptop icon with actual `logo.jpeg` in the navigation bar.
  - **Address → Google Maps Link**: Address in hero section now links to `https://maps.app.goo.gl/4x7veXD2rUK5ZsP57`.
  - **Android Mobile Responsiveness**: File upload boxes use `flexWrap` and `maxWidth: 100%` for clean mobile layout.
  - **Light Mode Full Fix**:
    - Added missing CSS variables (`--bg-card`, `--bg-tertiary`, WA colors, etc.) to system theme media query.
    - Added explicit `!important` overrides for `.quick-contact-bar` in light/system themes → soft blue pill (`#EFF6FF`).
    - Removed hardcoded `rgba(15,23,42,*)` from `.quick-contact-bar` and `.file-drop-area`.
    - Fixed hardcoded `white` color text → `var(--text-primary)` for address + timings.
    - Hero grid pattern opacity reduced in light mode.
  - **Service Card Spacing**: Reduced padding (`1.8rem` → `1.2rem`), reduced margins between card sections. Removed `height: 100%` and `flex-grow: 1` so cards shrink to fit their content naturally — no more empty whitespace gaps.
  - **Modal Layout**: Reverted modal layout & position back to original v3.2.0 state as requested.
- **Admin Password**: `Pratap@135`
- **WhatsApp Verify Token**: `maa_durga_verify_token_2026`
- **Next Step**: Run Supabase SQL migration → Connect real WhatsApp phone when available.

---

## 🚀 Deployment

```bash
# Development
npm run dev          # Start Express backend (:3000)
npm run dev:client   # Start React dev server (:5173)

# Production
npm run build        # Build React → public/
npm start            # Serve everything from Express (:3000)
```

**Required Environment Variables** (set in `.env` and Render Environment):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
PORT=3000
PUBLIC_APP_URL=https://your-app.onrender.com

# WhatsApp (fill when phone is ready)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=maa_durga_verify_token_2026
```

## 📱 WhatsApp Setup Checklist (When Phone is Ready)

1. ✅ Meta Developer App — create at developers.facebook.com
2. ✅ Add WhatsApp Business Platform product
3. ⏳ Add phone number → verify with OTP (**PHYSICAL PHONE REQUIRED**)
4. ⏳ Generate System User permanent Access Token
5. ⏳ Set `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` in `.env`
6. ⏳ Set `PUBLIC_APP_URL` to live Render URL
7. ⏳ Configure Webhook in Meta Dashboard:
   - URL: `https://your-app.onrender.com/api/whatsapp/webhook`
   - Verify Token: `maa_durga_verify_token_2026`
   - Subscribe to: `messages`
8. ⏳ Test: Send "Hi" from any WhatsApp → bot should reply with service menu
