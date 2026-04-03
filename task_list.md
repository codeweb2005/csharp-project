# ✅ Vinh Khanh Food Tour — Detailed Task List

> **Strategy:** Local dev/test → AWS Production  
> **Phases:** Backend gaps → Mobile PoC → Mobile MVP → AWS Deploy  
> **Notation:** `[file]` = file to create/modify · `→` = depends on

---

## Phase 1 — Complete Backend & Admin Panel Gaps
> **Goal:** Backend 100% ready for admin web and mobile client  
> **Effort:** ~3–5 days

---

### 1.1 Backend API — New Endpoints

#### ✅ Task 1.1.1 — `GET /api/v1/pois/nearby` — DONE
- Implemented in `POIService.GetNearbyAsync` using MySQL `ST_Distance_Sphere`
- Added `[AllowAnonymous]` [GetNearby](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Controllers/Controllers.cs#130-157) action to [POIsController](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Controllers/Controllers.cs#91-170)
- [NearbyPOIDto](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#153-162) created with `DistanceMeters`, [Audio](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#235-249), `Translations`
- Max radius capped at 5000m, coordinate validation in controller
- **Build:** ✅ `Build succeeded` (exit 0)

#### ✅ Task 1.1.2 — `GET /api/v1/pois/{id}/public` — DONE
- Implemented in `POIService.GetPublicDetailAsync` — only returns `IsActive=true` POIs
- Added `[AllowAnonymous]` [GetPublicDetail](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Controllers/Controllers.cs#158-169) action; optional `?langId` filter

#### ✅ Task 1.1.3 — `POST /api/v1/auth/register` — DONE
- [RegisterRequest](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#54-62) DTO added; [RegisterAsync](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Infrastructure/Services/AuthService.cs#198-261) implemented in [AuthService](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Infrastructure/Services/AuthService.cs#13-276)
- Validates unique email + username, hashes password, creates `Role=Customer`, issues JWT immediately

#### ✅ Task 1.1.4 — `GET /api/v1/languages` — DONE
- New [LanguagesController](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Controllers/Controllers.cs#179-192) + [ILanguageService](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/Services/IServices.cs#180-184) / [LanguageService](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Infrastructure/Services/LanguageService.cs#14-52) created
- Returns all `IsActive=true` languages sorted by `SortOrder`; registered in DI in [Program.cs](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Program.cs)

---

### 1.2 Backend — S3 File Storage

#### Task 1.2.1 — Create `S3FileStorageService`
- **NuGet:** add `AWSSDK.S3` to [VinhKhanh.Infrastructure.csproj](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Infrastructure/VinhKhanh.Infrastructure.csproj)
- **File:** `backend/src/VinhKhanh.Infrastructure/Services/S3FileStorageService.cs`
- **Interface:** extend existing `IFileStorageService` with `GetSignedUrlAsync(string key, int expiryMinutes)`
- **Methods to implement:**
  - `UploadAsync(Stream stream, string fileName, string contentType)` → upload to S3, return public key
  - [DeleteAsync(string key)](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Infrastructure/Services/POIService.cs#165-175) → `DeleteObjectAsync`
  - `GetSignedUrlAsync(string key, int expiryMinutes = 60)` → `GetPreSignedURL`
  - `GetStreamAsync(string key)` → `GetObjectAsync` → return response stream
- **Config keys:** `FileStorage:Provider`, `FileStorage:S3BucketName`, `FileStorage:S3Region`

#### Task 1.2.2 — Register via config flag
- **File:** [Program.cs](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Program.cs)
- **Logic:**
  ```csharp
  var provider = builder.Configuration["FileStorage:Provider"];
  if (provider == "s3")
      builder.Services.AddScoped<IFileStorageService, S3FileStorageService>();
  else
      builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
  ```

#### Task 1.2.3 — Update audio stream to use presigned URL
- **File:** [Controllers.cs](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Controllers/Controllers.cs) → `AudioController.Stream(int id)`
- **Current:** returns `File(stream, "audio/mpeg")`
- **New behavior:** if S3 provider → return `Redirect(signedUrl)`; else keep current stream
- **Verify:** With local provider → streams file. With S3 → redirects to presigned URL

#### Task 1.2.4 — Update offline package download
- **File:** [Controllers.cs](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.API/Controllers/Controllers.cs) → `OfflinePackagesController.Download(int id)`
- **New behavior:** if S3 → `Redirect(signedUrl)` for the ZIP in S3; else stream from local disk
- **Verify:** download ZIP works from both local and S3

---

### 1.3 Backend — POI Priority Field

#### ✅ Task 1.3.1 — Add `Priority` column — DONE
- Added `Priority INT NOT NULL DEFAULT 0` to [POI](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Domain/Entities/Entities.cs#64-97) entity and [Database/006_AddPhase1Columns.sql](file:///c:/ptran_docs/dct123c6/Csharp/Application/Database/006_AddPhase1Columns.sql)
- Mapped automatically by EF Core (existing `AppDbContext` convention)

#### ✅ Task 1.3.2 — Expose in DTOs — DONE
- `Priority` added to [POIListDto](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#126-148), [NearbyPOIDto](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#153-162), [CreatePOIRequest](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#178-200), [UpdatePOIRequest](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Application/DTOs/DTOs.cs#201-202)
- `POIService.CreateAsync` / [UpdateAsync](file:///c:/ptran_docs/dct123c6/Csharp/Application/backend/src/VinhKhanh.Infrastructure/Services/POIService.cs#102-164) already map `Priority`

---

### 1.4 Admin Panel — Google Maps Picker

#### ✅ Task 1.4.1 — Map Picker Component — DONE
- [components/MapPicker/MapPicker.jsx](file:///c:/ptran_docs/dct123c6/Csharp/Application/admin-frontend/src/components/MapPicker/MapPicker.jsx) created — loads Google Maps JS API lazily
- Click/drag marker sets coordinates; circle shows geofence radius in real-time
- Graceful fallback to manual lat/lng inputs if `VITE_GOOGLE_MAPS_API_KEY` is not set
- [.env.example](file:///c:/ptran_docs/dct123c6/Csharp/Application/admin-frontend/.env.example) added with `VITE_GOOGLE_MAPS_API_KEY=` placeholder

#### ✅ Task 1.4.2 — POI Form Modal with Map — DONE
- [components/POIForm/POIForm.jsx](file:///c:/ptran_docs/dct123c6/Csharp/Application/admin-frontend/src/components/POIForm/POIForm.jsx) — full create/edit modal with MapPicker embedded
- Translation tabs (VI/EN), Priority field, audio preview for existing narrations
- [pages/POI/POIList.jsx](file:///c:/ptran_docs/dct123c6/Csharp/Application/admin-frontend/src/pages/POI/POIList.jsx) rewritten with live API, real pagination, opens POIForm

---

### 1.5 Admin Panel — Minor Improvements

#### ✅ Task 1.5.1 — Audio preview player — DONE
- [components/AudioPreview/AudioPreview.jsx](file:///c:/ptran_docs/dct123c6/Csharp/Application/admin-frontend/src/components/AudioPreview/AudioPreview.jsx) created
- Inline HTML5 `<audio controls>` linked to `GET /api/v1/audio/{id}/stream`
- Embedded in [POIForm](file:///c:/ptran_docs/dct123c6/Csharp/Application/admin-frontend/src/components/POIForm/POIForm.jsx#56-465) translation tabs when editing an existing POI

#### Task 1.5.2 — POI list spatial mini-map
- **File:** `admin-frontend/src/pages/POI/` — add a small Google Map panel beside the POI table
- Show each visible POI as a pin; clicking pin highlights the row in table
- **Verify:** POI list page shows map with pins for all active POIs

#### ✅ Task 1.5.3 — CORS update — DONE
- `Program.cs` reads `CORS_ALLOWED_ORIGINS` env var (comma-delimited)
- Defaults to `localhost:5173` + `localhost:3000` in dev
- Set `CORS_ALLOWED_ORIGINS=https://d1234abcd.cloudfront.net` in ECS task definition at deploy time

---

### 1.6 Vendor Portal — Scoped Views in Shared Web Panel

> **Goal:** Vendor logs into same admin frontend but sees only their own shop's data.  
> Two-layer enforcement: JWT claim (backend) + role-gated UI (frontend).

#### ✅ Task 1.6.1 — Add `vendorPoiId` claim to JWT — DONE
- `JwtService.GenerateAccessToken` now adds `vendorPoiId` claim for Vendor users
- `user.VendorPOI` navigation must be eagerly loaded at login time (already done in `AuthService.LoginAsync`)
- `BaseApiController.GetVendorPOIId()` helper added — reads claim, returns `null` for Admins/Customers
- **Fully documented** with XML `<summary>` on `JwtService`, `BaseApiController`

#### ✅ Task 1.6.2 — Scope Dashboard & Analytics APIs to Vendor — DONE
- `IDashboardService` — all 5 methods updated with optional `int? vendorPOIId` param + XML docs
- `DashboardService` — all methods branch on `vendorPOIId`: Vendor sees own POI stats only; Admin gets system-wide
- `IAnalyticsService` + `AnalyticsService` — all 4 analytics methods scoped the same way
- `DashboardController` + `AnalyticsController` — each action passes `GetVendorPOIId()` to service

#### ✅ Task 1.6.3 — Scope POI edit + enforce ownership — DONE
- `POIService.UpdateAsync(id, request, callerId, callerRole)` — signature updated
- Vendor ownership guard: if `callerRole == "Vendor" && poi.VendorUserId != callerId` → `403 FORBIDDEN`
- Admin bypasses ownership check; Vendor cannot reassign `VendorUserId`
- Warning logged with structured fields when unauthorized edit is attempted

#### ✅ Task 1.6.4 — Frontend: `useCurrentUser` hook + role-gated sidebar — DONE
- `src/hooks/useCurrentUser.js` — decodes JWT from localStorage, returns `{ isAdmin, isVendor, vendorPOIId, name, role }`
- `Sidebar.jsx` — filters `menuItems` by role; Admin-only items hidden for Vendor
  - ❌ Vendor hidden: Users, Settings, Offline Packages, global Dashboard
  - ✅ Vendor shown: My Shop, POIs, Categories, Audio, Menu, Analytics
- Sidebar subtitle shows "🏪 Vendor Portal" for Vendors, "Admin Panel" for Admins
- Avatar turns amber for Vendors; logout calls `clearTokens()` and redirects

#### ✅ Task 1.6.5 — Frontend: Vendor-scoped pages — DONE
- `VendorDashboard.jsx` + `VendorDashboard.css` — visit count, narrations, avg listen time, language breakdown, 24-bar hourly chart
- `POIList.jsx` — Vendor mode via `useCurrentUser`:  
  - "Add POI" button hidden  
  - "Delete" and "Toggle Featured" hidden  
  - POI list auto-filtered to own POI (backend scoping via JWT)
- `App.jsx` — new `DashboardRoute` component: routes to `VendorDashboard` if `isVendor`, else `Dashboard`

---

## Phase 2 — Mobile App: PoC
> **Goal:** GPS detects POI, auto-plays narration on real device  
> **Effort:** ~1–2 weeks

---

### 2.1 Project Setup

#### Task 2.1.1 — Scaffold MAUI project
- **Command:**
  ```bash
  dotnet new maui -n VinhKhanh.Mobile -o mobile/VinhKhanh.Mobile
  ```
- **File:** `mobile/VinhKhanh.Mobile/VinhKhanh.Mobile.csproj`
  - Target frameworks: `net10.0-android`, `net10.0-ios`
  - Min Android API: 26 (Oreo)
  - Min iOS: 15.0

#### Task 2.1.2 — Add NuGet packages
```xml
<PackageReference Include="CommunityToolkit.Maui" Version="*" />
<PackageReference Include="CommunityToolkit.Maui.MediaElement" Version="*" />
<PackageReference Include="sqlite-net-pcl" Version="*" />
<PackageReference Include="SQLitePCLRaw.bundle_green" Version="*" />
<PackageReference Include="Microsoft.Extensions.Http" Version="*" />
<PackageReference Include="CommunityToolkit.Mvvm" Version="*" />
```

#### Task 2.1.3 — Folder structure
```
mobile/VinhKhanh.Mobile/
├── Services/
│   ├── ILocationService.cs
│   ├── LocationService.cs
│   ├── GeofenceEngine.cs
│   ├── INarrationPlayer.cs
│   ├── NarrationPlayer.cs
│   └── ApiClient.cs
├── Models/               ← SQLite table models
│   ├── PoiLocal.cs
│   ├── TranslationLocal.cs
│   ├── AudioLocal.cs
│   └── VisitHistoryLocal.cs
├── ViewModels/
│   ├── MainViewModel.cs
│   └── PoiDetailViewModel.cs
├── Views/
│   ├── MainPage.xaml
│   ├── PoiDetailPage.xaml
│   └── NowPlayingBar.xaml
├── Database/
│   └── LocalDatabase.cs
├── appsettings.json      ← API base URL, config
└── MauiProgram.cs        ← DI registration
```

---

### 2.2 Location Service

#### Task 2.2.1 — `ILocationService` interface
- **File:** `Services/ILocationService.cs`
```csharp
public interface ILocationService
{
    Task StartTrackingAsync();
    Task StopTrackingAsync();
    event EventHandler<LocationUpdate> LocationUpdated;
    Location? LastKnownLocation { get; }
}
public record LocationUpdate(double Lat, double Lng, double AccuracyMeters);
```

#### Task 2.2.2 — `LocationService` implementation
- **File:** `Services/LocationService.cs`
- Use `Geolocation.GetLocationAsync()` + polling loop (every 5s) for PoC
- Or use `Geolocation.StartListeningForegroundAsync()` (MAUI 8+)
- Request `LocationWhenInUse` permission before starting
- Expose `LocationUpdated` event with `LocationUpdate` record

#### Task 2.2.3 — Permission handling
- **File:** `MauiProgram.cs` — request permission on first launch
- Android `AndroidManifest.xml`: add `ACCESS_FINE_LOCATION`
- iOS `Info.plist`: add `NSLocationWhenInUseUsageDescription`

---

### 2.3 Geofence Engine

#### Task 2.3.1 — `GeofenceEngine` class
- **File:** `Services/GeofenceEngine.cs`
- **Constructor:** `GeofenceEngine(ILocationService locationService)`
- **Method:** `LoadPOIs(IEnumerable<PoiLocal> pois)` — set watched list
- **On `LocationUpdated` event:**
  1. For each POI, compute distance using **Haversine formula**
  2. Check if `distance <= poi.GeofenceRadiusMeters`
  3. Track previous states in `Dictionary<int, GeofenceState>` to detect transitions
  4. **Debounce:** only fire `GeofenceEntered` after 3 consecutive in-range readings (~15 sec)
  5. Fire `GeofenceEntered(PoiLocal)` or `GeofenceExited(PoiLocal)` events
- **Priority:** when `GeofenceEntered` fires for multiple POIs simultaneously → emit only the highest `Priority` one
- **Events:**
  ```csharp
  event EventHandler<PoiLocal> GeofenceEntered;
  event EventHandler<PoiLocal> GeofenceExited;
  ```

---

### 2.4 Narration Player

#### Task 2.4.1 — `INarrationPlayer` interface
- **File:** `Services/INarrationPlayer.cs`
```csharp
public interface INarrationPlayer
{
    Task PlayAsync(string? audioUrl, string? ttsText, string langCode);
    void Stop();
    void Pause();
    void Resume();
    bool IsPlaying { get; }
    event EventHandler PlaybackCompleted;
}
```

#### Task 2.4.2 — `NarrationPlayer` implementation
- **File:** `Services/NarrationPlayer.cs`
- If `audioUrl != null`:
  - Use `CommunityToolkit.Maui.MediaElement` → set `Source`, call `Play()`
  - Check local cache first (`FileSystem.AppDataDirectory/audio/audio_{id}.mp3`)
  - Stream from API if not cached
- If `audioUrl == null` and `ttsText != null`:
  - Use `TextToSpeech.SpeakAsync(ttsText, new SpeechOptions { Language = langCode })`
- Ensure `Stop()` is called before `PlayAsync()` to prevent overlap
- Wire `PlaybackCompleted` when `MediaElement.StateChanged` → Stopped

---

### 2.5 API Client

#### Task 2.5.1 — `ApiClient` class
- **File:** `Services/ApiClient.cs`
- **Config:** read `BaseUrl` from `appsettings.json` embedded resource
- **Methods (PoC):**
  ```csharp
  Task<List<PoiDto>> GetNearbyPOIsAsync(double lat, double lng, int radiusMeters, int langId)
  Task<List<LanguageDto>> GetLanguagesAsync()
  Task<string> LoginAsync(string email, string password)     // → JWT
  Task RegisterAsync(string email, string password, ...)
  ```
- **Auth:** store JWT in `SecureStorage.SetAsync("jwt_token", token)`
- **HTTP:** use `IHttpClientFactory`, set `Authorization: Bearer {token}` header

---

### 2.6 Basic UI (PoC)

#### Task 2.6.1 — `MainPage`
- **File:** `Views/MainPage.xaml` + `ViewModels/MainViewModel.cs`
- On load: start GPS → load nearby POIs → show in `CollectionView`
- Each row: `{CategoryIcon}  {POIName}  {distanceMeters}m`
- Tap row → navigate to `PoiDetailPage`
- Status bar: "📍 Tracking active" / "⚠️ GPS off"

#### Task 2.6.2 — `PoiDetailPage`
- **File:** `Views/PoiDetailPage.xaml`
- Shows: POI name, category, address, description, price range
- "▶ Play Narration" button → calls `NarrationPlayer.PlayAsync()`
- Back button

#### Task 2.6.3 — `NowPlayingBar`
- **File:** `Views/NowPlayingBar.xaml`
- Floating bottom bar visible when `IsPlaying == true`
- Shows POI name + ⏸ Pause / ⏹ Stop buttons
- Dismiss on Stop or when `GeofenceExited` fires

#### Task 2.6.4 — Wire geofence → auto-play
- In `MainViewModel`: subscribe to `GeofenceEngine.GeofenceEntered`
- On enter → call `NarrationPlayer.PlayAsync()` with the POI's audio
- On exit → call `NarrationPlayer.Stop()` (if same POI)

---

## Phase 3 — Mobile App: MVP
> **Goal:** Production-ready for real visitors, fully offline-capable  
> **Effort:** ~3–4 weeks

---

### 3.1 SQLite Offline Database

#### Task 3.1.1 — SQLite models
- **File:** `Models/PoiLocal.cs`
```csharp
[Table("POIs")]
public class PoiLocal {
    [PrimaryKey] public int Id { get; set; }
    public int CategoryId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadiusMeters { get; set; }
    public int Priority { get; set; }
    public string Address { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```
- Similar models: `TranslationLocal`, `AudioLocal`, `CategoryLocal`, `LanguageLocal`
- **File:** `Models/VisitHistoryLocal.cs` — pending visits for sync
- **File:** `Models/SyncMeta.cs` — `{ EntityType, LastSyncedAt }`

#### Task 3.1.2 — `LocalDatabase` class
- **File:** `Database/LocalDatabase.cs`
- Init: `SQLiteAsyncConnection` pointing to `FileSystem.AppDataDirectory/vk_local.db`
- `CreateTablesAsync()` — called once on app start
- Methods: `UpsertPOIsAsync`, `GetNearbyPOIsAsync(lat, lng, radius)` (in-memory Haversine on local data), `SaveVisitAsync`, `GetPendingVisitsAsync`, `MarkVisitsSyncedAsync`

---

### 3.2 Background GPS Tracking

#### Task 3.2.1 — Android Foreground Service
- **File:** `mobile/Platforms/Android/LocationForegroundService.cs`
- Extends `Android.App.Service`
- Shows persistent notification while running: "Vinh Khanh Food Tour — Tracking location"
- Start service when app goes to background (`OnSleep`)
- Stop service when app resumes (`OnResume`) or user disables GPS in settings
- **Manifest:** `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`

#### Task 3.2.2 — iOS Background Mode
- **File:** `mobile/Platforms/iOS/Info.plist`
  ```xml
  <key>UIBackgroundModes</key>
  <array><string>location</string></array>
  ```
- Use `CLLocationManager.AllowsBackgroundLocationUpdates = true`
- Use `CLLocationManager.PausesLocationUpdatesAutomatically = false`

---

### 3.3 Sync Service

#### Task 3.3.1 — `SyncService` class
- **File:** `Services/SyncService.cs`
- **`SyncAllAsync(int langId)`:**
  1. Check connectivity (`Connectivity.NetworkAccess == NetworkAccess.Internet`)
  2. Read `SyncMeta.LastSyncedAt` for `"POI"` entity
  3. Call `ApiClient.GetDeltaAsync(since, langId)` → `/sync/delta`
  4. Upsert received records into `LocalDatabase`
  5. Update `SyncMeta.LastSyncedAt = DateTime.UtcNow`
- **`UploadVisitsAsync()`:**
  1. Read pending `VisitHistoryLocal` records
  2. Call `ApiClient.UploadVisitsAsync(batch)` → `/sync/visits`
  3. On success → `MarkVisitsSyncedAsync()`
- **`DownloadAudioAsync(int narrationId, string url)`:**
  - Download MP3 to `FileSystem.AppDataDirectory/audio/audio_{narrationId}.mp3`
  - Show `ProgressBar` in Settings page

#### Task 3.3.2 — Auto-sync trigger
- **File:** `MauiProgram.cs` / `App.xaml.cs`
- Call `SyncService.SyncAllAsync()` on app start if online
- Call `SyncService.UploadVisitsAsync()` on app start if online
- Manual sync button in Settings page

---

### 3.4 Offline Audio Cache

#### Task 3.4.1 — Local audio cache check
- **File:** `Services/NarrationPlayer.cs` — update `PlayAsync`
- Before streaming from API:
  ```csharp
  var localPath = Path.Combine(FileSystem.AppDataDirectory, "audio", $"audio_{narrationId}.mp3");
  if (File.Exists(localPath))
      mediaElement.Source = MediaSource.FromFile(localPath);
  else
      mediaElement.Source = MediaSource.FromUri(streamUrl);
  ```

#### Task 3.4.2 — Download all audio for a language
- **File:** `Views/SettingsPage.xaml` — "Download Offline Audio" button
- Per-POI download status: ✅ cached / 📥 not downloaded / ⟳ downloading
- Progress: `Progress<double>` passed into `SyncService.DownloadAudioAsync`

---

### 3.5 Map View

#### Task 3.5.1 — Map page
- **File:** `Views/MapPage.xaml`
- Use `Microsoft.Maui.Controls.Maps` (built into MAUI)
  ```xml
  <maps:Map x:Name="Map" MapType="Street">
      <maps:Map.Pins> ... </maps:Map.Pins>
  </maps:Map>
  ```
- Or use `GoogleMaps.Maui` NuGet for full Google Maps SDK
- Display: user location (blue dot), each active POI pin, geofence circle overlay

#### Task 3.5.2 — POI pins
- **File:** `ViewModels/MapViewModel.cs`
- Load POIs from `LocalDatabase`, add as `Pin` objects
- Pin tap → show bottom sheet with POI name, category, distance, "▶ Play" button
- Color-code pins by category

#### Task 3.5.3 — Android/iOS Maps API keys
- Android: register key in `AndroidManifest.xml` under `<meta-data android:name="com.google.android.geo.API_KEY">`
- iOS: register key in `AppDelegate.cs` → `GoogleMaps.MapServices.ProvideAPIKey("...")`

---

### 3.6 Cooldown & Anti-Replay

#### Task 3.6.1 — Cooldown check in GeofenceEngine
- **File:** `Services/GeofenceEngine.cs`
- Before firing `GeofenceEntered`:
  ```csharp
  var lastVisit = await _db.GetLastVisitAsync(poi.Id);
  if (lastVisit != null && (DateTime.UtcNow - lastVisit.VisitedAt).TotalMinutes < _settings.CooldownMinutes)
      return; // skip — still in cooldown
  ```
- Cooldown minutes read from `UserSettingsService` (persisted in `Preferences.Set`)

---

### 3.7 User Settings Screen

#### Task 3.7.1 — Settings page
- **File:** `Views/SettingsPage.xaml` + `ViewModels/SettingsViewModel.cs`
- **Controls:**
  | Setting | Control |
  |---|---|
  | Language | `Picker` bound to `LanguageService.Available` |
  | Narration mode | `Picker` (Auto / Recorded / TTS / Text only) |
  | Volume | `Slider` 0.0–1.0 |
  | Playback speed | `Picker` (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x) |
  | GPS tracking | `Switch` |
  | Auto-play | `Switch` |
  | Cooldown | `Stepper` (5–120 min, step 5) |
  | Download offline | `Button` + `ProgressBar` |
  | Clear cache | `Button` (clears audio folder + SQLite) |
- Persist all values to `Microsoft.Maui.Storage.Preferences`

---

### 3.8 Visit History & My Visits

#### Task 3.8.1 — Log visits
- **File:** `Services/GeofenceEngine.cs` — on `GeofenceEntered`:
  ```csharp
  await _db.SaveVisitAsync(new VisitHistoryLocal {
      POIId = poi.Id, VisitedAt = DateTime.UtcNow,
      TriggerType = 0, // GeofenceEnter
      NarrationPlayed = true, NarrationType = audioType
  });
  ```

#### Task 3.8.2 — My Visits page
- **File:** `Views/VisitHistoryPage.xaml`
- List of visits: POI name, date/time, narration type played
- "Sync now" button to upload pending visits

---

## Phase 4 — AWS Production Deployment
> **Goal:** Full production system live on AWS  
> **Effort:** ~1 week

---

### 4.1 Infrastructure Setup

#### Task 4.1.1 — VPC & Networking
- Create VPC: CIDR `10.0.0.0/16`
- Public subnets (2 AZs): ALB, NAT Gateway
- Private subnets (2 AZs): ECS Fargate tasks, RDS
- Internet Gateway → public subnets
- NAT Gateway → private subnets (ECS outbound to Azure TTS, S3)
- Security groups:
  - `sg-alb`: inbound 443 from `0.0.0.0/0`
  - `sg-ecs`: inbound 8080 from `sg-alb` only
  - `sg-rds`: inbound 3306 from `sg-ecs` only

#### Task 4.1.2 — RDS MySQL
- Engine: MySQL 8.0, Multi-AZ: Yes (prod) / No (staging)
- Instance: `db.t3.medium` for prod
- Subnet group: private subnets
- Storage: 20 GB GP3, auto-scaling enabled up to 100 GB
- Parameter group: set `character_set_server=utf8mb4`, `collation_server=utf8mb4_unicode_ci`
- Run SQL scripts `001` → `005` via bastion or RDS Query Editor

#### Task 4.1.3 — S3 Buckets
- `vinhkhanh-assets`: Block all public access, server-side encryption SSE-S3
- `vinhkhanh-frontend`: Static website hosting enabled, public read policy
- `vinhkhanh-frontend` CORS: allow `GET` from CloudFront origin

#### Task 4.1.4 — ECR & ECS
- Create ECR repo: `vinhkhanh-api`
- Create ECS Cluster (Fargate)
- Task Definition:
  - Image: `<account>.dkr.ecr.<region>.amazonaws.com/vinhkhanh-api:latest`
  - CPU: 512, Memory: 1024 (scale up as needed)
  - Port mapping: container port `8080`
  - Environment variables from Secrets Manager:
    - `ConnectionStrings__DefaultConnection`
    - `Jwt__Key`
    - `AzureTTS__SubscriptionKey`
    - `FileStorage__Provider = s3`
    - `FileStorage__S3BucketName = vinhkhanh-assets`
  - Log driver: `awslogs` → CloudWatch log group `/ecs/vinhkhanh-api`
- ECS Service: desired count 1 (scale to 2+ for prod)

#### Task 4.1.5 — ALB + ACM + CloudFront
- Request ACM certificate for `vinhkhanh.com`, `*.vinhkhanh.com` (DNS validation via Route 53)
- ALB:
  - Listener: HTTPS 443 → forward to ECS target group
  - HTTP 80 → redirect to HTTPS
  - Target group health check: `GET /swagger` → 200
- CloudFront distribution:
  - Origin: `vinhkhanh-frontend.s3-website.<region>.amazonaws.com`
  - Default root object: `index.html`
  - Error pages: 404 → `/index.html` 200 (SPA routing)
  - Cache policy: managed `CachingOptimized` for assets; `CachingDisabled` for `index.html`
  - Alternate domain: `vinhkhanh.com`, ACM cert

#### Task 4.1.6 — Secrets Manager
- Create secrets:
  - `/vinhkhanh/prod/db-password`
  - `/vinhkhanh/prod/jwt-key`
  - `/vinhkhanh/prod/azure-tts-key`
  - `/vinhkhanh/prod/google-maps-key`
- Attach `SecretsManagerReadWrite` policy to ECS task role

---

### 4.2 Backend — Docker & Deploy

#### Task 4.2.1 — Dockerfile
- **File:** `backend/Dockerfile` (already documented in `DEPLOYMENT.md`)
- Build: `dotnet publish -c Release -o /app/publish`
- Final image: `mcr.microsoft.com/dotnet/aspnet:10.0`
- `EXPOSE 8080`, `ENV ASPNETCORE_URLS=http://+:8080`
- **Verify:** `docker build` succeeds locally → `docker run -p 8080:8080` → Swagger loads

#### Task 4.2.2 — CI/CD: push to ECR & deploy ECS
```bash
# Authenticate
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

# Build & push
docker build -t vinhkhanh-api ./backend
docker tag vinhkhanh-api:latest <account>.dkr.ecr.<region>.amazonaws.com/vinhkhanh-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/vinhkhanh-api:latest

# Update ECS service (triggers rolling deployment)
aws ecs update-service --cluster vinhkhanh-cluster --service vinhkhanh-api --force-new-deployment
```

---

### 4.3 Frontend Deploy

#### Task 4.3.1 — Build & sync to S3
```bash
cd admin-frontend
npm run build
aws s3 sync ./dist s3://vinhkhanh-frontend --delete --cache-control "max-age=31536000,immutable"
# Reset cache for index.html only
aws s3 cp ./dist/index.html s3://vinhkhanh-frontend/index.html --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id <CF_ID> --paths "/index.html"
```

---

### 4.4 Mobile — Production Release

#### Task 4.4.1 — Android signed AAB
- Generate keystore: `keytool -genkey -v -keystore vinhkhanh.keystore ...`
- **File:** `mobile/VinhKhanh.Mobile/VinhKhanh.Mobile.csproj` — add signing config
- Build: `dotnet publish -f net10.0-android -c Release`
- Output: `.aab` file for Google Play upload

#### Task 4.4.2 — iOS build
- Requires Apple Developer account + provisioning profile
- Build via Visual Studio for Mac or via `xcodebuild`
- Output: `.ipa` for TestFlight or App Store

---

### 4.5 Monitoring & Operations

#### Task 4.5.1 — CloudWatch alarms
- ECS CPU alarm: > 80% for 5 min → SNS email
- ECS Memory alarm: > 80% for 5 min → SNS email
- ALB 5xx alarm: > 10 errors/min → SNS email
- RDS storage alarm: > 80% → SNS email

#### Task 4.5.2 — Operational runbook
- **File:** `RUNBOOK.md` at repo root
- Document: how to redeploy backend, redeploy frontend, rollback ECS to previous task revision, connect to RDS for manual queries (via EC2 bastion), view logs in CloudWatch

---

## Summary

| Phase | Tasks | Effort | Status | Depends on |
|---|---|---|---|---|
| **Phase 1** — Backend & Admin gaps | 20 tasks | 3–5 days | ✅ **Complete** | Nothing |
| **Phase 2** — MAUI PoC | 14 tasks | 1–2 weeks | ⬜ Not started | Phase 1 API endpoints |
| **Phase 3** — MAUI MVP | 20 tasks | 3–4 weeks | ⬜ Not started | Phase 2 |
| **Phase 4** — AWS Deploy | 16 tasks | 1 week | ⬜ Not started | Phase 1 (S3), Phase 3 (mobile app) |

### Phase 1 Status Detail

| Task | Status |
|---|---|
| 1.1 New API endpoints (4 endpoints) | ✅ Done |
| 1.2 S3 File Storage | ⬜ Phase 4 (placeholder in Program.cs added) |
| 1.3 POI Priority field | ✅ Done |
| 1.4 Admin Google Maps picker | ✅ Done |
| 1.5.1 Audio preview player | ✅ Done |
| 1.5.2 POI mini-map | ⬜ Pending |
| 1.5.3 CORS env variable | ✅ Done |
| 1.6 Vendor Portal | ✅ Done (all 5 sub-tasks) |

> **Start AWS infra setup (4.1) in parallel with Phase 3** — networking and RDS take time to provision.
