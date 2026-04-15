# 🍜 Vinh Khanh Food Tour

> **GPS-based audio tour platform for the Vinh Khanh street food district, Ho Chi Minh City**

[![Backend](https://img.shields.io/badge/Backend-ASP.NET_Core_10-512BD4?logo=dotnet)](https://dotnet.microsoft.com)
[![Frontend](https://img.shields.io/badge/Frontend-React_19_/_Vite-61DAFB?logo=react)](https://react.dev)
[![Mobile](https://img.shields.io/badge/Mobile-.NET_MAUI-512BD4?logo=dotnet)](https://dotnet.microsoft.com/apps/maui)
[![Database](https://img.shields.io/badge/Database-MySQL_8-4479A1?logo=mysql)](https://www.mysql.com)

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Quick Start — Local Dev](#4-quick-start--local-dev)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Running the Full Stack](#8-running-the-full-stack)
9. [Mobile App (MAUI)](#9-mobile-app-maui)
10. [Reference Documents](#10-reference-documents)

---

## 1. Overview

**Vinh Khanh Food Tour** is a GPS audio tour platform for the Vinh Khanh street food district in Ho Chi Minh City.

When a tourist enters the geofence of a food stall, the mobile app automatically plays an audio narration about that venue in the tourist's chosen language (Vietnamese, English, etc.).

### Key Features

| Feature | Description |
|---|---|
| **GPS Geofencing** | Each POI has a configurable trigger radius; narration plays automatically on entry |
| **Multilingual** | Pre-recorded MP3 or Azure TTS-generated narration per language per POI |
| **Offline-first** | Mobile app syncs all POIs + audio for use without network |
| **Vendor Portal** | Shop owners manage their own listing, menu, and view their analytics |
| **Admin Panel** | Web dashboard for POIs, users, categories, and system settings |
| **Visit Analytics** | Track visits, language preferences, and listening duration per POI |

---

## 2. System Architecture

```
Admin / Vendor Browser              Tourist Phone
┌─────────────────────────┐    ┌───────────────────────────┐
│  React 19 Admin Panel   │    │  .NET MAUI Mobile App     │
│  Ant Design 6 · Vite 7  │    │  Android / iOS            │
│  port 5173 (admin)      │    │  GPS · Geofence · Audio   │
│  port 5174 (vendor)     │    │  Offline SQLite cache     │
└──────────┬──────────────┘    └──────────┬────────────────┘
           │ HTTPS / REST                  │ HTTPS / REST
           ▼                               ▼
  ┌────────────────────────────────────────────────────┐
  │              ASP.NET Core 10 REST API              │
  │            Clean Architecture (Onion)              │
  │   API → Application → Domain ← Infrastructure     │
  │                                                    │
  │   JWT Auth (HMAC-SHA256) · PBKDF2-SHA256 · Role-scoped    │
  └──────────────────────┬─────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐  ┌──────────┐  ┌───────────────┐
   │ MySQL 8.0  │  │  AWS S3  │  │  Azure TTS    │
   │  (main DB) │  │  (audio) │  │  (narration)  │
   └────────────┘  └──────────┘  └───────────────┘
```

**Production infrastructure:**

```
Internet → CloudFront (SPA) → S3 (admin/vendor frontend)
         → ALB (HTTPS 443) → ECS Fargate → VinhKhanh.API
                                         → RDS MySQL 8.0
                                         → S3 (audio/zip)
Mobile → ALB API endpoint
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for full details.

---

## 3. Repository Structure

```
c-sharp-au/
├── backend/
│   └── src/
│       ├── VinhKhanh.API/              ← Controllers, Middleware, Program.cs, DI
│       ├── VinhKhanh.Application/      ← IServices.cs, DTOs.cs (1 file per type)
│       ├── VinhKhanh.Domain/           ← Entities, Enums, Interfaces (zero deps)
│       └── VinhKhanh.Infrastructure/   ← EF Core, Repositories, Services
│
├── admin-frontend/                     ← Admin + Vendor panel (React 19 · Ant Design 6)
│   └── src/
│       ├── api.js                      ← Centralized HTTP client, auto token refresh
│       ├── context/AuthContext.jsx
│       ├── hooks/useCurrentUser.js     ← JWT decoder (role, vendorPOIId)
│       ├── components/                 ← MapPicker, AudioPreview, POIForm, ...
│       └── pages/                      ← Dashboard, POI, Analytics, Users, ...
│
├── vendor-frontend/                    ← Vendor-only panel (port 5174)
│
├── mobile/
│   └── VinhKhanh.Mobile/              ← .NET MAUI (Android + iOS)
│       ├── Services/                   ← LocationService, GeofenceEngine, NarrationPlayer
│       ├── ViewModels/                 ← MVVM ViewModels
│       ├── Views/                      ← XAML Pages (MapPage, MainPage, OfflinePage)
│       ├── Platforms/Android/          ← AndroidLocationService, Manifest
│       ├── Platforms/iOS/              ← IosLocationService, Info.plist
│       └── appsettings.json           ← API base URL (embedded resource)
│
├── Database/                           ← SQL migration scripts (run in order)
│   ├── 001_CreateDatabase.sql
│   ├── 002_CreateTables.sql
│   ├── 003_CreateIndexes.sql
│   ├── 004_CreateStoredProcedures.sql
│   ├── 005_SeedData.sql
│   ├── 006_AddPhase1Columns.sql
│   ├── 007_ResetData.sql
│   ├── 008_MockData.sql
│   └── 009_PasswordResetColumns.sql
│
├── docs/                               ← Technical documentation site (static HTML)
│   └── README.md                       ← How to run the docs site
│
├── test-plan/
│   └── backend-mobile/                 ← Test scenarios, UAT checklists
│
├── README.md                           ← This file
├── ARCHITECTURE.md                     ← Clean Architecture, layer map, design decisions
├── API_REFERENCE.md                    ← All REST endpoints (mapped from Controllers.cs)
├── VENDOR_PORTAL.md                    ← Vendor role, JWT scoping, two-layer security
├── DEPLOYMENT.md                       ← Docker, AWS ECS, Nginx, mobile build
├── RUNBOOK.md                          ← Ops runbook (redeploy, rollback, logs)
└── CLAUDE.md                           ← Mandatory rules for AI agents on this codebase
```

---

## 4. Quick Start — Local Dev

### Requirements

| Tool | Version | Used for |
|---|---|---|
| .NET SDK | 10.0 | Backend + Mobile |
| Node.js | 20 LTS | Admin/Vendor Frontend |
| MySQL | 8.0+ | Database |
| Android SDK | API 26+ | MAUI Android builds |

### 4.1 Clone the repo

```powershell
git clone https://github.com/codeweb2005/csharp-project.git
cd csharp-project
```

### 4.2 Database setup

```powershell
$MYSQL_USER = "root"
$scripts = @(
    "Database/001_CreateDatabase.sql",
    "Database/002_CreateTables.sql",
    "Database/003_CreateIndexes.sql",
    "Database/004_CreateStoredProcedures.sql",
    "Database/005_SeedData.sql",
    "Database/006_AddPhase1Columns.sql",
    "Database/007_ResetData.sql",
    "Database/008_MockData.sql",
    "Database/009_PasswordResetColumns.sql"
)
foreach ($s in $scripts) { mysql -u $MYSQL_USER -p VinhKhanhFoodTour < $s }
```

### 4.3 Backend

```powershell
cd backend/src/VinhKhanh.API
dotnet run
# API:     http://localhost:5015
# Swagger: http://localhost:5015/swagger
```

Create a local config file (do not commit):

```json
// backend/src/VinhKhanh.API/appsettings.Development.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=VinhKhanhFoodTour;Uid=root;Pwd=<YOUR_PASSWORD>;CharSet=utf8mb4;"
  },
  "FileStorage": { "Provider": "local" },
  "Email": { "Provider": "null" }
}
```

### 4.4 Admin Frontend

```powershell
cd admin-frontend
Copy-Item .env.example .env
npm install
npm run dev
# http://localhost:5173
```

### 4.5 Vendor Frontend (optional)

```powershell
cd vendor-frontend
Copy-Item .env.example .env
npm install
npm run dev
# http://localhost:5174
```

### Default admin account (from seed data)

| Field | Value |
|---|---|
| Email | `admin@vinhkhanh.app` |
| Password | `Admin@123456` |

> ⚠️ Change this password immediately in any staging or production environment.

---

## 5. User Roles & Permissions

Three roles are enforced at **both layers**: JWT claim (backend) + UI gating (frontend).

| Role | Description | Access |
|---|---|---|
| **Admin** | System administrator | Full access — POIs, Users, Settings, Analytics, Offline Packages |
| **Vendor** | Shop owner | Own POI only — listing, menu, audio, own analytics |
| **Customer** | Tourist (mobile app) | Public POIs, audio playback, offline sync |

### Two-layer security

```
Layer 1 (Frontend — UX only):
  useCurrentUser() → isVendor / isAdmin
  → Show/hide buttons and routes
  → Can be bypassed — NEVER trust this alone

Layer 2 (Backend — authoritative):
  [Authorize(Roles = "Admin")] / [Authorize(Roles = "Admin,Vendor")]
  Vendor POI IDs fetched fresh from DB (not JWT claim)
  Vendor write → ownership check (403 if not their POI)
```

See [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md) for details.

---

## 6. Environment Variables

### Backend — `appsettings.json`

| Key | Required | Description |
|---|---|---|
| `ConnectionStrings:DefaultConnection` | ✅ | MySQL connection string |
| `Jwt:Key` | ✅ | HMAC-SHA256 signing key (≥ 32 chars) |
| `Jwt:Issuer` | ✅ | Token issuer |
| `Jwt:Audience` | ✅ | Token audience |
| `Jwt:ExpiryMinutes` | ✅ | Access token TTL (default: `60`) |
| `Jwt:RefreshExpiryDays` | ✅ | Refresh token TTL (default: `7`) |
| `FileStorage:Provider` | ✅ | `local` or `s3` |
| `FileStorage:S3BucketName` | S3 only | S3 bucket name |
| `AzureTTS:SubscriptionKey` | ⚠️ | Azure Cognitive Services key |
| `AzureTTS:Region` | ⚠️ | e.g. `southeastasia` |
| `CORS_ALLOWED_ORIGINS` | ✅ | Frontend URLs (comma-separated) |

### Frontend — `.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | e.g. `http://localhost:5015/api/v1` |
| `VITE_GOOGLE_MAPS_API_KEY` | ⚠️ | Google Maps JS API key for MapPicker |

### Mobile — `appsettings.json` (embedded resource)

```json
{
  "ApiBaseUrl": "http://10.0.2.2:5015/api/v1",
  "DefaultLanguageId": 1
}
```

> `10.0.2.2` = host machine IP as seen from Android Emulator. Use the actual LAN IP for a physical device.

---

## 7. Database Setup

Schema is managed with **numbered SQL scripts** in `Database/` — EF Core Migrations are not used.

| Script | Contents |
|---|---|
| `001_CreateDatabase.sql` | Create database + user |
| `002_CreateTables.sql` | All tables |
| `003_CreateIndexes.sql` | Indexes + spatial indexes |
| `004_CreateStoredProcedures.sql` | Stored procedures |
| `005_SeedData.sql` | Admin user, languages, default categories |
| `006_AddPhase1Columns.sql` | Priority column, Phase 1 additions |
| `007_ResetData.sql` | Reset data (dev/QA) |
| `008_MockData.sql` | Mock POI data for testing |
| `009_PasswordResetColumns.sql` | Password reset flow columns |

**New schema changes:** create the next file with an incremented number — `010_Description.sql`, `011_Description.sql`, etc.

See [`DEPLOYMENT.md § 4`](DEPLOYMENT.md#4-database-setup) for RDS setup guide.

---

## 8. Running the Full Stack

### Development (local)

```powershell
# Terminal 1 — Backend API
cd backend/src/VinhKhanh.API; dotnet run

# Terminal 2 — Admin Panel
cd admin-frontend; npm run dev

# Terminal 3 — Vendor Panel (optional)
cd vendor-frontend; npm run dev
```

### Production (Docker)

```powershell
# Build image from repo root
docker build -t vinhkhanh-api:latest .

# Run with env vars
docker run -d --name vinhkhanh-api -p 8080:8080 `
  --env-file .env.docker `
  vinhkhanh-api:latest

# Verify
curl http://localhost:8080/swagger
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full guide. Ops runbook at [`RUNBOOK.md`](RUNBOOK.md).

---

## 9. Mobile App (MAUI)

### Build & run Android (debug)

```powershell
cd mobile/VinhKhanh.Mobile

# Build APK
dotnet build -f net10.0-android -c Debug

# Install on emulator / device
adb install -r bin/Debug/net10.0-android/com.vinhkhanh.foodtour-Signed.apk

# Or run directly
dotnet run -f net10.0-android -c Debug
```

### GPS Mocking (Emulator)

```bash
adb emu geo fix 106.6932 10.7538   # Point A
adb emu geo fix 106.6940 10.7544   # Point B (move into geofence)
```

### Configure API URL

Update `mobile/VinhKhanh.Mobile/appsettings.json` before building:

```json
{
  "ApiBaseUrl": "http://<HOST_IP>:5015/api/v1",
  "DefaultLanguageId": 1
}
```

### Release build (Android AAB for Google Play)

```powershell
dotnet publish -f net10.0-android -c Release `
  /p:AndroidKeyStore=True `
  /p:AndroidSigningKeyStore=vinhkhanh.keystore `
  /p:AndroidSigningKeyAlias=vinhkhanh `
  /p:AndroidSigningKeyPass=<PASSWORD> `
  /p:AndroidSigningStorePass=<PASSWORD>
```

See [`DEPLOYMENT.md § 7`](DEPLOYMENT.md#7-mobile-app-deployment) for the full guide.

---

## 10. Reference Documents

| Document | Contents |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Clean Architecture layout, database design, auth flow, key decisions |
| [`API_REFERENCE.md`](API_REFERENCE.md) | All REST endpoints — request/response/auth for every route |
| [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md) | Vendor JWT scoping, two-layer security, creating vendor users |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Docker, AWS ECS Fargate, RDS, S3, Nginx, mobile release builds |
| [`RUNBOOK.md`](RUNBOOK.md) | Redeploy, rollback, logs, rotate secrets, incident checklist |
| [`CLAUDE.md`](CLAUDE.md) | Mandatory rules for AI agents working on this codebase |
| [`docs/`](docs/README.md) | Technical documentation site — architecture diagrams, UML, feature reference |
| [`test-plan/backend-mobile/`](test-plan/backend-mobile/) | Test scenarios, UAT checklists, execution guide |
