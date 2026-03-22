# 🔌 Vinh Khanh Food Tour — API Reference

> **Base URL (dev):** `http://localhost:5015/api/v1`  
> **Base URL (prod):** `https://api.vinhkhanh.com/api/v1`  
> **Auth:** Bearer JWT in `Authorization` header  
> **Content-Type:** `application/json` (unless noted)

---

## Response Envelope

All endpoints return the same wrapper:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Human-readable message"
  }
}
```

**Error codes:**

| Code | HTTP Status | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource does not exist |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `UNAUTHORIZED` | 401 | Missing/expired JWT |
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| *(any other)* | 400 | General client error |

---

## Authentication

### POST `/auth/login`

Authenticate with email and password. Returns JWT access + refresh tokens.

**Auth:** ❌ None  
**Body:**

```json
{
  "email": "admin@vinhkhanh.com",
  "password": "Admin@123456"
}
```

**Response `data`:**

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "email": "admin@vinhkhanh.com",
    "fullName": "Administrator",
    "role": "Admin"
  }
}
```

---

### POST `/auth/refresh`

Exchange a refresh token for a new access token + refresh token pair (rotation).

**Auth:** ❌ None  
**Body:** `"<refresh_token>"` (plain string, not an object)

**Response `data`:** Same as `/auth/login`

---

### POST `/auth/register`

Register a new Customer account. Returns JWT immediately (user is logged in on register).

**Auth:** ❌ None  
**Body:**

```json
{
  "email": "tourist@example.com",
  "password": "Tourist@123",
  "fullName": "Nguyễn Văn A"
}
```

---

### POST `/auth/change-password`

**Auth:** ✅ Any authenticated user  
**Body:**

```json
{
  "currentPassword": "old",
  "newPassword": "New@Password123"
}
```

---

### GET `/auth/me`

Get the current authenticated user's profile.

**Auth:** ✅ Any authenticated user  
**Response `data`:** `UserDto`

---

## Points of Interest (POI)

### GET `/pois`

Paginated, filtered list of POIs.

**Auth:** ✅ Admin or Vendor  
**Vendor note:** Backend automatically scopes results to the Vendor's own POI via `vendorPoiId` JWT claim.

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `size` | int | 15 | Page size |
| `search` | string | — | Filter by name |
| `categoryId` | int | — | Filter by category |
| `isActive` | bool | — | Filter by active status |
| `sortBy` | string | `name` | Sort field |
| `order` | string | `asc` | `asc` or `desc` |

**Response `data`:** `PagedResult<POIListDto>`

```json
{
  "items": [
    {
      "id": 1,
      "name": "Quán Bún Bò Cô Linh",
      "categoryId": 2,
      "categoryName": "Bún Bò",
      "categoryIcon": "🍜",
      "address": "123 Vinh Khanh, Q4",
      "latitude": 10.7553,
      "longitude": 106.7017,
      "geofenceRadius": 50,
      "priority": 1,
      "isActive": true,
      "isFeatured": false,
      "totalVisits": 1234,
      "rating": 4.8
    }
  ],
  "totalCount": 42,
  "page": 1,
  "pageSize": 15
}
```

---

### GET `/pois/{id}`

Get full POI detail including translations.

**Auth:** ✅ Admin or Vendor  
**Response `data`:** `POIDetailDto` (includes `translations` array)

---

### GET `/pois/{id}/public`

Get POI detail for the mobile app (active POIs only).

**Auth:** ❌ Anonymous  
**Query params:** `?langId=1` (optional — filter translations to one language)

---

### GET `/pois/nearby`

Find POIs within a radius of coordinates. Used by the mobile app on boot.

**Auth:** ❌ Anonymous  
**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `lat` | double | ✅ | Latitude (-90 to 90) |
| `lng` | double | ✅ | Longitude (-180 to 180) |
| `radius` | int | ✅ | Radius in metres (max 5000) |
| `langId` | int | ❌ | Filter translations to this language |

**Response `data`:** `List<NearbyPOIDto>` sorted by distance ascending

---

### POST `/pois`

Create a new POI.

**Auth:** ✅ Admin only  
**Body:** `CreatePOIRequest`

