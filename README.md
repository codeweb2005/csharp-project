# 🍜 Vinh Khanh Food Tour — Main README

> **Stack:** ASP.NET Core 10 (Clean Architecture) · React 19 / Vite · MySQL 8  
> **Roles:** Admin · Vendor (shop owner) · Customer (mobile tourist)  
> **Last updated:** 2026-03-21

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [System Architecture](#3-system-architecture)
4. [Quick Start — Local Development](#4-quick-start--local-development)
5. [User Roles & Access Control](#5-user-roles--access-control)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Running the Stack](#8-running-the-stack)
9. [Project Phases](#9-project-phases)
10. [Further Reading](#10-further-reading)

---

## 1. Project Overview

**Vinh Khanh Food Tour** is a location-aware audio tour platform for the Vinh Khanh food street.

When a tourist walks within range of a restaurant or street stall, their phone automatically detects the geofence and plays an audio narration about the venue — in the tourist's preferred language (Vietnamese, English, and more).

### Key features

| Feature | Description |
|---|---|
| GPS geofencing | Points of Interest (POIs) have configurable radius triggers |
| Multilingual audio | Pre-recorded MP3 or Azure TTS narration per language per POI |
| Offline mode | Mobile app can sync POI + audio data for offline-first use |
| Vendor portal | Shop owners manage their own listing, menu, and view analytics |
| Admin panel | Web dashboard for managing all POIs, users, categories, settings |
| Visit analytics | Track visits, language distribution, narration plays per POI |

---

## 2. Repository Structure

```
Application/
├── backend/                        ← ASP.NET Core 10 REST API
│   └── src/
│       ├── VinhKhanh.API/          ← Entry point, Controllers, Middleware, DI
│       ├── VinhKhanh.Application/  ← Service interfaces, DTOs, business logic
│       ├── VinhKhanh.Domain/       ← Entities, enums (no dependencies)
│       └── VinhKhanh.Infrastructure/ ← EF Core, Repositories, JwtService, etc.
│
├── admin-frontend/                 ← React 19 + Vite admin/vendor web panel
│   └── src/
│       ├── api.js                  ← Centralised HTTP client (auto token refresh)
│       ├── context/AuthContext.jsx ← Auth state provider
│       ├── hooks/useCurrentUser.js ← JWT claim decoder hook
│       ├── components/             ← Reusable UI components
│       └── pages/                  ← Page-level components (Dashboard, POI, etc.)
│
├── Database/                       ← SQL migration scripts (run in order)
│   ├── 001_CreateDatabase.sql
│   ├── 002_CreateTables.sql
│   ├── 003_CreateIndexes.sql
│   ├── 004_CreateStoredProcedures.sql
│   ├── 005_SeedData.sql
│   └── 006_AddPhase1Columns.sql    ← Priority + Phase 1 additions
│
├── README.md                       ← This file
├── DEPLOYMENT.md                   ← Server deployment guide (Nginx, systemd, Docker)
├── ARCHITECTURE.md                 ← Architecture decisions + Clean Architecture layout
├── API_REFERENCE.md                ← All REST endpoints (request/response/auth)
└── VENDOR_PORTAL.md                ← Vendor role design and JWT scoping
```

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Admin / Vendor Browser                   Tourist Phone          │
│  ┌────────────────────────┐          ┌──────────────────────┐   │
│  │  React 19 Admin Panel  │          │  .NET MAUI Mobile App │   │
│  │  (Vite, React Router)  │          │  (Android / iOS)      │   │
│  └──────────┬─────────────┘          └──────────┬───────────┘   │
└─────────────│────────────────────────────────────│───────────────┘
              │ HTTPS / REST                        │ HTTPS / REST
              ▼                                     ▼
    ┌─────────────────────────────────────────────────────┐
    │            ASP.NET Core 10 REST API                  │
    │  ┌──────────────────────────────────────────────┐   │
    │  │  Clean Architecture                          │   │
    │  │  API Layer → Application → Domain → Infra   │   │
    │  └──────────────────────────────────────────────┘   │
    │            JWT Authentication (RS/HS256)             │
    └────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   ┌─────────────┐             ┌──────────────────┐
   │  MySQL 8.0  │             │  Azure TTS API   │
   │  (main DB)  │             │  (audio gen.)    │
   └─────────────┘             └──────────────────┘
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full design document.

---

## 4. Quick Start — Local Development

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| .NET SDK | 10.0 | Backend |
| Node.js | 20 LTS | Frontend |
| MySQL | 8.0+ | Database |

### 4.1 Clone & configure

```powershell
git clone <repo-url>
cd Application
```

### 4.2 Database

```bash
mysql -u root -p < Database/001_CreateDatabase.sql
mysql -u root -p vinhkhanh_foodtour < Database/002_CreateTables.sql
mysql -u root -p vinhkhanh_foodtour < Database/003_CreateIndexes.sql
mysql -u root -p vinhkhanh_foodtour < Database/004_CreateStoredProcedures.sql
mysql -u root -p vinhkhanh_foodtour < Database/005_SeedData.sql
mysql -u root -p vinhkhanh_foodtour < Database/006_AddPhase1Columns.sql
```

### 4.3 Backend

```powershell
cd backend
# Create local config (NOT committed to git)
cp src/VinhKhanh.API/appsettings.json src/VinhKhanh.API/appsettings.Development.json
# Edit appsettings.Development.json — set your DB password, JWT key

# Run
cd src/VinhKhanh.API
dotnet run
# API + Swagger: http://localhost:5015/swagger
```

### 4.4 Frontend

```powershell
cd admin-frontend
cp .env.example .env.local
# Edit .env.local — set VITE_GOOGLE_MAPS_API_KEY if needed

npm install
npm run dev
# Admin panel: http://localhost:5173
```

### Default Admin Credentials (seed data)

| Field | Value |
|---|---|
| Email | `admin@vinhkhanh.com` |
| Password | `Admin@123456` |

> ⚠️ Change these immediately in any environment beyond local dev.

---

## 5. User Roles & Access Control

The system has three roles, enforced at the JWT + backend service layer:

| Role | Description | Dashboard | Manages |
|---|---|---|---|
| **Admin** | Platform operator | Global stats (all POIs) | Everything |
| **Vendor** | Shop owner | Own POI stats only | Own POI, menu, audio |
| **Customer** | Tourist (mobile app) | None | Own profile, visits |

### Two-layer enforcement

1. **Backend (authoritative):** JWT `role` claim checked on every request. Vendor API calls are scoped with the `vendorPoiId` claim — see [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md).
2. **Frontend (UX only):** `useCurrentUser` hook decodes JWT claims to show/hide UI elements. This is convenience only; the backend never trusts the frontend to enforce access.

---

## 6. Environment Variables

### Backend — `appsettings.json` keys

| Key | Required | Description |
|---|---|---|
| `ConnectionStrings:DefaultConnection` | ✅ | MySQL connection string |
| `Jwt:Key` | ✅ | HMAC-SHA256 signing key (min 32 chars) |
| `Jwt:Issuer` | ✅ | Token issuer (e.g. `VinhKhanhFoodTour`) |
| `Jwt:Audience` | ✅ | Token audience |
| `Jwt:ExpiryMinutes` | ✅ | Access token lifetime (e.g. `60`) |
| `Jwt:RefreshExpiryDays` | ✅ | Refresh token lifetime (e.g. `7`) |
| `AzureTTS:SubscriptionKey` | ⚠️ Optional | Azure Cognitive Services key for TTS |
| `AzureTTS:Region` | ⚠️ Optional | e.g. `southeastasia` |
| `FileStorage:BasePath` | ✅ | Local file upload directory |
| `FileStorage:Provider` | ⚠️ Optional | `local` (default) or `s3` (Phase 4) |

### Frontend — `.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend API base, e.g. `http://localhost:5015/api/v1` |
| `VITE_GOOGLE_MAPS_API_KEY` | ⚠️ Optional | Google Maps JS API key (MapPicker component) |

---

## 7. Database Setup

All schema changes are managed as numbered SQL scripts in [`Database/`](Database/).

Run them **in order** on a fresh install:

```
001_CreateDatabase.sql         → Creates DB + user
002_CreateTables.sql           → All tables
003_CreateIndexes.sql          → Indexes + spatial indexes
004_CreateStoredProcedures.sql → Stored procedures
005_SeedData.sql               → Admin user, languages, categories
006_AddPhase1Columns.sql       → Priority column, Phase 1 additions
```

> There is **no ORM migration** — EF Core is used Code-First but migrations are tracked as raw SQL scripts for portability and auditability.

---

## 8. Running the Stack

### Development (two terminals)

```powershell
# Terminal 1 — Backend
cd backend/src/VinhKhanh.API && dotnet run

# Terminal 2 — Frontend
cd admin-frontend && npm run dev
```

### Production

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full server deployment instructions including:

- Systemd service setup
- Nginx reverse proxy + SSL
- Docker Compose option
- AWS ECS (Phase 4)

---

## 9. Project Phases

| Phase | Status | Description |
|---|---|---|
| **Phase 1** — Backend & Admin Panel | ✅ **Complete** | API, Google Maps POI editor, Vendor Portal |
| **Phase 2** — MAUI Mobile PoC | ⬜ Next | GPS geofence + audio playback on device |
| **Phase 3** — MAUI Mobile MVP | ⬜ Planned | Offline sync, background GPS, full UI |
| **Phase 4** — AWS Deployment | ⬜ Planned | ECS Fargate, RDS, S3, CloudFront |

See [`task_list.md`](../brain/task_list.md) for detailed task breakdown.

---

## 10. Further Reading

| Document | Purpose |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design, Clean Architecture, key patterns |
| [`API_REFERENCE.md`](API_REFERENCE.md) | All REST endpoints, auth, request/response |
| [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md) | Vendor role, JWT scoping, how to create vendors |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Server deployment guide (Nginx, systemd, Docker) |
