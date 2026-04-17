# 🔌 Vinh Khanh Food Tour — API Reference

> **Source of truth:** All schemas mapped directly from
> [`Controllers.cs`](backend/src/VinhKhanh.API/Controllers/Controllers.cs) and
> [`DTOs.cs`](backend/src/VinhKhanh.Application/DTOs/DTOs.cs)
>
> **Base URL (dev):** `http://localhost:5015/api/v1`  
> **Auth header:** `Authorization: Bearer <accessToken>`  
> **Content-Type:** `application/json` (except multipart endpoints)

---

## Response Envelope — `ApiResponse<T>`

```json
{
  "success": true,
  "data": { },
  "error": null,
  "traceId": "optional"
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Required" }]
  }
}
```

| Error Code | HTTP | When |
|---|---|---|
| `NOT_FOUND` | 404 | Resource does not exist |
| `FORBIDDEN` | 403 | Valid auth, insufficient permissions |
| `UNAUTHORIZED` | 401 | Missing/expired JWT |
| `VALIDATION_ERROR` | 400 | Request body/params failed validation |
| `ACCOUNT_DISABLED` | 403 | Account deactivated |

## Pagination — `PagedResult<T>`

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "size": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

---

## Auth — `api/v1/auth`

### POST `/auth/login`

**Auth:** ❌ None  
**Request:** `LoginRequest`

```json
{ "email": "admin@vinhkhanh.app", "password": "Admin@123456" }
```

**Response `data`:** `LoginResponse`

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "email": "admin@vinhkhanh.app",
    "fullName": "Administrator",
    "role": "Admin",
    "phone": null,
    "avatarUrl": null,
    "isActive": true,
    "lastLoginAt": "2026-04-15T09:00:00Z",
    "shopName": null,
    "vendorPOIIds": []
  }
}
```

---

### POST `/auth/refresh`

**Auth:** ❌ None  
**Body:** `"<refresh_token>"` — plain string (not an object)  
**Response `data`:** `LoginResponse` (same as login)

---

### POST `/auth/register`

Tourist self-registration → Customer role, returns JWT immediately.

**Auth:** ❌ None  
**Request:** `RegisterRequest`

```json
{
  "username": "nguyen_van_a",
  "email": "tourist@example.com",
  "password": "Tourist@123",
  "fullName": "Nguyễn Văn A",
  "preferredLanguageId": 1
}
```

**Response `data`:** `LoginResponse`

---

### POST `/auth/change-password`

**Auth:** ✅ Any authenticated user  
**Request:** `ChangePasswordRequest`

```json
{ "currentPassword": "OldPass@123", "newPassword": "NewPass@456" }
```

---

### GET `/auth/me`

**Auth:** ✅ Any authenticated user  
**Response `data`:** `UserDto`

---

### POST `/auth/forgot-password`

No email enumeration — response shape always identical.

**Auth:** ❌ None  
**Request:** `ForgotPasswordRequest`

```json
{ "email": "user@example.com" }
```

**Response `data`:** `ForgotPasswordResponse`

```json
{
  "message": "If that address exists, a reset link has been sent.",
  "resetToken": "<only in dev when PasswordReset:ReturnTokenInResponse=true>"
}
```

---

### POST `/auth/reset-password`

**Auth:** ❌ None  
**Request:** `ResetPasswordRequest`

```json
{
  "email": "user@example.com",
  "token": "<reset_token>",
  "newPassword": "NewPass@456"
}
```

---

### PUT `/auth/profile`

**Auth:** ✅ `Customer` or `Vendor` only  
**Request:** `UpdateProfileRequest`

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "preferredLanguageId": 1,
  "avatarUrl": "https://..."
}
```

---

## Languages — `api/v1/languages`

### GET `/languages`

**Auth:** ❌ None  
**Response `data`:** `LanguageDto[]`

```json
[
  {
    "id": 1,
    "code": "vi",
    "name": "Vietnamese",
    "nativeName": "Tiếng Việt",
    "ttsCode": "vi-VN",
    "flagEmoji": "🇻🇳",
    "sortOrder": 1
  }
]
```

