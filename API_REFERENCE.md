# 🔌 Vinh Khanh Food Tour — API Reference

> **Base URL (dev):** `http://localhost:5015/api/v1`  
> **Base URL (prod):** `https://api.vinhkhanh.com/api/v1`  
> **Auth:** `Authorization: Bearer <access_token>`  
> **Content-Type:** `application/json` (except multipart uploads)

---

## Response Envelope

Every endpoint returns the same wrapper:

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

| Error Code | HTTP Status | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource does not exist |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `UNAUTHORIZED` | 401 | Missing or expired JWT |
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `ACCOUNT_DISABLED` | 403 | Account deactivated |
| *(any other)* | 400 | General client error |

---

## Auth — `api/v1/auth`

### POST `/auth/login`

Authenticate with email and password. Returns JWT access + refresh tokens.

**Auth:** ❌ None  
**Body:**

```json
{
  "email": "admin@vinhkhanh.app",
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
    "email": "admin@vinhkhanh.app",
    "fullName": "Administrator",
    "role": "Admin"
  }
}
```

---

### POST `/auth/refresh`

Exchange a refresh token for a new access token + refresh token pair (rotation).

**Auth:** ❌ None  
**Body:** `"<refresh_token>"` ← plain string, not an object

**Response `data`:** Same shape as `/auth/login`

---

### POST `/auth/register`

Tourist self-registration. Creates a `Customer`-role account and returns JWT immediately.

**Auth:** ❌ None  
**Body:**

```json
{
  "email": "tourist@example.com",
  "password": "Tourist@123",
  "fullName": "Nguyễn Văn A"
}
```

**Response `data`:** Same shape as `/auth/login`

---

### POST `/auth/change-password`

Change password for the current authenticated user.

**Auth:** ✅ Any authenticated user  
**Body:**

```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@456"
}
```

---

### GET `/auth/me`

Get the current authenticated user's profile.

**Auth:** ✅ Any authenticated user  
**Response `data`:** `UserDto`

---

### POST `/auth/forgot-password`

Request a password reset email. Response shape is always identical regardless of whether the email exists (prevents email enumeration).

**Auth:** ❌ None  
**Body:**

```json
{
  "email": "user@example.com"
}
```

> In dev mode (`PasswordReset:ReturnTokenInResponse = true`), the `resetToken` may be returned directly in the response for testing.

---

### POST `/auth/reset-password`

Reset password using a token received via email.

**Auth:** ❌ None  
**Body:**

```json
{
  "email": "user@example.com",
  "token": "<reset_token>",
  "newPassword": "NewPassword@123"
}
```

---

### PUT `/auth/profile`

Self-service profile update for Customer and Vendor accounts.

**Auth:** ✅ `Customer` or `Vendor` only (Admin not permitted)  
**Body:**

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "newemail@example.com"
}
```

---

## Points of Interest — `api/v1/pois`

### GET `/pois`

Paginated, filtered list of POIs.

**Auth:** ✅ Admin or Vendor  
**Vendor note:** Backend scopes results to the Vendor's own POI(s) via a **fresh DB query** (`GetVendorPOIIdsAsync`) — not the JWT claim.

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `size` | int | 10 | Page size |
| `search` | string | — | Filter by name (partial match) |
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
  "pageSize": 10
}
```

---

### GET `/pois/{id}`

Get full POI detail including translations.

**Auth:** ✅ Admin or Vendor  
**Response `data`:** `POIDetailDto` (includes `translations` array)

---

### POST `/pois`

Create a new POI.

**Auth:** ✅ Admin or Vendor  
**Vendor note:** `VendorUserId` is auto-set to the calling vendor's own ID.

**Body:** `CreatePOIRequest`

```json
{
  "categoryId": 2,
  "latitude": 10.7553,
  "longitude": 106.7017,
  "address": "123 Vinh Khanh, Q4",
  "geofenceRadius": 50,
  "priority": 1,
  "vendorUserId": null,
  "translations": [
    {
      "languageId": 1,
      "name": "Quán Bún Bò Cô Linh",
      "description": "...",
      "highlights": ["Đặc sản", "Ngon"]
    }
  ]
}
```

---

### PUT `/pois/{id}`

Update an existing POI.

**Auth:** ✅ Authorized (any)  
**Vendor note:** Returns `403` if `POI.VendorUserId ≠ callerId`.  
**Vendor note:** Cannot reassign `VendorUserId` (Admin only).

**Body:** `UpdatePOIRequest` (same shape as Create)

