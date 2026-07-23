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
  - Built-in interactive **WhatsApp Bot Simulator** for live client testing.
  - Production-ready exportable **n8n Workflow** for Meta WhatsApp Cloud API (₹0 monthly fees).
  - Unified Admin Dashboard with instant status updates and file management.
- **Platforms**: Web Browsers (Desktop & Mobile), Node.js Runtime.
- **Engine / Stack**: Node.js, Express.js, React 19 (Vite), Supabase, Multer (Memory Storage), dotenv.
- **Version**: `2.0.0` (React Frontend Migration)
- **Current Build**: Development — Express backend on `http://localhost:3000` | React dev server on `http://localhost:5173`.
- **Development Status**: React frontend migration complete. All features working.

---

## 📈 Progress

- **Overall Completion**: 97%
- **Current Milestone**: React (Vite) Frontend Migration — COMPLETE
- **Completed Phases**:
  - Phase 1: Core Portal & Simulator ✅
  - Phase 2: System Documentation & Memory Initialization ✅
  - Phase 3: Supabase Cloud Migration ✅
  - Phase 4: Premium UI Redesign (Amber dark theme, Lottie mascot) ✅
  - Phase 5: React (Vite) Frontend Migration ✅
- **Next Task**: Production build & deployment to live server.
- **Pending Work**: Receipt generation improvements, SMS/WhatsApp live status alerts.

---

## 🏗️ Code Architecture

### Project Folder Structure
```
f:/chat bot/
├── .env                        # Environment secrets (gitignored)
├── .gitignore                  # Excludes .env, node_modules
├── brain.md                    # ← This file: Single Source of Truth
├── package.json                # Root scripts (dev, build:client, etc.)
├── server.js                   # Express backend (UNCHANGED from v1)
├── data/
│   └── settings.json           # Shop settings & Admin config (persistent)
├── public/                     # Static assets served by Express
│   ├── abhi.jpg                # Abhishek's footer avatar
│   ├── logo.jpeg               # Shop logo / favicon
│   ├── prave.png               # Praveen's footer avatar
│   └── n8n_whatsapp_workflow.json  # Downloadable n8n workflow
└── client/                     # ← React (Vite) frontend app
    ├── index.html              # App entry point (with CDN: Fonts, FA, Lottie)
    ├── vite.config.js          # Proxy /api → :3000, build outDir → ../public
    ├── package.json            # React deps (react, react-dom, vite)
    └── src/
        ├── main.jsx            # React entry (createRoot)
        ├── App.jsx             # Root: hash router, tab state, layout
        ├── index.css           # Full design system (port of old styles.css)
        ├── constants/
        │   └── services.js     # SERVICES config object (PAN, Voter, Income, Caste)
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
            │   └── index.jsx   # Hero + ServicesGrid + ServiceCard + UploadModal
            ├── BotSimulator/
            │   └── index.jsx   # Phone frame + WA chat + payload viewer
            └── AdminDashboard/
                └── index.jsx   # LoginCard + StatsRow + SubmissionsTable + Settings + n8n Guide
```

### Important Files & Responsibilities