---

## Categories — `api/v1/categories`

### GET `/categories`

**Auth:** ❌ None  
**Response `data`:** `CategoryDto[]`

```json
[
  {
    "id": 1,
    "icon": "🍜",
    "color": "#3b82f6",
    "sortOrder": 1,
    "isActive": true,
    "poiCount": 5,
    "translations": [
      { "languageId": 1, "languageCode": "vi", "flagEmoji": "🇻🇳", "name": "Bún Bò" }
    ]
  }
]
```

### GET `/categories/{id}`

**Auth:** ✅ Admin only

### POST `/categories`

**Auth:** ✅ Admin only  
**Request:** `CreateCategoryRequest`

```json
{
  "icon": "🍜",
  "color": "#3b82f6",
  "sortOrder": 1,
  "isActive": true,
  "translations": [
    { "languageId": 1, "name": "Bún Bò" }
  ]
}
```

### PUT `/categories/{id}`

**Auth:** ✅ Admin only — same body as Create

### DELETE `/categories/{id}`

**Auth:** ✅ Admin only

### PATCH `/categories/{id}/toggle`

**Auth:** ✅ Admin only

---

## Points of Interest — `api/v1/pois`

### GET `/pois`

**Auth:** ✅ Admin or Vendor (Vendor auto-scoped to own POIs via DB query)

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `size` | int | 10 | Page size |
| `search` | string | — | Name filter |
| `categoryId` | int | — | Filter by category |
| `isActive` | bool | — | Filter by status |
| `sortBy` | string | `name` | Sort field |
| `order` | string | `asc` | `asc` or `desc` |

**Response `data`:** `PagedResult<POIListDto>`

```json
{
  "items": [{
    "id": 1,
    "name": "Quán Bún Bò Cô Linh",
    "categoryId": 2,
    "categoryName": "Bún Bò",
    "categoryIcon": "🍜",
    "categoryColor": "#3b82f6",
    "address": "123 Vinh Khanh, Q4",
    "latitude": 10.7553,
    "longitude": 106.7017,
    "geofenceRadius": 25,
    "priority": 0,
    "rating": 4.8,
    "totalVisits": 1234,
    "isActive": true,
    "isFeatured": false,
    "primaryImageUrl": "https://...",
    "audioCount": 2,
    "translationCount": 2,
    "createdAt": "2026-01-01T00:00:00Z"
  }],
  "pagination": { "page": 1, "size": 10, "totalItems": 42, "totalPages": 5 }
}
```

### GET `/pois/{id}`

**Auth:** ✅ Admin or Vendor  
**Response `data`:** `POIDetailDto` (extends `POIListDto`)

```json
{
  "id": 1,
  "phone": "0901234567",
  "website": "https://...",
  "priceRangeMin": 30000,
  "priceRangeMax": 80000,
  "openingHours": "06:00–22:00",
  "vendorUserId": 5,
  "vendorName": "Trần Thị B",
  "translations": [
    {
      "id": 1,
      "languageId": 1,
      "name": "Quán Bún Bò Cô Linh",
      "shortDescription": "...",
      "fullDescription": "...",
      "narrationText": "...",
      "highlights": ["Đặc sản", "Ngon"],
      "languageCode": "vi",
      "languageName": "Vietnamese",
      "flagEmoji": "🇻🇳"
    }
  ],
  "media": [],
  "audio": [],
  "menuItems": []
}
```

### POST `/pois`

**Auth:** ✅ Admin or Vendor  
**Note:** Vendor → `vendorUserId` is auto-set to caller's ID  
**Request:** `CreatePOIRequest`