---

### DELETE `/pois/{id}`

Delete a POI (cascades to translations, audio, media, menu items).

**Auth:** ✅ Admin or Vendor  
**Vendor note:** Returns `403` if Vendor does not own the POI.

---

### PATCH `/pois/{id}/toggle`

Toggle POI `IsActive` on/off.

**Auth:** ✅ Admin only

---

### PATCH `/pois/{id}/featured`

Toggle POI `IsFeatured` on/off.

**Auth:** ✅ Admin only

---

### GET `/pois/nearby`

Returns active POIs within a GPS radius. Used by the mobile app to bootstrap the local geofence engine on startup.

**Auth:** ❌ Anonymous  
**Query params:**

| Param | Type | Default | Required | Description |
|---|---|---|---|---|
| `lat` | double | — | ✅ | Latitude (-90 to 90) |
| `lng` | double | — | ✅ | Longitude (-180 to 180) |
| `radiusMeters` | int | 500 | — | Max 5000 |
| `langId` | int | — | — | Filter translations to one language |

**Response `data`:** Array of `POIDetailDto`

---

### GET `/pois/{id}/public`

Full public detail for a single active POI. Used by the mobile app tourist flow. Returns `404` if POI is inactive.

**Auth:** ❌ Anonymous  
**Query params:** `?langId=1` (optional — filter translations and audio to one language)

---

### GET `/pois/audio-queue`

Returns an ordered audio playback queue based on GPS position. When multiple POIs are within range, narrations are queued sequentially sorted by `Priority DESC, Distance ASC`.

**Auth:** ❌ Anonymous  
**Query params:**

| Param | Type | Default | Required | Description |
|---|---|---|---|---|
| `lat` | double | — | ✅ | Latitude |
| `lng` | double | — | ✅ | Longitude |
| `radiusMeters` | int | 500 | — | Max 5000 |
| `langId` | int | — | — | Filter audio to one language |

---

## Languages — `api/v1/languages`

### GET `/languages`

Returns all active languages sorted by `SortOrder`. Used by mobile app language picker on first run.

**Auth:** ❌ Anonymous

**Response `data`:** Array of `LanguageDto`

```json
[
  { "id": 1, "code": "vi", "name": "Tiếng Việt", "nativeName": "Tiếng Việt" },
  { "id": 2, "code": "en", "name": "English",   "nativeName": "English" }
]
```

---

## Categories — `api/v1/categories`

### GET `/categories`

**Auth:** ❌ Anonymous

**Response `data`:** Array of `CategoryDto`

---

### GET `/categories/{id}`

**Auth:** ✅ Admin only

---

### POST `/categories`

**Auth:** ✅ Admin only  
**Body:**

```json
{
  "name": "Bún Bò",
  "icon": "🍜",
  "description": "..."
}
```

---

### PUT `/categories/{id}`

**Auth:** ✅ Admin only  
**Body:** Same as Create

---

### DELETE `/categories/{id}`

**Auth:** ✅ Admin only

---

### PATCH `/categories/{id}/toggle`

Toggle category `IsActive`.

**Auth:** ✅ Admin only

---

## Audio Narrations — `api/v1/audio`

### GET `/audio/poi/{poiId}`

Get all audio narrations for a POI.

**Auth:** ✅ Any authenticated user  
**Query params:** `?lang=vi` (optional — filter by language code)

---

### POST `/audio/poi/{poiId}/upload`

Upload an MP3/WAV audio file for a POI + language.

**Auth:** ✅ Any authenticated user  
**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Audio file (`.mp3`, `.wav`, `.ogg`) |
| `languageId` | int | Language this narration belongs to |

---

### POST `/audio/poi/{poiId}/generate-tts`

Generate audio narration using Azure Cognitive Services TTS.

**Auth:** ✅ Admin or Vendor  
**Vendor note:** Scoped — returns `403` if Vendor does not own the POI.

**Body:**

```json
{
  "languageId": 1,
  "text": "Chào mừng đến Quán Bún Bò Cô Linh...",
  "voiceName": "vi-VN-HoaiMyNeural"
}
```

---

### GET `/audio/{id}/stream`

Stream or redirect audio content.

**Auth:** ❌ Anonymous

**Behavior:**
- **S3 provider** (default): Returns `302 Redirect` to a presigned S3 URL
- **S3 + `?proxy=1`**: API proxies the S3 stream — use when client cannot follow redirects (e.g. `MediaElement` on some platforms)
- **Local provider**: Always streams `audio/mpeg` through the API

