# 🍜 Vinh Khanh Food Tour

> **Audio tour platform cho tuyến phố ẩm thực Vinh Khanh, TP.HCM**

[![Backend](https://img.shields.io/badge/Backend-ASP.NET_Core_10-512BD4?logo=dotnet)](https://dotnet.microsoft.com)
[![Frontend](https://img.shields.io/badge/Frontend-React_19_/_Vite-61DAFB?logo=react)](https://react.dev)
[![Mobile](https://img.shields.io/badge/Mobile-.NET_MAUI-512BD4?logo=dotnet)](https://dotnet.microsoft.com/apps/maui)
[![Database](https://img.shields.io/badge/Database-MySQL_8-4479A1?logo=mysql)](https://www.mysql.com)

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Cấu trúc Repository](#3-cấu-trúc-repository)
4. [Quick Start — Local Dev](#4-quick-start--local-dev)
5. [User Roles & Phân quyền](#5-user-roles--phân-quyền)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Chạy toàn bộ stack](#8-chạy-toàn-bộ-stack)
9. [Mobile App (MAUI)](#9-mobile-app-maui)
10. [Trạng thái dự án](#10-trạng-thái-dự-án)
11. [Tài liệu tham khảo](#11-tài-liệu-tham-khảo)

---

## 1. Tổng quan

**Vinh Khanh Food Tour** là platform audio tour định vị GPS cho tuyến phố ẩm thực Vinh Khanh.

Khi du khách bước vào vùng geofence của một quán ăn, app di động tự động phát thuyết minh âm thanh về quán đó — bằng ngôn ngữ du khách đã chọn (Tiếng Việt, Tiếng Anh, ...).

### Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **GPS Geofencing** | POI có bán kính trigger tùy chỉnh, phát narration tự động khi vào vùng |
| **Đa ngôn ngữ** | MP3 thu âm sẵn hoặc Azure TTS per ngôn ngữ per POI |
| **Offline-first** | Mobile sync toàn bộ POI + audio để dùng không cần mạng |
| **Vendor Portal** | Chủ quán tự quản lý listing, menu, xem analytics của mình |
| **Admin Panel** | Dashboard web quản lý POIs, users, categories, cài đặt hệ thống |
| **Visit Analytics** | Theo dõi lượt ghé thăm, ngôn ngữ, thời gian nghe theo POI |

---

## 2. Kiến trúc hệ thống

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
  │   JWT Auth (HMAC-SHA256) · BCrypt · Role-scoped    │
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

Xem chi tiết tại [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 3. Cấu trúc Repository

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
│       ├── api.js                      ← HTTP client tập trung, auto token refresh
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
├── test-plan/
│   └── backend-mobile/                 ← Test scenarios, UAT checklists, execution guide
│
├── README.md                           ← File này
├── ARCHITECTURE.md                     ← Clean Architecture, layer map, design decisions
├── API_REFERENCE.md                    ← Toàn bộ REST endpoints
├── VENDOR_PORTAL.md                    ← Vendor role, JWT scoping, two-layer security
├── DEPLOYMENT.md                       ← Docker, AWS ECS, Nginx, mobile build
├── RUNBOOK.md                          ← Ops runbook (redeploy, rollback, logs)
└── CLAUDE.md                           ← Quy tắc cho AI agents làm việc trên codebase
```

---

## 4. Quick Start — Local Dev

### Yêu cầu

| Tool | Version | Dùng cho |
|---|---|---|
| .NET SDK | 10.0 | Backend + Mobile |
| Node.js | 20 LTS | Admin/Vendor Frontend |
| MySQL | 8.0+ | Database |
| Android SDK | API 26+ | MAUI Android build |

### 4.1 Clone repo

```powershell
git clone https://github.com/codeweb2005/c-sharp-au.git
cd c-sharp-au
```

### 4.2 Cài đặt database

```powershell
$MYSQL = "mysql"   # hoặc đường dẫn đầy đủ tới mysql.exe
$USER  = "root"

# Chạy lần lượt từng script
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
foreach ($s in $scripts) { & $MYSQL -u $USER -p -e "source $s" }
```

### 4.3 Backend

```powershell
cd backend/src/VinhKhanh.API
dotnet run
# API:     http://localhost:5015
# Swagger: http://localhost:5015/swagger
```

Tạo file config local (không commit):

```powershell
# Tạo appsettings.Development.json với DB password và JWT key
```

### 4.4 Admin Frontend

```powershell
cd admin-frontend
Copy-Item .env.example .env
# Chỉnh VITE_API_BASE_URL nếu cần
npm install
npm run dev
# http://localhost:5173
```

### 4.5 Vendor Frontend (tuỳ chọn)

```powershell
cd vendor-frontend
Copy-Item .env.example .env
npm install
npm run dev
# http://localhost:5174
```

### Tài khoản admin mặc định (seed data)

| Field | Value |
|---|---|
| Email | `admin@vinhkhanh.app` |
| Password | `Admin@123456` |

> ⚠️ Thay đổi ngay password này trong mọi môi trường staging/production.

---

## 5. User Roles & Phân quyền

Ba role được enforce tại **cả hai lớp**: JWT claim (backend) + UI gating (frontend).

| Role | Mô tả | Truy cập |
|---|---|---|
| **Admin** | Quản trị viên hệ thống | Toàn bộ — POIs, Users, Settings, Analytics, Offline Packages |
| **Vendor** | Chủ quán | Chỉ POI của mình — listing, menu, audio, analytics riêng |
| **Customer** | Du khách (mobile app) | Xem POI công khai, phát audio, sync offline data |

### Two-layer security

```
Layer 1 (Frontend — UX only):
  useCurrentUser() → isVendor / isAdmin
  → Ẩn/hiện buttons, route khác nhau
  → Có thể bypass — KHÔNG tin tưởng

Layer 2 (Backend — authoritative):
  [Authorize(Roles = "Admin")] / [Authorize(Roles = "Admin,Vendor")]
  vendorPoiId JWT claim → scoped DB queries
  Vendor write → ownership check (403 nếu không phải POI của họ)
```

Xem chi tiết tại [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md).

---

## 6. Environment Variables

### Backend — `appsettings.json`

| Key | Bắt buộc | Mô tả |
|---|---|---|
| `ConnectionStrings:DefaultConnection` | ✅ | MySQL connection string |
| `Jwt:Key` | ✅ | HMAC-SHA256 signing key (≥ 32 ký tự) |
| `Jwt:Issuer` | ✅ | Token issuer |
| `Jwt:Audience` | ✅ | Token audience |
| `Jwt:ExpiryMinutes` | ✅ | Access token TTL (mặc định: `60`) |
| `Jwt:RefreshExpiryDays` | ✅ | Refresh token TTL (mặc định: `7`) |
| `FileStorage:Provider` | ✅ | `local` hoặc `s3` |
| `FileStorage:S3BucketName` | S3 only | Tên S3 bucket |
| `AzureTTS:SubscriptionKey` | ⚠️ | Azure Cognitive Services key |
| `AzureTTS:Region` | ⚠️ | VD: `southeastasia` |
| `CORS_ALLOWED_ORIGINS` | ✅ | Frontend URLs (comma-separated) |

### Frontend — `.env`

| Variable | Bắt buộc | Mô tả |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | VD: `http://localhost:5015/api/v1` |
| `VITE_GOOGLE_MAPS_API_KEY` | ⚠️ | Google Maps JS API key cho MapPicker |

### Mobile — `appsettings.json` (embedded resource)

```json
{
  "ApiBaseUrl": "http://10.0.2.2:5015/api/v1",
  "DefaultLanguageId": 1
}
```

> `10.0.2.2` = host machine IP từ Android Emulator. Dùng IP thật cho physical device.

---

## 7. Database Setup

Schema được quản lý bằng **numbered SQL scripts** trong `Database/` — không dùng EF Core Migrations.

| Script | Nội dung |
|---|---|
| `001_CreateDatabase.sql` | Tạo database + user |
| `002_CreateTables.sql` | Toàn bộ tables |
| `003_CreateIndexes.sql` | Indexes + spatial indexes |
| `004_CreateStoredProcedures.sql` | Stored procedures |
| `005_SeedData.sql` | Admin user, languages, categories mặc định |
| `006_AddPhase1Columns.sql` | Priority column, Phase 1 additions |
| `007_ResetData.sql` | Reset data (dev/QA) |
| `008_MockData.sql` | Mock POI data cho testing |
| `009_PasswordResetColumns.sql` | Password reset flow columns |

**Schema mới:** tạo file tiếp theo với số tăng dần — `010_MoTa.sql`, `011_MoTa.sql`, ...

Xem hướng dẫn setup RDS tại [`DEPLOYMENT.md § 4`](DEPLOYMENT.md#4-database-setup).

---

## 8. Chạy toàn bộ stack

### Development (local)

```powershell
# Terminal 1 — Backend API
cd backend/src/VinhKhanh.API; dotnet run

# Terminal 2 — Admin Panel
cd admin-frontend; npm run dev

# Terminal 3 — Vendor Panel (tuỳ chọn)
cd vendor-frontend; npm run dev
```

### Production (Docker)

```powershell
# Build image từ repo root
docker build -t vinhkhanh-api:latest .

# Chạy với env vars
docker run -d --name vinhkhanh-api -p 8080:8080 `
  --env-file .env.docker `
  vinhkhanh-api:latest

# Kiểm tra
curl http://localhost:8080/swagger
```

Xem đầy đủ tại [`DEPLOYMENT.md`](DEPLOYMENT.md). Ops runbook tại [`RUNBOOK.md`](RUNBOOK.md).

---

## 9. Mobile App (MAUI)

### Build & chạy Android (debug)

```powershell
cd mobile/VinhKhanh.Mobile

# Build APK
dotnet build -f net10.0-android -c Debug

# Cài lên emulator / device
adb install -r bin/Debug/net10.0-android/com.vinhkhanh.foodtour-Signed.apk

# Hoặc chạy trực tiếp
dotnet run -f net10.0-android -c Debug
```

### GPS Mocking (Emulator)

```bash
adb emu geo fix 106.6932 10.7538   # Point A
adb emu geo fix 106.6940 10.7544   # Point B (di chuyển vào geofence)
```

### Cấu hình API URL

Trước khi build, cập nhật `mobile/VinhKhanh.Mobile/appsettings.json`:

```json
{
  "ApiBaseUrl": "http://<HOST_IP>:5015/api/v1",
  "DefaultLanguageId": 1
}
```

### Release build (Android AAB cho Google Play)

```powershell
dotnet publish -f net10.0-android -c Release `
  /p:AndroidKeyStore=True `
  /p:AndroidSigningKeyStore=vinhkhanh.keystore `
  /p:AndroidSigningKeyAlias=vinhkhanh `
  /p:AndroidSigningKeyPass=<PASSWORD> `
  /p:AndroidSigningStorePass=<PASSWORD>
```

Xem đầy đủ tại [`DEPLOYMENT.md § 7`](DEPLOYMENT.md#7-mobile-app-deployment).

---

## 10. Trạng thái dự án

| Phase | Trạng thái | Mô tả |
|---|---|---|
| **Phase 1** — Backend & Admin Panel | ✅ **Hoàn thành** | REST API, Google Maps POI editor, Vendor Portal, Audio TTS |
| **Phase 2** — MAUI Mobile PoC | ✅ **Hoàn thành** | GPS geofencing, audio narration, map view, offline sync service |
| **Phase 3** — MAUI Mobile MVP | 🚧 **Đang làm** | Background GPS, visit tracking, settings UI, delta sync |
| **Phase 4** — AWS Production | ⬜ **Kế hoạch** | ECS Fargate, RDS Multi-AZ, S3, CloudFront |

### Phase 3 — Các tính năng còn lại

| Nhóm | Tính năng |
|---|---|
| 🔴 Critical | Background GPS (Android ForegroundService + iOS CLLocationManager) |
| 🔴 Critical | Permission nâng cấp `LocationWhenInUse` → `LocationAlways` |
| 🔴 Critical | Geofence cooldown per POI (tránh phát lại liên tục) |
| 🟡 Medium | Visit tracking upload lên server (`POST /sync/visits`) |
| 🟡 Medium | Settings UI (radius, cooldown, auto-play toggle) |
| 🟡 Medium | Local notification khi geofence trigger ở background |
| 🟠 Low | Delta sync (`GET /sync/delta`) để cập nhật POI sau khi cài app |
| 🟠 Low | Narration error handling + TTS fallback |

---

## 11. Tài liệu tham khảo

| Tài liệu | Nội dung |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Clean Architecture layout, database design, auth flow, key decisions |
| [`API_REFERENCE.md`](API_REFERENCE.md) | Toàn bộ REST endpoints — request/response/auth cho mọi route |
| [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md) | Vendor JWT scoping, two-layer security, tạo vendor user |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Docker, AWS ECS Fargate, RDS, S3, Nginx, mobile release |
| [`RUNBOOK.md`](RUNBOOK.md) | Redeploy, rollback, xem logs, rotate secrets, incident checklist |
| [`CLAUDE.md`](CLAUDE.md) | Quy tắc bắt buộc cho AI agents khi làm việc trên codebase |
| [`test-plan/backend-mobile/`](test-plan/backend-mobile/) | Test scenarios, UAT checklists, execution guide |