```json
{
  "categoryId": 2,
  "address": "123 Vinh Khanh, Q4",
  "phone": "0901234567",
  "website": null,
  "latitude": 10.7553,
  "longitude": 106.7017,
  "geofenceRadius": 25,
  "priority": 0,
  "priceRangeMin": 30000,
  "priceRangeMax": 80000,
  "openingHours": "06:00–22:00",
  "vendorUserId": null,
  "isFeatured": false,
  "translations": [
    {
      "languageId": 1,
      "name": "Quán Bún Bò Cô Linh",
      "shortDescription": "...",
      "fullDescription": "...",
      "narrationText": "...",
      "highlights": ["Đặc sản"]
    }
  ]
}
```

### PUT `/pois/{id}`

**Auth:** ✅ Any authorized, Vendor ownership checked (403 if not owner)  
**Body:** Same as Create (`UpdatePOIRequest` extends `CreatePOIRequest`)

### DELETE `/pois/{id}`

**Auth:** ✅ Admin or Vendor (ownership checked)

### PATCH `/pois/{id}/toggle`

**Auth:** ✅ Admin only — toggles `IsActive`

### PATCH `/pois/{id}/featured`

**Auth:** ✅ Admin only — toggles `IsFeatured`

### GET `/pois/nearby`

**Auth:** ❌ None  
**Query params:** `lat` ✅, `lng` ✅, `radiusMeters` (default 500, max 5000), `langId`  
**Response `data`:** `NearbyPOIDto[]`

```json
[{
  "id": 1,
  "distanceMeters": 45.2,
  "audio": [{ "id": 3, "languageId": 1, "isDefault": true, ... }],
  "translations": [{ "languageId": 1, "name": "...", ... }]
}]
```

### GET `/pois/{id}/public`

**Auth:** ❌ None  
**Query params:** `?langId=1` (optional)  
**Response `data`:** `POIDetailDto` — 404 if inactive

### GET `/pois/audio-queue`

Ordered playback queue sorted by `Priority DESC, Distance ASC`.

**Auth:** ❌ None  
**Query params:** `lat` ✅, `lng` ✅, `radiusMeters` (default 500), `langId`  
**Response `data`:** `AudioQueueResponse`

```json
{
  "queue": [{
    "order": 1,
    "poiId": 3,
    "poiName": "Quán Bún Bò Cô Linh",
    "categoryName": "Bún Bò",
    "categoryIcon": "🍜",
    "categoryColor": "#3b82f6",
    "primaryImageUrl": "https://...",
    "distanceMeters": 38.1,
    "priority": 10,
    "latitude": 10.7553,
    "longitude": 106.7017,
    "audio": { "id": 3, "languageId": 1, "duration": 45, ... },
    "shortDescription": "...",
    "narrationText": "..."
  }],
  "totalDurationSeconds": 180,
  "poiCount": 3
}
```

---

## Audio — `api/v1/audio`

### GET `/audio/poi/{poiId}`

**Auth:** ✅ Any authenticated user  
**Query params:** `?lang=vi` (optional — filter by language code)  
**Response `data`:** `AudioDto[]`

```json
[{
  "id": 1,
  "poiId": 3,
  "languageId": 1,
  "languageName": "Vietnamese",
  "flagEmoji": "🇻🇳",
  "filePath": "audio/poi-3-vi.mp3",
  "voiceType": "TTS",
  "voiceName": "vi-VN-HoaiMyNeural",
  "duration": 45,
  "fileSize": 720000,
  "isDefault": true
}]
```

### POST `/audio/poi/{poiId}/upload`

**Auth:** ✅ Any authenticated user  
**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Audio file (`.mp3`, `.wav`, `.ogg`) |
| `languageId` | int | Language this narration belongs to |

### POST `/audio/poi/{poiId}/generate-tts`

**Auth:** ✅ Admin or Vendor (Vendor: ownership checked)  
**Request:** `GenerateTTSRequest`

```json
{
  "languageId": 1,
  "text": "Chào mừng đến Quán Bún Bò Cô Linh...",
  "voiceName": "vi-VN-HoaiMyNeural",
  "speed": 1.0
}
```

### GET `/audio/{id}/stream`

**Auth:** ❌ None  
**Query params:** `?proxy=1` (optional — proxy stream instead of redirect)