**Query params:** `?proxy=1` (optional)

---

### DELETE `/audio/{id}`

**Auth:** ✅ Admin or Vendor  
**Vendor note:** Scoped via `GetVendorPOIIdsAsync` — returns `403` if not the owner.

---

### PATCH `/audio/{id}/set-default`

Set this narration as the default for its language on the POI.

**Auth:** ✅ Any authenticated user

---

## Media (Images) — `api/v1/media`

### GET `/media/poi/{poiId}`

Get all media items (photos) for a POI.

**Auth:** ✅ Any authenticated user

---

### POST `/media/poi/{poiId}/upload`

Upload a photo for a POI.

**Auth:** ✅ Any authenticated user  
**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Image file (`.jpg`, `.jpeg`, `.png`, `.webp`) |
| `caption` | string | Optional caption |
| `isPrimary` | bool | Set as primary photo (default `false`) |

---

### DELETE `/media/{id}`

**Auth:** ✅ Any authenticated user

---

### PATCH `/media/{id}/set-primary`

Set a media item as the primary photo for the POI.

**Auth:** ✅ Any authenticated user

---

### PUT `/media/poi/{poiId}/reorder`

Reorder media items for a POI.

**Auth:** ✅ Any authenticated user  
**Body:** `[3, 1, 4, 2]` — ordered array of media IDs

---

## Menu Items — `api/v1/menu`

### GET `/menu/poi/{poiId}`

Get all menu items for a POI.

**Auth:** ✅ Any authenticated user

**Response `data`:** Array of `MenuItemDto`

```json
[
  {
    "id": 1,
    "name": "Bún Bò Huế",
    "price": 45000,
    "description": "...",
    "isSignature": true,
    "isAvailable": true,
    "imageUrl": "https://..."
  }
]
```

---

### POST `/menu/poi/{poiId}`

Create a new menu item.

**Auth:** ✅ Any authenticated user  
**Body:**

```json
{
  "name": "Bún Bò Huế",
  "price": 45000,
  "description": "...",
  "isSignature": false
}
```

---

### PUT `/menu/{id}`

Update a menu item.

**Auth:** ✅ Any authenticated user  
**Body:** Same shape as Create

---

### DELETE `/menu/{id}`

**Auth:** ✅ Any authenticated user

---

### PATCH `/menu/{id}/toggle-available`

Toggle menu item `IsAvailable`.

**Auth:** ✅ Any authenticated user

---

### PATCH `/menu/{id}/toggle-signature`

Toggle menu item `IsSignature` (signature dish marker).

**Auth:** ✅ Any authenticated user

---

### POST `/menu/{id}/upload-image`

Upload image for a menu item.

**Auth:** ✅ Any authenticated user  
**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Image file |

---

## Users — `api/v1/users`

### GET `/users`

Paginated user list.

**Auth:** ✅ Admin only  
**Query params:** `page`, `size`, `search` (email/name), `role` (Admin/Vendor/Customer)

**Response `data`:** `PagedResult<UserDto>`

---

### GET `/users/{id}`

**Auth:** ✅ Admin only

---

### POST `/users`

Create a new user (Admin or Vendor).

**Auth:** ✅ Admin only  
**Body:**

```json
{
  "email": "vendor@restaurant.com",
  "fullName": "Trần Thị B",
  "role": "Vendor",
  "vendorPoiId": 7
}
```

> When `role = "Vendor"` and `vendorPoiId` is set, the backend automatically links `POI.VendorUserId` to the new user.

**Response `data`:** `{ "id": 12, "tempPassword": "..." }`

---

### PUT `/users/{id}`

Update user info.

**Auth:** ✅ Admin only  
**Body:** `UpdateUserRequest`

---

### DELETE `/users/{id}`

**Auth:** ✅ Admin only

---

### PATCH `/users/{id}/toggle`

Toggle user `IsActive`.

**Auth:** ✅ Admin only

---

### POST `/users/{id}/reset-password`

Admin-initiated password reset for a user (generates a new temp password).

**Auth:** ✅ Admin only

---

## Dashboard — `api/v1/dashboard`

All endpoints support Vendor scoping: Admin gets system-wide data, Vendor gets their own POI(s) only via fresh DB query.

### GET `/dashboard/stats`

**Auth:** ✅ Admin or Vendor

**Response `data`:** `DashboardStatsDto`

```json
{
  "totalPOIs": 12,
  "activePOIs": 10,
  "totalVisits30d": 1523,
  "totalUsers": 45
}
```