| File | Role |
|---|---|
| [server.js](file:///f:/chat%20bot/server.js) | Express backend — all `/api/` routes, Supabase, Multer, JWT auth |
| [client/vite.config.js](file:///f:/chat%20bot/client/vite.config.js) | Proxies `/api` → Express `:3000`; `build` outputs to `../public` |
| [client/src/App.jsx](file:///f:/chat%20bot/client/src/App.jsx) | Hash-based tab router (`#portal`, `#simulator`, `#admin`) |
| [client/src/hooks/useSettings.js](file:///f:/chat%20bot/client/src/hooks/useSettings.js) | Fetches `/api/settings`, provides `shopSettings` across app |
| [client/src/hooks/useAdminAuth.js](file:///f:/chat%20bot/client/src/hooks/useAdminAuth.js) | JWT token: login (`POST /api/admin/login`), logout, sessionStorage |
| [client/src/pages/CustomerPortal/index.jsx](file:///f:/chat%20bot/client/src/pages/CustomerPortal/index.jsx) | Hero section, service cards, drag-&-drop upload modal |
| [client/src/pages/BotSimulator/index.jsx](file:///f:/chat%20bot/client/src/pages/BotSimulator/index.jsx) | WhatsApp phone simulator + live JSON payload viewer |
| [client/src/pages/AdminDashboard/index.jsx](file:///f:/chat%20bot/client/src/pages/AdminDashboard/index.jsx) | Admin login, stats, submissions CRUD, shop settings, n8n guide |
| [data/settings.json](file:///f:/chat%20bot/data/settings.json) | Persistent shop config: name, address, timings, adminPassword hash |

---

## 🔌 APIs & Endpoints

All routes served by `server.js` on **port 3000**. Vite dev server proxies `/api/*` to Express.

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

---

## 💾 Database / Storage

- **Primary Database**: Supabase Cloud PostgreSQL.
  - Table: `submissions`
  - Columns: `id` (UUID PK), `created_at`, `name`, `phone`, `service`, `status` (default 'pending'), `remarks`, `files` (JSONB array of `{url, originalname}`)
- **Primary Storage**: Supabase Storage Bucket `client_documents` (Public).
- **Local Settings**: `data/settings.json` — shop name, address, timings, hashed admin password.

---

## 🎨 UI / Design System

- **Theme**: Premium Dark Glassmorphic — Deep Slate `#0F172A` background, Amber `#F59E0B` accent.
- **Typography**: Poppins (headings) + Inter (body) — loaded via Google Fonts CDN.
- **CSS**: Single file `client/src/index.css` — full design system with CSS custom properties.
- **Icons**: FontAwesome 6 (CDN).
- **Animations**: Lottie pet mascot, `mascotFloat` keyframe, `pulse-ring` status badge, card hover lift + amber glow.
- **Responsive**: Mobile hamburger menu, responsive grids down to 320px.
- **Themes**: Dark (default), Light, System preference — stored in `localStorage`, applied via `data-theme` on `<html>`.

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
- **Environment Secrets**: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `ADMIN_PASSWORD_HASH` stored in `.env` (gitignored).
- **Input Validation**: `express-validator` sanitizes all user input.
- **Rate Limiting**: `express-rate-limit` applied on login route.
- **Helmet**: HTTP security headers via `helmet` middleware.

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

---

## 📜 Changelog

- **2026-07-23 (v2.0.1 — Auth & CORS Hotfix)**:
  - Added `http://localhost:5173` and `http://127.0.0.1:5173` to Express CORS `ALLOWED_ORIGINS` so the Vite dev server is no longer blocked.
  - Updated `data/settings.json` → `adminPassword` set to `Pratap@135` (server auto-migrates to bcrypt hash on first login).

- **2026-07-23 (v2.0.0 — React Migration)**:
  - Scaffolded Vite React app in `client/` with `npm create vite@latest`.
  - Configured `vite.config.js` to proxy `/api` → Express `:3000` and build output to `../public`.
  - Ported full `styles.css` (1690 lines) → `client/src/index.css` with zero visual changes.
  - Created custom hooks: `useSettings`, `useAdminAuth`, `useToast`.
  - Built React components: `Navbar`, `Toast`, `PetMascot`, `FloatingWhatsApp`.
  - Migrated all 3 tabs to React pages: `CustomerPortal`, `BotSimulator`, `AdminDashboard`.
  - All features preserved: drag-&-drop upload, WhatsApp simulator, admin CRUD, settings save, theme switcher.
  - Deleted old vanilla files: `public/app.js`, `public/index.html`, `public/styles.css`.
  - Deleted Vite boilerplate: `App.css`, `react.svg`, `vite.svg`, `hero.png`, `favicon.svg`, `icons.svg`.
  - Updated root `package.json` with `dev:client` and `build:client` scripts.
  - Shop timings updated to `"24/7"` in `data/settings.json`.

- **2026-07-22 (v1.1.0 — Supabase Migration)**:
  - Installed `@supabase/supabase-js` and `dotenv`.
  - Rewrote `server.js` with Supabase memory upload + PostgreSQL CRUD.
  - Premium UI redesign (Amber dark theme, Lottie mascot, glassmorphism).

- **2026-07-22 (v1.0.0 — Initial Baseline)**:
  - Initialized project and `brain.md`.

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
| DEC-008 | Plain-text password fallback in `settings.json` | Server auto-upgrades to bcrypt hash on first successful login — no manual hashing needed |

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

### Upcoming 🔜
- [ ] Production deployment to live server (Railway / Render / VPS)
- [ ] WhatsApp live status alerts to customers
- [ ] SMS notifications on submission status change

---

## 🎯 Current Context

- **Active State**: Fully working. Admin login fixed. App running at `http://localhost:5173`.
- **What was just accomplished**:
  - Fixed **403 Forbidden** on admin login — added `localhost:5173` to Express CORS `ALLOWED_ORIGINS`.
  - Fixed **wrong password** — `data/settings.json` now has `adminPassword: "Pratap@135"`; server auto-migrates to bcrypt hash on first login.
  - Both Express backend (`:3000`) and Vite dev server (`:5173`) confirmed running.
  - Admin login tested via PowerShell — returns `{ success: true, token: "..." }` ✅
- **Admin Password**: `Pratap@135` (stored as bcrypt hash after first login)
- **Next AI Instructions**: Ask user what to do next — production deployment, new features, or UI changes.

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

**Required Environment Variables** (set in `.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
PORT=3000
```