- **S3:** `302 Redirect` to presigned URL
- **S3 + `?proxy=1`:** streams `audio/mpeg` via API
- **Local:** always streams `audio/mpeg`

### DELETE `/audio/{id}`

**Auth:** ✅ Admin or Vendor (Vendor: ownership checked via vendor POI IDs)

### PATCH `/audio/{id}/set-default`

**Auth:** ✅ Any authenticated user

---

## Media (Images) — `api/v1/media`

### GET `/media/poi/{poiId}`

**Auth:** ✅ Any authenticated user  
**Response `data`:** `MediaDto[]`

```json
[{
  "id": 1,
  "filePath": "media/poi-3-1.jpg",
  "url": "https://...",
  "caption": "Entrance",
  "mediaType": "Image",
  "isPrimary": true,
  "sortOrder": 0,
  "fileSize": 245000
}]
```

### POST `/media/poi/{poiId}/upload`

**Auth:** ✅ Any authenticated user  
**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Image (`.jpg`, `.jpeg`, `.png`, `.webp`) |
| `caption` | string | Optional caption |
| `isPrimary` | bool | Set as primary photo (default `false`) |

### DELETE `/media/{id}`

**Auth:** ✅ Any authenticated user

### PATCH `/media/{id}/set-primary`

**Auth:** ✅ Any authenticated user

### PUT `/media/poi/{poiId}/reorder`

**Auth:** ✅ Any authenticated user  
**Body:** `[3, 1, 4, 2]` — ordered array of media IDs

---

## Menu Items — `api/v1/menu`

### GET `/menu/poi/{poiId}`

**Auth:** ✅ Any authenticated user  
**Response `data`:** `MenuItemDto[]`

```json
[{
  "id": 1,
  "poiId": 3,
  "price": 45000,
  "imageUrl": "https://...",
  "isSignature": true,
  "isAvailable": true,
  "sortOrder": 0,
  "name": "Bún Bò Huế",
  "description": "...",
  "translations": [
    { "languageId": 1, "name": "Bún Bò Huế", "description": "..." }
  ]
}]
```

### POST `/menu/poi/{poiId}`

**Auth:** ✅ Any authenticated user  
**Request:** `CreateMenuItemRequest`

```json
{
  "price": 45000,
  "isSignature": false,
  "isAvailable": true,
  "sortOrder": 0,
  "translations": [
    { "languageId": 1, "name": "Bún Bò Huế", "description": "..." }
  ]
}
```

### PUT `/menu/{id}`

**Auth:** ✅ Any authenticated user — same body as Create

### DELETE `/menu/{id}`

**Auth:** ✅ Any authenticated user

### PATCH `/menu/{id}/toggle-available`

**Auth:** ✅ Any authenticated user

### PATCH `/menu/{id}/toggle-signature`

**Auth:** ✅ Any authenticated user

### POST `/menu/{id}/upload-image`

**Auth:** ✅ Any authenticated user  
**Content-Type:** `multipart/form-data`

| Field | Type |
|---|---|
| `file` | Image file |

---

## Users — `api/v1/users`

### GET `/users`

**Auth:** ✅ Admin only  
**Query params:** `page`, `size`, `search` (email/name), `role` (Admin/Vendor/Customer)  
**Response `data`:** `PagedResult<UserDto>`

### GET `/users/{id}`

**Auth:** ✅ Admin only  
**Response `data`:** `UserDto`

```json
{
  "id": 5,
  "email": "vendor@restaurant.com",
  "fullName": "Trần Thị B",
  "role": "Vendor",
  "phone": "0901234567",
  "avatarUrl": null,
  "isActive": true,
  "lastLoginAt": "2026-04-15T09:00:00Z",
  "shopName": "Quán Bún Bò Cô Linh",
  "vendorPOIIds": [3, 7]
}
```

### POST `/users`

**Auth:** ✅ Admin only  
**Request:** `CreateUserRequest`