---

### GET `/dashboard/top-pois`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?count=5` (default 5)

**Response `data`:** Array of `POIVisitDto`

---

### GET `/dashboard/visits-chart`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?from=2026-01-01&to=2026-04-01`

---

### GET `/dashboard/language-stats`

**Auth:** ✅ Admin or Vendor

---

### GET `/dashboard/recent-activity`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?count=10` (default 10)

---

## Analytics — `api/v1/analytics`

All endpoints support Vendor scoping (same as Dashboard).

### GET `/analytics/trends`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?period=30d` (e.g. `7d`, `30d`, `90d`)

---

### GET `/analytics/visits-by-day`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?from=2026-01-01&to=2026-04-01`

---

### GET `/analytics/visits-by-hour`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?date=2026-04-15`

---

### GET `/analytics/language-distribution`

**Auth:** ✅ Admin or Vendor  
**Query params:** `?from=2026-01-01&to=2026-04-01`

---

## Offline Packages — `api/v1/offlinepackages`

### GET `/offlinepackages/catalog`

Public catalog of `Active` packages available for mobile download.

**Auth:** ❌ Anonymous

**Response `data`:** Array of `OfflinePackageDto`

---

### GET `/offlinepackages`

Admin list of all packages (including Building/Failed states).

**Auth:** ✅ Admin only

---

### POST `/offlinepackages`

Create a new offline package definition.

**Auth:** ✅ Admin only  
**Body:** `CreatePackageRequest`

---

### POST `/offlinepackages/{id}/build`

Trigger a background build of the ZIP package (POIs + audio + metadata).

**Auth:** ✅ Admin only

---

### GET `/offlinepackages/{id}/status`

Poll build status.

**Auth:** ✅ Admin only

**Response `data`:** `OfflinePackageDto`

```json
{
  "id": 1,
  "name": "Vinh Khanh v2",
  "status": "Active",
  "filePath": "offline/vk-v2.zip",
  "fileSizeBytes": 45678900,
  "builtAt": "2026-04-01T10:00:00Z"
}
```

---

### GET `/offlinepackages/{id}/download`

Download the offline ZIP package.

**Auth:** ❌ Anonymous

**Behavior:**
- **S3 provider:** Returns `302 Redirect` to a 60-minute presigned download URL
- **Local provider:** Streams `application/zip` as `vk-offline-{id}.zip`

---

### DELETE `/offlinepackages/{id}`

**Auth:** ✅ Admin only

---

## Settings — `api/v1/settings`

### GET `/settings`

Get all system settings.

**Auth:** ✅ Admin only

**Response `data`:** `SystemSettingsDto`

---

### PUT `/settings`

Update system settings.

**Auth:** ✅ Admin only  
**Body:** `SystemSettingsDto`

---

### PUT `/settings/maintenance`

Enable or disable maintenance mode.

**Auth:** ✅ Admin only  
**Body:** `true` or `false` (plain boolean)

---

### POST `/settings/generate-api-key`

Generate a new API key for the system.

**Auth:** ✅ Admin only

---

## Sync (Mobile) — `api/v1/sync`

### GET `/sync/delta`

Returns only changed POIs, categories, audio, and menu items since a given timestamp. Used by mobile app for incremental updates after initial install.

**Auth:** ✅ Any authenticated user (typically Customer)  
**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `since` | DateTime | ✅ | ISO 8601 UTC timestamp of last sync |
| `langId` | int | ✅ | Only return content for this language |

**Response `data`:** `SyncDeltaResponse`

```json
{
  "pois": [...],
  "categories": [...],
  "audio": [...],
  "menu": [...]
}
```

---

### POST `/sync/visits`

Batch upload visit records collected while offline.

**Auth:** ✅ Any authenticated user  
**Body:** `VisitBatchRequest`

```json
{
  "visits": [
    {
      "poiId": 3,
      "visitedAt": "2026-04-15T09:00:00Z",
      "languageId": 1,
      "durationSeconds": 120
    }
  ]
}
```

**Response `data`:** `int` — count of accepted visits

---

