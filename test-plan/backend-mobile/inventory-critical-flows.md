# Inventory Critical Flows (Backend + Mobile)

## Scope
- Backend API under `backend/src/VinhKhanh.API/Controllers/Controllers.cs`
- Mobile app under `mobile/VinhKhanh.Mobile/`

## Core Business Flows

### F1 - Customer authentication lifecycle
- Login: `POST /api/v1/auth/login`
- Refresh token rotation: `POST /api/v1/auth/refresh`
- Register customer: `POST /api/v1/auth/register`
- Profile and password: `GET /auth/me`, `PUT /auth/profile`, `POST /auth/change-password`
- Reset flow: `POST /auth/forgot-password`, `POST /auth/reset-password`
- Mobile integration: `ApiClient.LoginAsync`, `RegisterAsync`, `RestoreSessionAsync`, `EnsureAuthHeaderAsync`

### F2 - Discover nearby POIs from live coordinates
- Public endpoint: `GET /api/v1/pois/nearby`
- Public detail endpoint: `GET /api/v1/pois/{id}/public`
- Mobile pull path:
  - `ILocationService` publishes location updates
  - `MainViewModel` and `MapViewModel` refresh nearby POIs
  - `ApiClient.GetNearbyPoisAsync` maps payload to `PoiLocal`
- Critical behavior:
  - Radius filtering and coordinate validation
  - Response ordering by distance
  - Translation/audio fallback behavior on mobile mapper

### F3 - Geofence detection and narration auto-play
- Geofence runtime: `GeofenceEngine`
- Enter/exit event consumers: `MainViewModel.OnGeofenceEntered/Exited`
- Narration playback service: `INarrationPlayer` / `NarrationPlayer`
- Critical behavior:
  - Debounce threshold
  - Cooldown per POI
  - Priority resolution when multiple POIs are in range
  - Auto-play toggle and foreground/background notification paths

### F4 - Visit analytics queue and sync
- Queue persistence: `VisitQueueStore` (Preferences-backed crash-safe queue)
- Event sources:
  - geofence trigger in `MainViewModel`
  - manual trigger in `PoiDetailViewModel`
- Upload endpoint: `POST /api/v1/sync/visits`
- Mobile uploader: `ApiClient.UploadVisitsAsync`
- Critical behavior:
  - no data loss when upload fails
  - restore queue on app restart
  - listen duration update after playback completed

### F5 - Offline package lifecycle + delta sync
- Catalog: `GET /api/v1/offlinepackages/catalog`
- Download: `GET /api/v1/offlinepackages/{id}/download`
- Delta sync: `GET /api/v1/sync/delta?since=...&langId=...`
- Mobile handlers:
  - `OfflineViewModel`
  - `OfflinePackageSyncService`
  - `ApiClient.GetOfflineCatalogAsync`, `DownloadOfflinePackageToFileAsync`, `GetDeltaAsync`
- Critical behavior:
  - install/update/remove package
  - network loss recovery
  - checksum verification/update banner consistency

## Security and Contract Flows

### S1 - API envelope and error code consistency
- All endpoints must return `ApiResponse<T>` shape: `success`, `data`, `error`
- Error code mapping: `NOT_FOUND`, `FORBIDDEN`, `UNAUTHORIZED`, `VALIDATION_ERROR`

### S2 - Authorization boundary checks
- Anonymous only where intended (`nearby`, `public detail`, `languages`, stream/public mobile paths)
- Auth-required endpoints reject missing/expired JWT
- Role-scoped endpoints enforce admin/vendor/customer boundaries

### S3 - Token resilience
- Refresh rotation path works on valid refresh token
- Invalid/reused refresh token is rejected
- Expired access token with valid refresh recovers session

## Production-like Non-Functional Flows
- GPS denied/disabled behavior remains recoverable without app reinstall
- Unstable network (offline/online flapping) does not corrupt local queue/package state
- Audio stream/public detail continue to work under moderate latency