```json
{
  "email": "vendor@restaurant.com",
  "fullName": "Trần Thị B",
  "password": "Temp@12345",
  "role": "Vendor",
  "phone": "0901234567",
  "poiIds": [3, 7]
}
```

> `poiIds`: POIs to link to this Vendor on creation — each POI's `VendorUserId` is set to the new user ID.

### PUT `/users/{id}`

**Auth:** ✅ Admin only  
**Request:** `UpdateUserRequest`

```json
{
  "fullName": "Trần Thị B",
  "phone": "0901234567",
  "preferredLanguageId": 1,
  "poiIds": [3, 7]
}
```

> `poiIds` for Vendor: service diffs against current assignments — adds new links, removes old ones.

### DELETE `/users/{id}`

**Auth:** ✅ Admin only

### PATCH `/users/{id}/toggle`

**Auth:** ✅ Admin only — toggles `IsActive`

### POST `/users/{id}/reset-password`

**Auth:** ✅ Admin only — generates a new temp password

---

## Dashboard — `api/v1/dashboard`

> Admin gets system-wide data. Vendor gets own POI(s) data — scoped via fresh DB query.

### GET `/dashboard/stats`

**Auth:** ✅ Admin or Vendor  
**Response `data`:** `DashboardStatsDto`

```json
{
  "activePOIs": 10,
  "totalVisits": 1523,
  "totalVisitsChange": 12.5,
  "languages": 2,
  "audioFiles": 18,
  "totalUsers": 45,
  "totalVendors": 8
}
```

### GET `/dashboard/top-pois`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?count=5` (default 5)  
**Response `data`:** `TopPOIDto[]`

```json
[{ "id": 3, "name": "Quán Bún Bò Cô Linh", "icon": "🍜", "visits": 432 }]
```

### GET `/dashboard/visits-chart`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?from=2026-01-01&to=2026-04-01`  
**Response `data`:** `VisitChartDto[]`

```json
[{ "date": "01/04", "visits": 45, "narrations": 38 }]
```

### GET `/dashboard/language-stats`

**Auth:** ✅ Admin or Vendor  
**Response `data`:** `LanguageStatDto[]`

```json
[{ "name": "Tiếng Việt", "flagEmoji": "🇻🇳", "count": 820, "percentage": 72.5 }]
```

### GET `/dashboard/recent-activity`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?count=10` (default 10)  
**Response `data`:** `RecentActivityDto[]`

```json
[{
  "userName": "Nguyễn Văn A",
  "poiName": "Quán Bún Bò Cô Linh",
  "triggerType": "Geofence",
  "flagEmoji": "🇻🇳",
  "visitedAt": "2026-04-15T08:45:00Z"
}]
```

---

## Analytics — `api/v1/analytics`

> Admin: system-wide. Vendor: own POI(s) only.

### GET `/analytics/trends`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?period=30d`  
**Response `data`:** `TrendDto`

```json
{ "value": 1523, "changePercent": 12.5 }
```

### GET `/analytics/visits-by-day`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?from=2026-01-01&to=2026-04-01`  
**Response `data`:** `VisitChartDto[]`

### GET `/analytics/visits-by-hour`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?date=2026-04-15`  
**Response `data`:** `HourlyVisitDto[]`

```json
[{ "hour": 8, "visits": 12 }, { "hour": 9, "visits": 28 }]
```

### GET `/analytics/language-distribution`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?from=2026-01-01&to=2026-04-01`  
**Response `data`:** `LanguageStatDto[]`

---

## Offline Packages — `api/v1/offlinepackages`

### GET `/offlinepackages/catalog`

**Auth:** ❌ None  
**Response `data`:** `OfflinePackageCatalogItemDto[]`

```json
[{
  "id": 1,
  "languageId": 1,
  "languageName": "Vietnamese",
  "flagEmoji": "🇻🇳",
  "name": "Vinh Khanh v2",
  "version": "2.0",
  "fileSize": 45678900,
  "checksum": "sha256:...",
  "poiCount": 25,
  "audioCount": 48,
  "updatedAt": "2026-04-01T10:00:00Z"
}]
```

