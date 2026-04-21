# 🏗️ Vinh Khanh Food Tour — Architecture

> **Pattern:** Clean Architecture (Onion)  
> **Backend:** ASP.NET Core 10 · EF Core · MySQL  
> **Frontend:** React 19 · Vite · React Router

---

## Table of Contents

1. [Clean Architecture](#1-clean-architecture)
2. [Project Layer Map](#2-project-layer-map)
3. [Database Design](#3-database-design)
4. [Authentication & Security](#4-authentication--security)
5. [API Design Conventions](#5-api-design-conventions)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Vendor Portal Design](#7-vendor-portal-design)
8. [Key Design Decisions](#8-key-design-decisions)

---

## 1. Clean Architecture

The backend follows Clean Architecture (Onion):

```
┌──────────────────────────────────────────────────┐
│               VinhKhanh.API                       │   ← Presentation
│   Controllers, Middleware, Program.cs, DI Setup   │
└──────────────────────┬───────────────────────────┘
                       │ depends on ↓
┌──────────────────────▼───────────────────────────┐
│            VinhKhanh.Application                  │   ← Use Cases
│   Service interfaces (IServices.cs), DTOs,        │
│   Request/Response models                         │
└──────────────────────┬───────────────────────────┘
                       │ depends on ↓
┌──────────────────────▼───────────────────────────┐
│              VinhKhanh.Domain                     │   ← Core
│   Entities (POI, User, VisitHistory, …)           │
│   Enums (UserRole, TriggerType, …)                │
│   Repository interfaces (no implementations)     │
└──────────────────────┬───────────────────────────┘
                       │ (only Domain is referenced by all)
┌──────────────────────▼───────────────────────────┐
│           VinhKhanh.Infrastructure                │   ← External Concerns
│   EF Core AppDbContext, Repositories, JwtService, │
│   AudioService, TTS, FileStorage, …               │
└──────────────────────────────────────────────────┘
```

**Rule:** Inner layers never reference outer layers. `Domain` has zero external NuGet dependencies.

---

## 2. Project Layer Map

### VinhKhanh.Domain

```
Domain/
├── Entities/
│   ├── POI.cs               ← Point of Interest
│   ├── POITranslation.cs    ← Multilingual names/descriptions
│   ├── User.cs              ← Admin, Vendor, Customer
│   ├── VisitHistory.cs      ← Geofence trigger events
│   ├── AudioNarration.cs    ← Audio file per language per POI
│   ├── MenuItem.cs          ← Menu items for a POI
│   ├── Category.cs          ← POI categories (Restaurant, Café, …)
│   ├── Language.cs          ← Supported languages
│   ├── RefreshToken.cs      ← JWT refresh token storage
│   └── …
└── Enums/
    ├── UserRole.cs          ← Admin | Vendor | Customer
    └── TriggerType.cs       ← GeofenceEnter | ManualPlay | Offline
```

### VinhKhanh.Application

```
Application/
├── Services/
│   └── IServices.cs         ← ALL service interfaces in one file (by design)
└── DTOs/
    └── DTOs.cs              ← ALL DTOs/requests in one file (by design)
```

> **Why one file each?** For a small-to-medium project this is pragmatic — no cross-file navigation needed and the entire contract surface is visible at a glance. Split when the file exceeds ~500 lines.

### VinhKhanh.Infrastructure

```
Infrastructure/
├── Data/
│   └── AppDbContext.cs      ← EF Core DbContext
├── Repositories/
│   └── POIRepository.cs     ← Custom queries beyond EF generic
└── Services/
    ├── AuthService.cs
    ├── JwtService.cs        ← Token generation + vendorPoiId claim
    ├── DashboardService.cs  ← Vendor-scoped stats
    ├── AnalyticsService.cs  ← Vendor-scoped analytics
    ├── POIService.cs        ← Ownership guard on UpdateAsync
    ├── AudioService.cs
    ├── MenuService.cs
    ├── UserService.cs
    └── …
```

### VinhKhanh.API

```
API/
├── Controllers/
│   └── Controllers.cs       ← ALL controllers in one file (pragmatic)
├── Middleware/
│   └── ExceptionMiddleware.cs
└── Program.cs               ← DI registration, CORS, JWT, Swagger
```

---

## 3. Database Design

### Core Tables

```sql
POIs                    -- Points of Interest
  Id, CategoryId, VendorUserId, Latitude, Longitude,
  GeofenceRadius, Priority, Address, Phone, Website,
  PriceRangeMin, PriceRangeMax, OpeningHours,
  IsActive, IsFeatured, TotalVisits, Rating

POITranslations         -- One row per POI per Language
  POIId, LanguageId, Name, ShortDescription,
  FullDescription, NarrationText, Highlights(JSON)

Users                   -- Admin / Vendor / Customer
  Id, Email, PasswordHash, FullName, Role(enum),
  IsActive, CreatedAt, LastLoginAt

AudioNarrations         -- MP3 files per POI per Language
  Id, POIId, LanguageId, FilePath, DurationSeconds,
  IsDefault, IsActive, TTSGenerated

VisitHistory            -- Geofence events (audit + analytics)
  Id, POIId, UserId(nullable), LanguageId,
  TriggerType, NarrationPlayed, ListenDuration,
  VisitedAt

Categories              -- POI categories
  Id, Icon, Color, IsActive, SortOrder

Languages               -- Supported languages
  Id, Code, NativeName, FlagEmoji, IsActive, SortOrder

MenuItems               -- Food/drink menu per POI
  Id, POIId, Name, Description, Price, Category,
  IsAvailable, IsSignature, ImagePath

RefreshTokens           -- JWT refresh token store
  Id, UserId, Token(hashed), ExpiresAt, IsRevoked
```

### Key Design Choices

- **`VendorUserId` on POI:** Links a POI to its owning Vendor. NULL = Admin-managed.
- **`Priority` on POI:** Geofence conflict resolution — highest `Priority` wins when multiple POIs overlap.
- **`TotalVisits` denormalized on POI:** Avoids COUNT() on large VisitHistory tables for list views.
- **Spatial queries:** `ST_Distance_Sphere(Point(lng, lat), Point(poi.Longitude, poi.Latitude))` for nearby queries.
- **No EF Migrations:** Schema changes tracked as numbered SQL scripts — `Database/00N_*.sql`.

---

## 4. Authentication & Security

### JWT Flow

```
Client                Backend
  │                      │
  │  POST /auth/login     │
  │ ─────────────────────►│ Validate credentials
  │                       │ Build claims (sub, email, role, vendorPoiId?)
  │  { accessToken,       │ Sign HMAC-SHA256
  │    refreshToken }     │
  │ ◄─────────────────────│
  │                       │
  │  API call + Bearer    │
  │ ─────────────────────►│ Validate JWT signature
  │                       │ Extract claims
  │                       │ Call service with role/vendorPoiId
  │  Response             │
  │ ◄─────────────────────│
```

### Claims in the JWT

| Claim | Present for | Description |
|---|---|---|
| `sub` | Everyone | User ID |
| `email` | Everyone | User email |
| `name` | Everyone | Display name |
| `role` | Everyone | `Admin`, `Vendor`, or `Customer` |
| `jti` | Everyone | Unique token ID (for revocation) |
| `iat` | Everyone | Issued-at timestamp |
| `vendorPoiId` | **Vendor only** | ID of the Vendor's linked POI |

### Role Enforcement

```
Route attributes:
  [Authorize]                     → Any authenticated user
  [Authorize(Roles = "Admin")]    → Admin only
  [Authorize(Roles = "Admin,Vendor")] → Admin or Vendor
  [AllowAnonymous]                → Public (mobile app endpoints)
```

Vendor data scoping is an additional layer beyond route authorization — see [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md).

### Password Storage

- `PBKDF2-SHA256` with 100,000 iterations and a 16-byte random salt (`PasswordHasher.cs`)
- Constant-time comparison via `CryptographicOperations.FixedTimeEquals`
- Passwords are never stored in plaintext or logged

### Refresh Tokens

- Cryptographically secure random bytes (64-byte, Base64 encoded)
- Stored as SHA-256 hash in `RefreshTokens` table
- Rotated on every use (rotation + revocation on reuse detection)

---

## 5. API Design Conventions

### Base URL

```
http://localhost:5015/api/v1/   ← Development
https://api.vinhkhanh.com/api/v1/ ← Production
```

### Response Envelope

All responses use a consistent wrapper:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "POI not found"
  }
}
```

### HTTP Status Codes

| Code | When |
|---|---|
| `200 OK` | Successful query or update |
| `201 Created` | Resource created (some creates return 200) |
| `400 Bad Request` | Validation failure |
| `401 Unauthorized` | Missing or expired JWT |
| `403 Forbidden` | Valid JWT but insufficient permissions |
| `404 Not Found` | Resource does not exist |

### Pagination

List endpoints return a `PagedResult<T>`:

```json
{
  "items": [...],
  "totalCount": 42,
  "page": 1,
  "pageSize": 15
}
```

---

## 6. Frontend Architecture

There are **three** browser SPAs: **admin-frontend** (port 5173), **vendor-frontend** (port 5174), and **visitor-frontend** (port 5175). Admin and vendor share JWT auth and the management UI patterns described below. **visitor-frontend** is a separate app for tourists: no login, anonymous public API only (`/languages`, `/pois/nearby`, `/pois/{id}/public`, audio stream URLs, offline catalog), implemented in `visitor-frontend/src/api.js`.

### Stack

- **React 19** with functional components + hooks
- **React Router v7** for SPA routing
- **Vite 7** for bundling
- **Lucide React** for icons
- **Vanilla CSS** — no Tailwind, no CSS-in-JS

### Key Files

| File | Purpose |
|---|---|
| `src/api.js` | Centralised HTTP client — all API calls go through here. Auto-refreshes expired tokens. |
| `src/context/AuthContext.jsx` | Auth state (user object, loading flag). Consumed by `useAuth()`. |
| `src/hooks/useCurrentUser.js` | Decodes JWT from localStorage → role flags, vendorPOIId. No API call. |
| `src/App.jsx` | Root router. `DashboardRoute` picks Admin vs Vendor dashboard. |
| `src/components/Layout/Sidebar.jsx` | Role-gated navigation sidebar. |

### Auth Flow

```
Login Page
  │ POST /auth/login
  │ Store { accessToken, refreshToken } in localStorage
  ▼
AuthContext (re-reads from localStorage)
  │ user = { role, id, … } via GET /auth/me
  ▼
ProtectedRoute (checks user != null)
  ▼
App Router → render page
  │
  useCurrentUser() ← decodes JWT at render time (no API call)
  │
  isVendor / isAdmin flags → show/hide UI elements
```

### API Client — Auto Token Refresh

```
fetch() → 401 Unauthorized
  → read refreshToken from localStorage
  → POST /auth/refresh
  → store new tokens
  → retry original request
  → if refresh fails → clearTokens() + redirect /login
```

---

## 7. Vendor Portal Design

See [`VENDOR_PORTAL.md`](VENDOR_PORTAL.md) for the full specification.

**Summary:** Vendors share the same web panel as Admins, but:

- Only see their own POI in the POI list (backend-scoped via JWT claim)
- See only their own shop's visit stats / analytics
- Cannot create, delete, or "feature" POIs
- Cannot access Users, Settings, or Offline Packages pages

---

## 8. Key Design Decisions

### Why Clean Architecture?

The mobile app (Phase 2) will share domain concepts and service contracts. Clean Architecture ensures the business logic is not entangled with HTTP or database concerns, making it reusable.

### Why all controllers in one file?

`Controllers.cs` centralises the entire HTTP surface in one place. For this project size it speeds up navigation. The file is ~500 lines with clear comment separators per controller. Revisit at 1000+ lines.

### Why no EF Core Migrations?

Raw SQL scripts are version-controlled, human-readable, and can be run on any MySQL client without the .NET toolchain. This matters when the DBA or infrastructure team applies schema changes independently of the app team.

### Why MySQL over PostgreSQL?

The target hosting environment already has MySQL. `ST_Distance_Sphere` covers the spatial query needs. Would move to PostGIS on PostgreSQL if complex spatial indexing becomes a bottleneck.

### Why Azure TTS over AWS Polly?

Azure Cognitive Services offers better Vietnamese voice quality (`vi-VN-HoaiMyNeural`). The service is called on-demand for TTS generation and the resulting MP3 is cached locally — runtime dependency is minimal.

### Why MAUI over React Native or Flutter?

The team has C# experience and the backend is ASP.NET Core. MAUI reuses language, tooling, and potentially some shared domain models. For a single-city PoC, the iOS/Android deployment via MAUI is acceptable.