```json
{
  "categoryId": 2,
  "address": "123 Vinh Khanh, Q4",
  "latitude": 10.7553,
  "longitude": 106.7017,
  "geofenceRadius": 50,
  "priority": 1,
  "phone": "028-1234-5678",
  "website": "https://example.com",
  "priceRangeMin": 30000,
  "priceRangeMax": 80000,
  "openingHours": "06:00–22:00",
  "isFeatured": false,
  "vendorUserId": 5,
  "translations": [
    {
      "languageId": 1,
      "name": "Quán Bún Bò Cô Linh",
      "shortDescription": "Bún bò nổi tiếng Q4",
      "fullDescription": "...",
      "narrationText": "Chào mừng bạn đến...",
      "highlights": ["Bún bò đặc biệt", "Giá bình dân"]
    }
  ]
}
```

---

### PUT `/pois/{id}`

Update a POI.

**Auth:** ✅ Admin or Vendor  
**Vendor restriction:** Can only update their own POI (`POI.VendorUserId == userId`). Returns `403` otherwise.  
**Body:** Same structure as `CreatePOIRequest` (all fields required)

---

### DELETE `/pois/{id}`

**Auth:** ✅ Admin only

---

### PATCH `/pois/{id}/toggle`

Toggle `IsActive` status.

**Auth:** ✅ Admin or Vendor

---

### PATCH `/pois/{id}/featured`

Toggle `IsFeatured` status.

**Auth:** ✅ Admin only

---

## Dashboard

> 📌 All dashboard endpoints support **Vendor scoping**. When called with a Vendor JWT, all data is filtered to the Vendor's own POI via the `vendorPoiId` claim — no extra parameters needed.

### GET `/dashboard/stats`

Summary statistics.

**Auth:** ✅ Admin or Vendor

**Response `data`:**

```json
{
  "activePOIs": 12,
  "totalVisits": 5432,
  "totalVisitsChange": 12.5,
  "languages": 3,
  "audioFiles": 47,
  "totalUsers": 289,
  "totalVendors": 12
}
```

> **Vendor view:** `totalUsers` and `totalVendors` are `0` (not their data). `activePOIs` is always `1`.

---

### GET `/dashboard/top-pois?count=5`

**Auth:** ✅ Admin or Vendor

---

### GET `/dashboard/visits-chart?from=2026-01-01&to=2026-03-31`

**Auth:** ✅ Admin or Vendor

---

### GET `/dashboard/language-stats`

**Auth:** ✅ Admin or Vendor

---

### GET `/dashboard/recent-activity?count=10`

**Auth:** ✅ Admin or Vendor

---

## Analytics

> 📌 All analytics endpoints support **Vendor scoping** (same as Dashboard).

### GET `/analytics/trends?period=30d`

**Auth:** ✅ Admin or Vendor  
**`period`:** `7d`, `30d`, or `90d`

**Response `data`:**

```json
{
  "totalVisits":       { "value": 1234, "changePercent": 12.5 },
  "narrations":        { "value": 876,  "changePercent": -3.2 },
  "newUsers":          { "value": 45,   "changePercent": 8.1 },
  "avgListenDuration": { "value": 47.3, "changePercent": 2.0 }
}
```

---

### GET `/analytics/visits-by-day?from=...&to=...`

**Auth:** ✅ Admin or Vendor

---

### GET `/analytics/visits-by-hour?date=2026-03-21`

**Auth:** ✅ Admin or Vendor  
Returns 24 data points (one per hour), filling 0 for hours with no visits.

---

### GET `/analytics/language-distribution?from=...&to=...`

**Auth:** ✅ Admin or Vendor

---

## Categories

### GET `/categories`

**Auth:** ❌ Anonymous (used by mobile for UI)

### GET `/categories/{id}`

**Auth:** ✅ Authenticated

### POST `/categories`

**Auth:** ✅ Admin  
**Body:**

```json
{
  "icon": "🍜",
  "color": "#f59e0b",
  "translations": [{ "languageId": 1, "name": "Bún & Phở" }]
}
```

### PUT `/categories/{id}` / DELETE `/categories/{id}` / PATCH `/categories/{id}/toggle`

**Auth:** ✅ Admin

---

## Users

### GET `/users?search=&role=&page=1&size=15`

**Auth:** ✅ Admin only

### GET `/users/{id}`

**Auth:** ✅ Admin only

### POST `/users`

Create Admin or Vendor user (Admin creates on their behalf).

**Auth:** ✅ Admin only  
**Body:**