### GET `/offlinepackages`

**Auth:** ✅ Admin only  
**Response `data`:** `OfflinePackageDto[]` (includes `progress`, `currentStep`, `status`)

### POST `/offlinepackages`

**Auth:** ✅ Admin only  
**Request:** `CreatePackageRequest`

```json
{ "languageId": 1, "name": "Vinh Khanh v2", "version": "2.0" }
```

### POST `/offlinepackages/{id}/build`

**Auth:** ✅ Admin only — triggers background ZIP build

### GET `/offlinepackages/{id}/status`

**Auth:** ✅ Admin only  
**Response `data`:** `OfflinePackageDto`

```json
{
  "id": 1,
  "name": "Vinh Khanh v2",
  "version": "2.0",
  "status": "Active",
  "progress": 100,
  "currentStep": null,
  "fileSize": 45678900,
  "filePath": "offline/vk-v2.zip",
  "checksum": "sha256:...",
  "downloadCount": 312,
  "poiCount": 25,
  "audioCount": 48,
  "imageCount": 75,
  "updatedAt": "2026-04-01T10:00:00Z"
}
```

### GET `/offlinepackages/{id}/download`

**Auth:** ❌ None

- **S3:** `302 Redirect` to 60-min presigned URL
- **Local:** streams `application/zip` as `vk-offline-{id}.zip`

### DELETE `/offlinepackages/{id}`

**Auth:** ✅ Admin only

---

## Settings — `api/v1/settings`

### GET `/settings`

**Auth:** ✅ Admin only  
**Response `data`:** `SystemSettingsDto`

```json
{
  "geofence": {
    "defaultRadius": 30,
    "gpsUpdateFrequency": 5,
    "gpsAccuracy": "High"
  },
  "narration": {
    "defaultCooldown": 30,
    "defaultMode": "Auto",
    "ttsVoiceVi": "vi-VN-HoaiMyNeural",
    "ttsVoiceEn": "en-US-JennyNeural",
    "ttsSpeed": 1.0,
    "autoGenerateTTS": true
  },
  "sync": {
    "syncFrequency": 15,
    "batchSize": 50,
    "compressData": true,
    "wifiOnly": false
  },
  "api": {
    "apiKey": "...",
    "maintenanceMode": false
  }
}
```

### PUT `/settings`

**Auth:** ✅ Admin only — body: `SystemSettingsDto`

### PUT `/settings/maintenance`

**Auth:** ✅ Admin only — body: `true` or `false` (plain boolean)

### POST `/settings/generate-api-key`

**Auth:** ✅ Admin only

---

## Sync (Mobile) — `api/v1/sync`

### GET `/sync/delta`

Returns only changed POIs / categories / audio / menu since a given timestamp.

**Auth:** ✅ Any authenticated user  
**Query params:** `since` ✅ (ISO 8601 UTC), `langId` ✅  
**Response `data`:** `SyncDeltaResponse`

```json
{
  "serverTime": "2026-04-15T09:00:00Z",
  "pois":       { "updated": [...], "deleted": [12, 13] },
  "categories": { "updated": [...], "deleted": [] },
  "audio":      { "updated": [...], "deleted": [5] },
  "menu":       { "updated": [...], "deleted": [] }
}
```

### POST `/sync/visits`

Batch upload visit records collected offline.

**Auth:** ✅ Any authenticated user  
**Request:** `VisitBatchRequest`

```json
{
  "visits": [{
    "poiId": 3,
    "languageId": 1,
    "triggerType": "Geofence",
    "narrationPlayed": true,
    "listenDuration": 42,
    "visitedAt": "2026-04-15T08:45:00Z",
    "latitude": 10.7553,
    "longitude": 106.7017
  }]
}
```

**Response `data`:** `int` — count of accepted visit records

---