## Quick Reference Table

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | ❌ | Returns JWT |
| POST | `/auth/refresh` | ❌ | Token rotation |
| POST | `/auth/register` | ❌ | Customer self-registration |
| POST | `/auth/forgot-password` | ❌ | No email enumeration |
| POST | `/auth/reset-password` | ❌ | Requires reset token |
| POST | `/auth/change-password` | ✅ Any | |
| GET | `/auth/me` | ✅ Any | Current user profile |
| PUT | `/auth/profile` | ✅ Customer,Vendor | Self-service update |
| GET | `/languages` | ❌ | Mobile language picker |
| GET | `/categories` | ❌ | |
| POST/PUT/DELETE | `/categories/{id}` | ✅ Admin | |
| GET | `/pois` | ✅ Admin,Vendor | Vendor-scoped via DB |
| POST | `/pois` | ✅ Admin,Vendor | |
| PUT/DELETE | `/pois/{id}` | ✅ Admin,Vendor | Ownership guard |
| PATCH | `/pois/{id}/toggle` | ✅ Admin | |
| PATCH | `/pois/{id}/featured` | ✅ Admin | |
| GET | `/pois/nearby` | ❌ | Mobile geofence bootstrap |
| GET | `/pois/{id}/public` | ❌ | Mobile tourist flow |
| GET | `/pois/audio-queue` | ❌ | Priority-sorted queue |
| GET | `/audio/poi/{poiId}` | ✅ Any | |
| POST | `/audio/poi/{poiId}/upload` | ✅ Any | multipart |
| POST | `/audio/poi/{poiId}/generate-tts` | ✅ Admin,Vendor | Azure TTS |
| GET | `/audio/{id}/stream` | ❌ | S3 redirect or proxy |
| DELETE | `/audio/{id}` | ✅ Admin,Vendor | Vendor-scoped |
| PATCH | `/audio/{id}/set-default` | ✅ Any | |
| GET | `/media/poi/{poiId}` | ✅ Any | |
| POST | `/media/poi/{poiId}/upload` | ✅ Any | multipart |
| DELETE | `/media/{id}` | ✅ Any | |
| PATCH | `/media/{id}/set-primary` | ✅ Any | |
| PUT | `/media/poi/{poiId}/reorder` | ✅ Any | body: int[] |
| GET | `/menu/poi/{poiId}` | ✅ Any | |
| POST | `/menu/poi/{poiId}` | ✅ Any | |
| PUT/DELETE | `/menu/{id}` | ✅ Any | |
| PATCH | `/menu/{id}/toggle-available` | ✅ Any | |
| PATCH | `/menu/{id}/toggle-signature` | ✅ Any | |
| POST | `/menu/{id}/upload-image` | ✅ Any | multipart |
| GET | `/users` | ✅ Admin | |
| POST | `/users` | ✅ Admin | Creates Vendor/Admin |
| PUT/DELETE | `/users/{id}` | ✅ Admin | |
| PATCH | `/users/{id}/toggle` | ✅ Admin | |
| POST | `/users/{id}/reset-password` | ✅ Admin | Admin-initiated |
| GET | `/dashboard/stats` | ✅ Admin,Vendor | Vendor-scoped |
| GET | `/dashboard/top-pois` | ✅ Admin,Vendor | `?count=5` |
| GET | `/dashboard/visits-chart` | ✅ Admin,Vendor | `?from=&to=` |
| GET | `/dashboard/language-stats` | ✅ Admin,Vendor | |
| GET | `/dashboard/recent-activity` | ✅ Admin,Vendor | `?count=10` |
| GET | `/analytics/trends` | ✅ Admin,Vendor | `?period=30d` |
| GET | `/analytics/visits-by-day` | ✅ Admin,Vendor | `?from=&to=` |
| GET | `/analytics/visits-by-hour` | ✅ Admin,Vendor | `?date=` |
| GET | `/analytics/language-distribution` | ✅ Admin,Vendor | `?from=&to=` |
| GET | `/offlinepackages/catalog` | ❌ | Mobile download catalog |
| GET | `/offlinepackages` | ✅ Admin | |
| POST | `/offlinepackages` | ✅ Admin | |
| POST | `/offlinepackages/{id}/build` | ✅ Admin | Trigger build |
| GET | `/offlinepackages/{id}/status` | ✅ Admin | Poll build |
| GET | `/offlinepackages/{id}/download` | ❌ | S3 redirect or stream |
| DELETE | `/offlinepackages/{id}` | ✅ Admin | |
| GET | `/settings` | ✅ Admin | |
| PUT | `/settings` | ✅ Admin | |
| PUT | `/settings/maintenance` | ✅ Admin | body: bool |
| POST | `/settings/generate-api-key` | ✅ Admin | |
| GET | `/sync/delta` | ✅ Any | `?since=&langId=` |
| POST | `/sync/visits` | ✅ Any | Batch upload visits |