```json
{
  "email": "vendor@example.com",
  "fullName": "Trần Thị B",
  "role": "Vendor",
  "vendorPoiId": 3
}
```

### PUT `/users/{id}` / DELETE `/users/{id}`

**Auth:** ✅ Admin only

### PATCH `/users/{id}/toggle`

Toggle `IsActive`.

**Auth:** ✅ Admin only

### POST `/users/{id}/reset-password`

Resets password to a generated value (returned in response).

**Auth:** ✅ Admin only

---

## Audio & Media

### GET `/audio/poi/{poiId}?lang=vi`

Get all audio narrations for a POI, optionally filtered by language code.

**Auth:** ✅ Authenticated

### POST `/audio/poi/{poiId}/upload`

Upload an MP3 file.

**Auth:** ✅ Admin or Vendor  
**Content-Type:** `multipart/form-data`  
**Fields:** `file` (MP3), `languageId` (int)

### POST `/audio/poi/{poiId}/generate-tts`

Generate audio from the POI's `narrationText` using Azure TTS.

**Auth:** ✅ Admin or Vendor  
**Body:** `{ "languageId": 1, "voiceName": "vi-VN-HoaiMyNeural" }`

### DELETE `/audio/{id}` / PATCH `/audio/{id}/set-default`

**Auth:** ✅ Admin or Vendor

### GET `/audio/{id}/stream`

Stream the audio file.

**Auth:** ❌ Anonymous (used by mobile app)

---

## Menu

### GET `/menu/poi/{poiId}`

**Auth:** ❌ Anonymous (public menu for mobile app)

### POST `/menu/poi/{poiId}`

**Auth:** ✅ Admin or Vendor  
**Body:**

```json
{
  "name": "Bún Bò Đặc Biệt",
  "description": "Tô lớn, thịt bò thêm",
  "price": 65000,
  "category": "Bún",
  "imageUrl": null,
  "isAvailable": true,
  "isSignature": true
}
```

### PUT `/menu/{id}` / DELETE `/menu/{id}`

**Auth:** ✅ Admin or Vendor

### PATCH `/menu/{id}/toggle-available` / PATCH `/menu/{id}/toggle-signature`

**Auth:** ✅ Admin or Vendor

---

## Sync (Mobile App)

### GET `/sync/delta?since=2026-01-01T00:00:00Z&languageId=1`

Get delta of POIs/translations/audio changed since a given timestamp.

**Auth:** ✅ Customer (mobile app)

### POST `/sync/visits`

Upload a batch of visit history records from the mobile app.

**Auth:** ✅ Customer (mobile app) or Anonymous  
**Body:**

```json
{
  "visits": [
    {
      "poiId": 3,
      "languageId": 1,
      "triggerType": 0,
      "narrationPlayed": true,
      "listenDuration": 47,
      "visitedAt": "2026-03-21T09:34:00Z"
    }
  ]
}
```

---

## Languages

### GET `/languages`

List of all active languages.

**Auth:** ❌ Anonymous  
**Response `data`:**

```json
[
  { "id": 1, "code": "vi", "nativeName": "Tiếng Việt", "flagEmoji": "🇻🇳" },
  { "id": 2, "code": "en", "nativeName": "English",    "flagEmoji": "🇬🇧" }
]
```

---

## Settings (Admin Only)

### GET `/settings`

**Auth:** ✅ Admin only

### PUT `/settings`

**Auth:** ✅ Admin only

### PUT `/settings/maintenance`

Toggle maintenance mode.

**Auth:** ✅ Admin only  
**Body:** `true` or `false`

### POST `/settings/generate-api-key`

**Auth:** ✅ Admin only

---

## Offline Packages (Admin Only)

### GET `/offlinepackages`

**Auth:** ✅ Admin only

### POST `/offlinepackages`

Create an offline data package definition.

**Auth:** ✅ Admin only

### POST `/offlinepackages/{id}/build`

Trigger build of the offline ZIP for download.

**Auth:** ✅ Admin only

### GET `/offlinepackages/{id}/status`

**Auth:** ✅ Admin only

### GET `/offlinepackages/{id}/download`

Download the ZIP file.

**Auth:** ✅ Customer (mobile app)

---

## Swagger UI

Available in development:

```
http://localhost:5015/swagger
```

Swagger is **disabled in production** (`Program.cs` checks `app.Environment.IsDevelopment()`).