## Quick Reference Table

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/auth/login` | ❌ |
| POST | `/auth/refresh` | ❌ |
| POST | `/auth/register` | ❌ |
| POST | `/auth/forgot-password` | ❌ |
| POST | `/auth/reset-password` | ❌ |
| POST | `/auth/change-password` | ✅ Any |
| GET | `/auth/me` | ✅ Any |
| PUT | `/auth/profile` | ✅ Customer, Vendor |
| GET | `/languages` | ❌ |
| GET | `/categories` | ❌ |
| GET/POST | `/categories`, `/categories/{id}` | ✅ Admin |
| PATCH | `/categories/{id}/toggle` | ✅ Admin |
| GET | `/pois` | ✅ Admin, Vendor |
| POST | `/pois` | ✅ Admin, Vendor |
| GET/PUT/DELETE | `/pois/{id}` | ✅ Admin, Vendor |
| PATCH | `/pois/{id}/toggle` | ✅ Admin |
| PATCH | `/pois/{id}/featured` | ✅ Admin |
| GET | `/pois/nearby` | ❌ |
| GET | `/pois/{id}/public` | ❌ |
| GET | `/pois/audio-queue` | ❌ |
| GET | `/audio/poi/{poiId}` | ✅ Any |
| POST | `/audio/poi/{poiId}/upload` | ✅ Any |
| POST | `/audio/poi/{poiId}/generate-tts` | ✅ Admin, Vendor |
| GET | `/audio/{id}/stream` | ❌ |
| DELETE | `/audio/{id}` | ✅ Admin, Vendor |
| PATCH | `/audio/{id}/set-default` | ✅ Any |
| GET | `/media/poi/{poiId}` | ✅ Any |
| POST | `/media/poi/{poiId}/upload` | ✅ Any |
| DELETE | `/media/{id}` | ✅ Any |
| PATCH | `/media/{id}/set-primary` | ✅ Any |
| PUT | `/media/poi/{poiId}/reorder` | ✅ Any |
| GET | `/menu/poi/{poiId}` | ✅ Any |
| POST | `/menu/poi/{poiId}` | ✅ Any |
| PUT/DELETE | `/menu/{id}` | ✅ Any |
| PATCH | `/menu/{id}/toggle-available` | ✅ Any |
| PATCH | `/menu/{id}/toggle-signature` | ✅ Any |
| POST | `/menu/{id}/upload-image` | ✅ Any |
| GET | `/users` | ✅ Admin |
| POST | `/users` | ✅ Admin |
| GET/PUT/DELETE | `/users/{id}` | ✅ Admin |
| PATCH | `/users/{id}/toggle` | ✅ Admin |
| POST | `/users/{id}/reset-password` | ✅ Admin |
| GET | `/dashboard/stats` | ✅ Admin, Vendor |
| GET | `/dashboard/top-pois` | ✅ Admin, Vendor |
| GET | `/dashboard/visits-chart` | ✅ Admin, Vendor |
| GET | `/dashboard/language-stats` | ✅ Admin, Vendor |
| GET | `/dashboard/recent-activity` | ✅ Admin, Vendor |
| GET | `/analytics/trends` | ✅ Admin, Vendor |
| GET | `/analytics/visits-by-day` | ✅ Admin, Vendor |
| GET | `/analytics/visits-by-hour` | ✅ Admin, Vendor |
| GET | `/analytics/language-distribution` | ✅ Admin, Vendor |
| GET | `/offlinepackages/catalog` | ❌ |
| GET/POST | `/offlinepackages` | ✅ Admin |
| POST | `/offlinepackages/{id}/build` | ✅ Admin |
| GET | `/offlinepackages/{id}/status` | ✅ Admin |
| GET | `/offlinepackages/{id}/download` | ❌ |
| DELETE | `/offlinepackages/{id}` | ✅ Admin |
| GET | `/settings` | ✅ Admin |
| PUT | `/settings` | ✅ Admin |
| PUT | `/settings/maintenance` | ✅ Admin |
| POST | `/settings/generate-api-key` | ✅ Admin |
| GET | `/sync/delta` | ✅ Any |
| POST | `/sync/visits` | ✅ Any |
