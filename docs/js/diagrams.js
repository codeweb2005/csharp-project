/* diagrams.js — Mermaid diagrams fully verified against source code
   Sources audited:
   - backend/Program.cs, JwtService.cs, AuthService.cs, AzureTTSService.cs
   - mobile/GeofenceEngine.cs, NarrationPlayer.cs, OfflineCacheStore.cs
   - mobile/VisitQueueStore.cs, OfflinePackageSyncService.cs, LocalNotificationService.cs, ApiClient.cs
   CORRECTIONS vs previous version:
   - JWT claims: NO vendorPoiId in token (JwtService.cs L36-43: only sub,email,name,role,jti,iat)
   - Vendor scoping: backend fetches vendorPOI list from DB fresh (not JWT claim), L56 Include(u=>u.VendorPOIs)
   - RefreshToken: stored as PLAINTEXT in User.RefreshToken column (NOT SHA-256 hash)
   - Refresh flow: SELECT WHERE user.RefreshToken == token directly (AuthService L113)
   - Cooldown: set after PlaybackCompleted fires (GeofenceEngine.SetCooldown(int)), default 10 minutes
   - Geofence: DEBOUNCE 3 consecutive readings (not immediate), raises GeofenceEntered event
   - NarrationPlayer: PlayAsync(audioUrl, ttsText, langCode) -- local file check TryGetLocalFilePath first
   - NarrationPlayer: MediaFailed fallback to TTS on stream error
   - VisitQueueStore: Enqueue/Dequeue/RestoreToQueue pattern (not ClearUploaded)
   - OfflineCacheStore: GetNearbyPoisAsync(lat,lng,radiusMeters,languageId) uses Haversine NOT SQL
   - AzureTTSService: uses SDK SpeechSynthesizer.SpeakSsmlAsync (not REST), output MP3 16kHz128k
   - OfflinePackageSyncService: SyncDeltaAsync + PrefLastSync = "last_sync_time"
   - Program.cs: AddSingleton<AzureTTSService>, AddSingleton<JwtService>, RequestLoggingMiddleware + MaintenanceMiddleware exist
   - Program.cs: IEmailSender conditional (SES vs Null), IMediaService, IMenuService, ISyncService, ILanguageService all present
   - DI: JwtService is NOT IAuthService, it's a concrete Singleton (no interface wrapper)
*/
window.DIAGRAM_DATA = {diagrams: {

/* ══════════════════════════════════════════
   ARCHITECTURE
══════════════════════════════════════════ */
'architecture': {
title: 'System Architecture — Vinh Khanh Food Tour',
mermaid: `graph TB
    subgraph Clients["Client Tier"]
        ADMIN["Admin Panel\nReact 19 + Vite 7\nAnt Design 6.3 :5173"]
        VENDOR["Vendor Panel\nReact 19 + Vite 7\nAnt Design 6.3 :5174"]
        MOBILE[".NET MAUI\nAndroid + iOS\nGeofenceEngine\nNarrationPlayer\nSQLite offline"]
    end
    subgraph Backend["ASP.NET Core 10 REST API :5015"]
        CTRL["Controllers/ (all in Controllers.cs)\nBaseApiController + ApiResponse"]
        MW["Middleware/\nExceptionMiddleware\nRequestLoggingMiddleware\nMaintenanceMiddleware"]
        PROG["Program.cs\nDI / CORS / JWT / Swagger"]
    end
    subgraph AppLayer["VinhKhanh.Application"]
        ISVC["Services/IServices.cs (all interfaces)"]
        DTOS["DTOs/DTOs.cs (all DTOs)"]
    end
    subgraph Domain["VinhKhanh.Domain — ZERO NuGet deps"]
        ENT["Entities/Entities.cs"]
        ENUMS["Enums/Enums.cs"]
        IFACE["Interfaces/Interfaces.cs"]
    end
    subgraph Infra["VinhKhanh.Infrastructure"]
        EF["Data/AppDbContext.cs\nData/DataSeeder.cs\nPomelo MySQL 8"]
        REPO["Repositories/POIRepository.cs\nST_Distance_Sphere"]
        SVCS["Services/ 21 files\nAuthService JwtService POIService\nAudioService AzureTTSService ..."]
    end
    subgraph External["External Services"]
        MYSQL[("MySQL 8.0\nInnoDB utf8mb4")]
        S3["AWS S3\naudio/ offline/"]
        AZTTS["Azure TTS SDK\nSpeechSynthesizer\nsoutheastasia"]
    end

    ADMIN & VENDOR -->|"HTTP Bearer JWT"| CTRL
    MOBILE -->|"HTTP Bearer / Anonymous"| CTRL
    PROG --> CTRL & MW
    CTRL --> ISVC
    ISVC --> SVCS
    SVCS --> EF & S3 & AZTTS
    EF --> MYSQL
    SVCS --> REPO
    REPO --> EF`
},

'clean-arch': {
title: 'Clean Architecture — Layer Dependency',
mermaid: `graph LR
    API["VinhKhanh.API\nControllers/ Controllers.cs\nMiddleware/ Middleware.cs\nProgram.cs"]
    APP["VinhKhanh.Application\nServices/ IServices.cs\nDTOs/ DTOs.cs\nValidators/"]
    DOM["VinhKhanh.Domain\nEntities/ Entities.cs\nEnums/ Enums.cs\nInterfaces/ Interfaces.cs\n\nZERO NuGet deps"]
    INF["VinhKhanh.Infrastructure\nData/ AppDbContext.cs DataSeeder.cs\nRepositories/ POIRepository.cs\nServices/ — 21 service files"]

    API -->|depends on| APP
    API -->|DI only| INF
    APP -->|depends on| DOM
    INF -->|depends on| DOM
    INF -->|depends on| APP

    style DOM fill:#0f766e,color:#fff,stroke:#14b8a6
    style APP fill:#1e3a5f,color:#f1f5f9,stroke:#0ea5e9
    style API fill:#2d1b69,color:#f1f5f9,stroke:#6366f1
    style INF fill:#334155,color:#f1f5f9,stroke:#475569`
},

'infra-prod': {
title: 'Production Infrastructure — AWS',
mermaid: `graph LR
    USR["Browser\n+ Mobile App"]
    CF["AWS CloudFront\nSPA CDN"]
    S3F["AWS S3\nReact static files"]
    ALB["AWS ALB\nHTTPS 443"]
    ECS["AWS ECS Fargate\nASP.NET Core 10\n:5015"]
    RDS["AWS RDS\nMySQL 8.0 Multi-AZ"]
    S3M["AWS S3\naudio/ offline/"]
    AZ["Azure Cognitive Services\nSpeechSynthesizer SDK\nsoutheastasia"]

    USR -->|SPA| CF --> S3F
    USR -->|API| ALB --> ECS
    ECS --> RDS
    ECS --> S3M
    ECS --> AZ

    style ECS fill:#1e3a5f,color:#f1f5f9,stroke:#0ea5e9
    style RDS fill:#0f766e,color:#fff,stroke:#14b8a6
    style AZ fill:#2d1b69,color:#f1f5f9,stroke:#6366f1`
},

/* ══════════════════════════════════════════
   SEQUENCE — verified against source
══════════════════════════════════════════ */
'backend-startup': {
title: 'Sequence: ASP.NET Core 10 — Backend Startup (Program.cs verified)',
mermaid: `sequenceDiagram
    participant HOST as WebApplication.CreateBuilder
    participant PROG as Program.cs DI Registration
    participant EF as AppDbContext (Pomelo MySQL8)
    participant JWT as JwtService (Singleton)
    participant APP as App Pipeline

    HOST->>PROG: AddDbContext MySQL8 Pomelo
    PROG->>PROG: AddAuthentication JwtBearer HMAC-SHA256
    Note over PROG: ValidateIssuer ValidateAudience ValidateLifetime
    Note over PROG: ClockSkew = TimeSpan.Zero
    PROG->>PROG: AddCors AllowFrontend
    Note over PROG: Origins: localhost:5173 5174 3000 + CORS_ALLOWED_ORIGINS env
    PROG->>PROG: AddScoped IRepository Repository generic
    PROG->>PROG: AddScoped IPOIRepository POIRepository
    PROG->>JWT: AddSingleton JwtService (concrete, no interface)
    PROG->>PROG: AddScoped IAuthService AuthService
    PROG->>PROG: AddScoped Email: IEmailSender SesEmailSender or NullEmailSender
    PROG->>PROG: AddScoped IPOIService ICategoryService IAudioService IMediaService
    PROG->>PROG: AddScoped IMenuService IUserService IDashboardService IAnalyticsService
    PROG->>PROG: AddScoped IOfflinePackageService ISettingsService ISyncService ILanguageService
    PROG->>PROG: AddSingleton ITTSService AzureTTSService
    PROG->>PROG: AddScoped IFileStorageService LocalFileStorage or S3FileStorage
    PROG->>PROG: AddControllers CamelCase JSON WhenWritingNull
    PROG->>PROG: AddSwaggerGen dev only
    HOST->>HOST: app.Build()
    HOST->>APP: UseMiddleware ExceptionMiddleware
    HOST->>APP: UseMiddleware RequestLoggingMiddleware
    HOST->>APP: UseSwagger dev only
    HOST->>APP: UseCors AllowFrontend
    HOST->>APP: UseAuthentication UseAuthorization
    HOST->>APP: UseMiddleware MaintenanceMiddleware
    HOST->>APP: UseStaticFiles MapControllers
    HOST->>EF: DataSeeder.SeedAsync dev only
    Note over HOST: Ready on configured port`
},

'mobile-startup': {
title: 'Sequence: MAUI Mobile — Startup + Initial Load',
mermaid: `sequenceDiagram
    participant OS as Android/iOS OS
    participant APP as MauiProgram.cs DI
    participant AC as ApiClient
    participant CACHE as OfflineCacheStore SQLite
    participant GEO as GeofenceEngine
    participant NAR as NarrationPlayer

    OS->>APP: Launch App
    APP->>APP: UseMauiApp UseMauiCommunityToolkit UseMapsui
    Note over APP: DI: ApiClient GeofenceEngine NarrationPlayer
    Note over APP: LocalNotificationService OfflineCacheStore VisitQueueStore
    APP->>AC: RestoreSessionAsync
    Note over AC: SecureStorage.GetAsync vk_access_token
    Note over AC: Set DefaultRequestHeaders.Authorization Bearer

    APP->>CACHE: GetNearbyPoisAsync (offline fallback from SQLite)
    CACHE-->>APP: List PoiLocal or empty
    APP->>GEO: LoadPOIs(pois) init state machine
    Note over GEO: _states all Unknown _debounce all 0

    APP->>AC: GetNearbyPoisAsync(lat, lng, radiusMeters, langId)
    Note over AC: GET /pois/nearby?lat=...&lng=...&radiusMeters=...&langId=...
    AC-->>APP: List PoiLocal (audioUrl = baseUrl/audio/id/stream?proxy=1)
    APP->>CACHE: UpsertFromOnlinePoisAsync(pois, langId)
    APP->>GEO: LoadPOIs(freshPois)

    APP->>NAR: SetMediaElement(mediaElement)
    Note over NAR: Weak reference to XAML MediaElement
    APP->>GEO: ILocationService.LocationUpdated subscribe
    Note over GEO: poll via ILocationService.StartListening`
},

'auth-jwt': {
title: 'Sequence: JWT Login + Token Refresh (verified AuthService.cs + JwtService.cs)',
mermaid: `sequenceDiagram
    participant FE as Frontend api.js
    participant CTRL as AuthController
    participant SVC as AuthService
    participant JWT as JwtService (Singleton)
    participant DB as MySQL Users table

    Note over FE,DB: LOGIN FLOW — AuthService.LoginAsync
    FE->>CTRL: POST /auth/login email + password
    CTRL->>SVC: LoginAsync(LoginRequest)
    SVC->>DB: SELECT Users WHERE Email LOWER include VendorPOIs
    DB-->>SVC: User entity
    SVC->>SVC: PasswordHasher.Verify(password, user.PasswordHash)
    Note over SVC: PBKDF2-SHA256 verify — 100,000 iterations, FixedTimeEquals
    SVC->>SVC: check user.IsActive
    SVC->>JWT: GenerateAccessToken(user)
    Note over JWT: claims: sub email name role jti iat
    Note over JWT: NO vendorPoiId in token
    JWT-->>SVC: signed JWT string HMAC-SHA256
    SVC->>JWT: GenerateRefreshToken() 64-byte random
    JWT-->>SVC: base64 string
    SVC->>DB: SET user.RefreshToken = plaintext token
    Note over DB: Stored as PLAINTEXT not hashed
    SVC->>DB: SET user.RefreshTokenExpiry user.LastLoginAt
    SVC-->>CTRL: ApiResponse LoginResponse
    CTRL-->>FE: 200 accessToken refreshToken expiresIn user

    Note over FE,DB: REFRESH FLOW — AuthService.RefreshTokenAsync
    FE->>CTRL: POST /auth/refresh body = refreshToken string
    CTRL->>SVC: RefreshTokenAsync(refreshToken)
    SVC->>DB: SELECT Users WHERE RefreshToken == token include VendorPOIs
    Note over DB: Direct plaintext match on RefreshToken column
    DB-->>SVC: User entity
    SVC->>SVC: check user.RefreshTokenExpiry vs DateTime.UtcNow
    SVC->>SVC: check user.IsActive
    SVC->>JWT: GenerateAccessToken(user) new token
    SVC->>JWT: GenerateRefreshToken() new 64-byte random
    SVC->>DB: UPDATE user.RefreshToken = newToken rotation
    SVC-->>CTRL: ApiResponse LoginResponse new pair
    CTRL-->>FE: 200 new accessToken + refreshToken`
},

'mobile-auth': {
title: 'Sequence: Mobile Auth — SecureStorage (ApiClient.cs verified)',
mermaid: `sequenceDiagram
    participant UI as XAML Page
    participant VM as ViewModel
    participant AC as ApiClient
    participant SS as SecureStorage vk_access_token vk_refresh_token
    participant API as AuthController

    Note over UI,API: LOGIN — ApiClient.LoginAsync
    UI->>VM: LoginCommand email password
    VM->>AC: LoginAsync(email, password)
    AC->>API: POST /auth/login JSON email password
    API-->>AC: 200 accessToken refreshToken
    AC->>SS: SetAsync vk_access_token value
    AC->>SS: SetAsync vk_refresh_token value
    AC->>AC: DefaultRequestHeaders.Authorization = Bearer accessToken
    AC-->>VM: (Ok:true, Error:null)
    VM->>VM: Navigate to MapPage

    Note over UI,API: RESTORE SESSION on next launch
    VM->>AC: RestoreSessionAsync()
    AC->>SS: GetAsync vk_access_token
    SS-->>AC: JWT string or null
    AC->>AC: Set DefaultRequestHeaders.Authorization if non-null

    Note over UI,API: REGISTER — ApiClient.RegisterAsync
    UI->>VM: RegisterCommand username email password fullName langId
    VM->>AC: RegisterAsync(username, email, password, fullName, preferredLanguageId)
    AC->>API: POST /auth/register username email password fullName preferredLanguageId
    API-->>AC: 200 accessToken refreshToken
    AC->>SS: PersistTokensAsync SetAsync both keys

    Note over UI,API: LOGOUT — ApiClient.LogoutAsync
    VM->>AC: LogoutAsync()
    AC->>SS: SecureStorage.Remove vk_access_token
    AC->>SS: SecureStorage.Remove vk_refresh_token
    AC->>AC: DefaultRequestHeaders.Authorization = null`
},

'vendor-scoping': {
title: 'Sequence: Vendor Data Scoping — Verified (vendor IDs fetched from DB not JWT)',
mermaid: `sequenceDiagram
    participant FE as Vendor Frontend
    participant CTRL as POIsController
    participant SVC as POIService
    participant DB as MySQL

    Note over FE,DB: Vendor GET /pois — scoped to VendorPOIs
    FE->>CTRL: GET /pois Bearer JWT role=Vendor
    CTRL->>CTRL: Authorize Roles Admin Vendor OK
    CTRL->>CTRL: Extract userId from JWT sub claim
    CTRL->>DB: SELECT VendorPOI IDs WHERE VendorUserId = userId
    Note over CTRL,DB: IDs fetched FRESH from DB not from JWT claim
    DB-->>CTRL: vendorPoiIds list
    CTRL->>SVC: GetAllAsync(page, size, search, vendorPoiIds=list)
    SVC->>DB: SELECT FROM POIs WHERE Id IN vendorPoiIds
    DB-->>SVC: POI rows
    SVC-->>CTRL: PagedResult
    CTRL-->>FE: 200 scoped list

    Note over FE,DB: Vendor PUT /pois/99 wrong POI — FORBIDDEN
    FE->>CTRL: PUT /pois/99 payload
    CTRL->>SVC: UpdateAsync(poiId=99, request, callerId=userId)
    SVC->>DB: SELECT FROM POIs WHERE Id=99
    DB-->>SVC: POI with VendorUserId=7
    Note over SVC: poi.VendorUserId != callerId -> FORBIDDEN
    SVC-->>CTRL: Result.Fail FORBIDDEN
    CTRL-->>FE: 403 Forbidden`
},

'geofence-flow': {
title: 'Sequence: Geofence State Machine — Verified GeofenceEngine.cs',
mermaid: `sequenceDiagram
    participant LOC as ILocationService GPS
    participant GEO as GeofenceEngine
    participant NAR as NarrationPlayer
    participant NOTIF as LocalNotificationService
    participant VQ as VisitQueueStore
    participant AC as ApiClient

    LOC->>GEO: LocationUpdated event (LocationUpdate lat lng)
    Note over GEO: OnLocationUpdated private method
    Note over GEO: foreach poi in _pois

    GEO->>GEO: HaversineMeters(lat,lng, poi.Lat, poi.Lng)
    GEO->>GEO: inRange = dist <= poi.GeofenceRadiusMeters

    alt inRange == true
        GEO->>GEO: _debounce[poi.Id]++
        alt debounce == DebounceCount(3) AND prev != Inside
            GEO->>GEO: _states[poi.Id] = Inside
            GEO->>GEO: check _cooldownUntil[poi.Id] vs DateTime.UtcNow
            alt now >= cooldown (not in cooldown)
                GEO->>GEO: newEntries.Add(poi)
            end
        end
    else inRange == false
        GEO->>GEO: _debounce[poi.Id] = 0
        alt prev == Inside
            GEO->>GEO: _states[poi.Id] = Outside
            GEO->>GEO: GeofenceExited event (if _activePoi.Id == poi.Id)
        end
    end

    Note over GEO: Priority resolution: pick highest Priority int
    GEO->>GEO: winner = newEntries.OrderByDescending Priority First
    GEO->>GEO: _activePoi = winner
    GEO->>GEO: GeofenceEntered event raised

    Note over GEO: MainViewModel subscribes to GeofenceEntered
    GEO-->>NAR: PlayAsync(audioUrl, narrationText, langCode, poiName)
    GEO-->>NOTIF: SendGeofenceNotificationAsync(poiName) if background
    GEO-->>VQ: Enqueue(poiId, langId, triggerType=geofence, narrationPlayed=true)

    Note over NAR: On PlaybackCompleted fires
    NAR-->>GEO: SetCooldown(poiId) 10 minutes
    NAR-->>VQ: UpdateListenDuration(poiId, durationSeconds)`
},

'narration-player': {
title: 'Sequence: NarrationPlayer Playback Logic — Verified NarrationPlayer.cs',
mermaid: `sequenceDiagram
    participant CALLER as GeofenceEngine or UI
    participant NAR as NarrationPlayer
    participant ME as MediaElement XAML
    participant TTS as TextToSpeech MAUI

    CALLER->>NAR: PlayAsync(audioUrl, ttsText, langCode, poiName)
    NAR->>NAR: Stop() cancel previous playback
    NAR->>NAR: _lastTtsText = ttsText _lastLangCode = langCode

    alt audioUrl is not null
        NAR->>NAR: PlayAudioAsync(url)
        NAR->>NAR: TryGetLocalFilePath(url)
        alt local file exists (file: URI or no scheme)
            NAR->>ME: Source = MediaSource.FromFile(localPath)
        else stream from server
            NAR->>NAR: NormalizeAudioStreamUrl add proxy=1
            NAR->>ME: Source = MediaSource.FromUri(url?proxy=1)
        end
        ME->>ME: Play()
        Note over ME: If MediaFailed fires
        ME-->>NAR: OnMediaFailed MediaFailedEventArgs
        NAR->>TTS: PlayTtsAsync(_lastTtsText, _lastLangCode) fallback
    else ttsText is not null
        NAR->>TTS: PlayTtsAsync(ttsText, langCode)
        TTS->>TTS: TextToSpeech.GetLocalesAsync
        TTS->>TTS: SpeakAsync(text, SpeechOptions locale volume pitch)
    end

    Note over ME,TTS: On completion
    ME-->>NAR: OnMediaStateChanged Stopped
    NAR-->>CALLER: PlaybackCompleted event`
},

'poi-lifecycle': {
title: 'Sequence: Admin Create POI + Generate TTS (AzureTTSService SDK)',
mermaid: `sequenceDiagram
    participant ADM as Admin Frontend
    participant CTRL as POIsController
    participant SVC as POIService
    participant DB as MySQL
    participant ASVC as AudioService
    participant TTS as AzureTTSService (Singleton)
    participant S3 as IFileStorageService

    ADM->>CTRL: POST /pois CreatePOIRequest
    Note over CTRL: Authorize Roles Admin
    CTRL->>SVC: CreateAsync(request)
    SVC->>DB: INSERT POIs lat lng geofenceRadius priority vendorUserId
    SVC->>DB: INSERT POITranslations per language name narrationText highlights JSON
    DB-->>SVC: poiId
    SVC-->>CTRL: ApiResponse.Ok(poiId)
    CTRL-->>ADM: 201 Created

    Note over ADM,S3: Admin triggers TTS
    ADM->>CTRL: POST /audio/poi/42/generate-tts languageId voiceName speed
    Note over CTRL: Authorize Roles Admin Vendor
    CTRL->>ASVC: GenerateTtsAsync(poiId=42, langId, voiceName, speed)
    ASVC->>DB: SELECT NarrationText FROM POITranslations WHERE POIId=42 AND LanguageId
    DB-->>ASVC: narrationText string
    ASVC->>TTS: GenerateAsync(text, language, voiceName, speed)
    Note over TTS: SpeechConfig.FromSubscription key southeastasia region
    Note over TTS: SetSpeechSynthesisOutputFormat Audio16Khz128KBitRateMonoMp3
    Note over TTS: SpeakSsmlAsync with prosody rate
    TTS-->>ASVC: TTSResult AudioData DurationSeconds
    ASVC->>S3: Save MP3 file poi-id-lang-id-uuid.mp3
    S3-->>ASVC: filePath
    ASVC->>DB: INSERT AudioNarrations FilePath DurationSeconds TTSGenerated=true IsDefault
    ASVC-->>CTRL: AudioNarrationDto
    CTRL-->>ADM: 200 OK`
},

'poi-nearby': {
title: 'Sequence: GET /pois/nearby — ST_Distance_Sphere (Backend) vs Haversine (Mobile Cache)',
mermaid: `sequenceDiagram
    participant APP as MAUI ApiClient
    participant CTRL as POIsController
    participant REPO as IPOIRepository (POIRepository)
    participant DB as MySQL 8
    participant CACHE as OfflineCacheStore SQLite

    Note over APP,DB: ONLINE — API spatial query
    APP->>CTRL: GET /pois/nearby?lat=10.7553&lng=106.7017&radiusMeters=2000&langId=1
    Note over CTRL: AllowAnonymous public endpoint
    Note over CTRL: param name is radiusMeters
    CTRL->>REPO: GetNearbyAsync(lat, lng, radiusMeters, langId)
    REPO->>DB: SELECT ST_Distance_Sphere POINT(lng,lat) POINT(poi.Lng,poi.Lat)
    Note over REPO,DB: POINT(longitude, latitude) order
    Note over DB: WHERE IsActive=1 AND distance <= radiusMeters ORDER BY distance ASC
    DB-->>REPO: rows with Distance
    REPO-->>CTRL: List NearbyPOIDto with audioUrl translations
    CTRL-->>APP: 200 ApiResponse List NearbyPOIDto
    APP->>APP: MapNearby audio = FirstOrDefault IsDefault
    Note over APP: audioUrl = baseUrl/audio/id/stream?proxy=1
    APP->>CACHE: UpsertFromOnlinePoisAsync(pois, langId)

    Note over APP,CACHE: OFFLINE — SQLite Haversine (NO SQL spatial)
    APP->>CACHE: GetNearbyPoisAsync(lat, lng, radiusMeters, languageId)
    CACHE->>CACHE: Query ALL rows WHERE LanguageId
    CACHE->>CACHE: GeofenceEngine.HaversineMeters per row in-memory
    CACHE->>CACHE: filter dist <= radiusMeters OrderBy dist
    CACHE-->>APP: List PoiLocal sorted nearest-first`
},

'audio-flow': {
title: 'Sequence: Audio Upload + Azure TTS SDK + Stream',
mermaid: `sequenceDiagram
    participant ADM as Admin/Vendor Frontend
    participant CTRL as AudioController
    participant SVC as AudioService
    participant TTS as AzureTTSService SDK
    participant STORE as IFileStorageService local or S3

    Note over ADM,STORE: UPLOAD MP3
    ADM->>CTRL: POST /audio/poi/3/upload multipart/form-data file langId
    CTRL->>SVC: StoreUploadedAsync(poiId, langId, fileStream)
    SVC->>STORE: SaveFileAsync stream
    STORE-->>SVC: filePath url
    SVC->>SVC: INSERT AudioNarrations TTSGenerated=false
    SVC-->>CTRL: AudioNarrationDto
    CTRL-->>ADM: 200 OK

    Note over ADM,STORE: GENERATE TTS (Azure SDK)
    ADM->>CTRL: POST /audio/poi/3/generate-tts languageId voiceName speed
    CTRL->>SVC: GenerateTtsAsync(poiId, langId, voiceName, speed)
    SVC->>SVC: SELECT NarrationText FROM POITranslations
    SVC->>TTS: GenerateAsync(text, language, voiceName, speed)
    TTS->>TTS: SpeechConfig.FromSubscription key region
    TTS->>TTS: SpeakSsmlAsync prosody rate SSML
    TTS-->>SVC: TTSResult AudioData DurationSeconds ContentType=audio/mpeg
    SVC->>STORE: SaveFileAsync(audioData stream)
    STORE-->>SVC: filePath
    SVC->>SVC: INSERT AudioNarrations TTSGenerated=true DurationSeconds
    CTRL-->>ADM: 200 OK audioUrl durationSeconds

    Note over ADM,STORE: STREAM (Anonymous mobile)
    ADM->>CTRL: GET /audio/42/stream?proxy=1
    Note over CTRL: AllowAnonymous endpoint
    CTRL->>SVC: GetStreamAsync(audioId)
    SVC->>STORE: OpenReadAsync(filePath)
    STORE-->>SVC: Stream
    CTRL-->>ADM: FileStreamResult audio/mpeg supports Range`
},

'sync-flow': {
title: 'Sequence: Sync — Delta + Visit Upload (OfflinePackageSyncService + VisitQueueStore)',
mermaid: `sequenceDiagram
    participant APP as MAUI App
    participant OPS as OfflinePackageSyncService
    participant AC as ApiClient
    participant CACHE as OfflineCacheStore SQLite
    participant VQ as VisitQueueStore (Preferences backup)
    participant PREF as MAUI Preferences

    Note over APP,PREF: DELTA SYNC — SyncDeltaAsync
    APP->>OPS: SyncDeltaAsync(langId, ct)
    OPS->>PREF: GetLastSyncTime from key last_sync_time
    PREF-->>OPS: DateTime or null (default: 30 days ago)
    OPS->>AC: GetDeltaAsync(since ISO-8601, langId, ct)
    AC->>AC: GET /sync/delta?since=sinceEncoded&langId=langId
    AC-->>OPS: DeltaSyncResponse Pois list or null
    OPS->>CACHE: UpsertFromOnlinePoisAsync(poisLocal, langId)
    OPS->>PREF: Set last_sync_time = DateTime.UtcNow.ToString(o)
    OPS-->>APP: (Ok:true, Error:null)

    Note over APP,PREF: OFFLINE PACKAGE INSTALL
    APP->>AC: GetOfflineCatalogAsync
    AC->>AC: GET /offlinepackages/catalog
    AC-->>APP: List OfflinePackageCatalogItemDto
    APP->>OPS: DownloadAndInstallAsync(packageId, checksum, langId, progress, ct)
    OPS->>AC: DownloadOfflinePackageToFileAsync(packageId, zipPath, progress, ct)
    Note over AC: GET /offlinepackages/id/download streaming with IProgress
    AC-->>OPS: (Ok:true)
    OPS->>OPS: ZipFile.ExtractToDirectory to offline/pkg_id/
    OPS->>OPS: Deserialize manifest.json OfflineManifestV1
    OPS->>CACHE: ImportFromManifestAsync(manifest, root, packageId)
    OPS->>PREF: Set vk_offline_package_id vk_offline_package_checksum

    Note over APP,PREF: VISIT UPLOAD — VisitQueueStore
    APP->>VQ: Enqueue(poiId, langId, triggerType, narrationPlayed, lat, lng)
    Note over VQ: in-memory _pending + PersistToPreferences backup vk_pending_visits
    APP->>VQ: Dequeue() snapshot and clear
    VQ-->>APP: List VisitEntry snapshot
    APP->>AC: UploadVisitsAsync(visits)
    AC->>AC: POST /sync/visits JSON payload
    AC-->>APP: (Ok:true, acceptedCount)
    Note over APP: On fail: VQ.RestoreToQueue(entries) put back`
},

/* ══════════════════════════════════════════
   ACTIVITY DIAGRAMS — verified
══════════════════════════════════════════ */
'activity-geofence': {
title: 'Activity: GPS Geofence State Machine — GeofenceEngine.cs Verified',
mermaid: `flowchart TD
    START([LocationUpdated event fires]) --> FOREACH[foreach poi in _pois]
    FOREACH --> DIST[HaversineMeters user lat/lng vs poi lat/lng]
    DIST --> INRANGE{dist less than or equal\npoi.GeofenceRadiusMeters?}

    INRANGE -->|No out of range| DEBOUNCE0[_debounce poiId = 0]
    DEBOUNCE0 --> WASINSIDE{prev state == Inside?}
    WASINSIDE -->|Yes| OUTSIDE[_states = Outside\nfire GeofenceExited if _activePoi]
    WASINSIDE -->|No Unknown or Outside| NEXTP[next POI]
    OUTSIDE --> NEXTP

    INRANGE -->|Yes in range| DEBINC[_debounce poiId plus plus]
    DEBINC --> DEBCHECK{debounce equals\nDebounceCount 3\nAND prev != Inside?}
    DEBCHECK -->|No| NEXTP
    DEBCHECK -->|Yes trigger candidate| SETINSIDE[_states poiId = Inside]
    SETINSIDE --> COOLCHECK{DateTime.UtcNow\ngreater than or equal _cooldownUntil?}
    COOLCHECK -->|In cooldown| NEXTP
    COOLCHECK -->|Not in cooldown| ADDENTRY[newEntries.Add poi]
    ADDENTRY --> NEXTP

    NEXTP --> MORE{more POIs?}
    MORE -->|Yes| FOREACH
    MORE -->|No| ANYENTRY{newEntries.Count > 0?}
    ANYENTRY -->|No| DONE([Done])
    ANYENTRY -->|Yes| PRIORITY[winner = OrderByDescending Priority First]
    PRIORITY --> SETACTIVE[_activePoi = winner]
    SETACTIVE --> FIRE[GeofenceEntered event raised]
    FIRE --> NARPLAY[NarrationPlayer.PlayAsync]
    NARPLAY --> NOTIFY[LocalNotificationService.SendGeofenceNotificationAsync if background]
    NOTIFY --> VISITQ[VisitQueueStore.Enqueue triggerType=geofence]
    VISITQ --> WAIT([Wait for PlaybackCompleted])
    WAIT --> COOLSET[GeofenceEngine.SetCooldown poiId\n_cooldownUntil = now plus 10min]
    COOLSET --> VQDUR[VisitQueueStore.UpdateListenDuration]
    VQDUR --> DONE`
},

'activity-login': {
title: 'Activity: Mobile Login + Token Persistence (ApiClient.cs verified)',
mermaid: `flowchart TD
    START([User taps Login]) --> CALL[ApiClient.LoginAsync email password]
    CALL --> POST[POST /auth/login]
    POST --> RESP{API Response}
    RESP -->|400 VALIDATION_ERROR| ERR1[Show field errors]
    ERR1 --> START
    RESP -->|401 INVALID_CREDENTIALS| ERR2[Show: Email hoac mat khau khong dung]
    ERR2 --> START
    RESP -->|403 ACCOUNT_DISABLED| ERR3[Show: Tai khoan bi vo hieu hoa]
    ERR3 --> DONE([Exit])
    RESP -->|Network error| ERR4[Show: No connection - check ex.Message]
    ERR4 --> START
    RESP -->|200 OK LoginResponse| PERSIST[PersistTokensAsync\nSecureStorage.SetAsync vk_access_token\nSecureStorage.SetAsync vk_refresh_token\nSet Authorization header]
    PERSIST --> NAV[Navigate to MapPage]

    STARTR([User taps Register]) --> REGCALL[ApiClient.RegisterAsync\nusername email password fullName preferredLanguageId]
    REGCALL --> POST2[POST /auth/register]
    POST2 --> RESP2{API Response}
    RESP2 -->|DUPLICATE_EMAIL| DUPERR[Show: Email da duoc dang ky]
    RESP2 -->|VALIDATION_ERROR| VALERR[Show validation message]
    RESP2 -->|200 OK| PERSIST`
},

'activity-tts': {
title: 'Activity: Generate Azure TTS (AzureTTSService.cs SDK verified)',
mermaid: `flowchart TD
    START([Admin clicks Generate TTS for POI Language]) --> FETCH[AudioService.GenerateTtsAsync\nSELECT NarrationText FROM POITranslations]
    FETCH --> HAS{NarrationText exists?}
    HAS -->|No| ERR1[Error: Fill NarrationText first]
    HAS -->|Yes| CONF[AzureTTSService.GenerateAsync\nSpeechConfig.FromSubscription\nSubscriptionKey Region southeastasia]
    CONF --> FORMAT[SetSpeechSynthesisOutputFormat\nAudio16Khz128KBitRateMonoMp3]
    FORMAT --> SSML[Build SSML with prosody rate\nspeed 1.0 = plus0 pct]
    SSML --> SYNTH[SpeechSynthesizer SpeakSsmlAsync]
    SYNTH --> AZRESP{Azure response?}
    AZRESP -->|ResultReason.Canceled| ERR2[throw InvalidOperationException\nTTS generation failed]
    AZRESP -->|OK AudioData| STORE{IFileStorageService\nProvider?}
    STORE -->|local| LOCAL[Save to wwwroot/audio/\nLocalFileStorageService]
    STORE -->|s3| S3PUT[S3FileStorageService\nPutObject to S3BucketName]
    LOCAL & S3PUT --> DBINS[INSERT AudioNarrations\nFilePath DurationSeconds\nTTSGenerated=true IsDefault=true if first]
    DBINS --> DONE([200 OK TTSResult AudioData DurationSeconds ContentType audio/mpeg])`
},

/* ══════════════════════════════════════════
   USE CASE — verified correct actor boundaries
══════════════════════════════════════════ */
'usecase-all': {
title: 'Use Case Overview — 3 Actors (Admin / Vendor / Customer)',
mermaid: `graph LR
    CUST(["📱 Customer\nMobile App"])
    VEND(["🏪 Vendor\nWeb Panel"])
    ADMI(["🛡️ Admin\nWeb Panel"])

    subgraph PUB["Anonymous / Public Mobile"]
        UC1["View POI on Map\nGET /pois/nearby\nST_Distance_Sphere"]
        UC2["Hear Audio Narration\nGeofence 3-reading debounce\nPriority resolution"]
        UC3["View POI Detail\nGET /pois/id/public langId"]
        UC4["Download Offline Package\nGET /offlinepackages/catalog\nGET /offlinepackages/id/download"]
        UC5["Select Language\nGET /languages"]
        UC6["Stream Audio\nGET /audio/id/stream?proxy=1"]
    end

    subgraph AUTH["Authenticated Customer"]
        UC7["Register\nPOST /auth/register\nauto-login on success"]
        UC8["Login Logout\nSecureStorage tokens"]
        UC9["Update Profile\nPUT /auth/profile"]
        UC10["Forgot + Reset Password\n/auth/forgot-password\n/auth/reset-password"]
        UC11["Upload Visit Batch\nVisitQueueStore Enqueue\nPOST /sync/visits"]
        UC12["Delta Sync POI\nGET /sync/delta since ISO"]
    end

    subgraph VEND_UC["Vendor — VendorPOIs scoped by DB"]
        UC13["View Own POI\nGET /pois vendorPoiIds from DB"]
        UC14["Edit Own POI\nPUT /pois/id ownership check"]
        UC15["Upload Audio MP3\nPOST /audio/poi/id/upload"]
        UC16["Generate Azure TTS\nSDS SpeakSsmlAsync"]
        UC17["Manage Menu Items"]
        UC18["View Own Analytics\nDashboard vendorPoiIds scoped"]
        UC19["Change Password"]
    end

    subgraph ADMIN_UC["Admin — Full System"]
        UC20["CRUD All POIs\nCreate Update Delete Toggle"]
        UC21["Manage Users\nCreate Toggle ResetPassword"]
        UC22["Manage Categories\nTranslations per language"]
        UC23["View All Analytics\nAll dashboard endpoints"]
        UC24["Build Offline Packages\nPOST /offlinepackages/id/build"]
        UC25["System Settings\nmaintenance mode api-key"]
    end

    CUST --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
    CUST --> UC7 & UC8 & UC9 & UC10 & UC11 & UC12
    VEND --> UC13 & UC14 & UC15 & UC16 & UC17 & UC18 & UC19
    ADMI --> UC20 & UC21 & UC22 & UC23 & UC24 & UC25
    ADMI --> UC13 & UC14 & UC15 & UC16`
},

'usecase-customer': {
title: 'Use Case: Customer — include/extend (verified ApiClient.cs)',
mermaid: `flowchart TD
    A(["📱 Customer"])

    UC1["Hear Audio Narration"]
    I1a["INCLUDE: GeofenceEngine 3-reading debounce"]
    I1b["INCLUDE: Priority resolution highest int wins"]
    I1c["INCLUDE: NarrationPlayer.PlayAsync"]
    E1a["EXTEND: TryGetLocalFilePath (if local file)"]
    E1b["EXTEND: MediaFailed fallback to TTS"]
    E1c["EXTEND: SendGeofenceNotificationAsync (if background)"]

    UC2["View POI on Map"]
    I2a["INCLUDE: GET /pois/nearby radiusMeters langId"]
    I2b["INCLUDE: OfflineCacheStore Haversine fallback"]
    E2a["EXTEND: View Detail GET /pois/id/public tap pin"]

    UC3["Download Offline Package"]
    I3a["INCLUDE: GetOfflineCatalogAsync"]
    I3b["INCLUDE: DownloadAndInstallAsync unzip manifest.json"]
    E3a["EXTEND: CheckForUpdateAsync compare checksum"]

    UC4["Upload Visits"]
    I4a["INCLUDE: VisitQueueStore.Enqueue Dequeue"]
    I4b["INCLUDE: ApiClient.UploadVisitsAsync batch"]
    E4a["EXTEND: RestoreToQueue on upload fail"]
    E4b["EXTEND: UpdateListenDuration on PlaybackCompleted"]

    A --> UC1 & UC2 & UC3 & UC4
    UC1 -.->|include| I1a & I1b & I1c
    UC1 -.->|extend| E1a & E1b & E1c
    UC2 -.->|include| I2a & I2b
    UC2 -.->|extend| E2a
    UC3 -.->|include| I3a & I3b
    UC3 -.->|extend| E3a
    UC4 -.->|include| I4a & I4b
    UC4 -.->|extend| E4a & E4b

    style UC1 fill:#1e3a5f,color:#f1f5f9,stroke:#0ea5e9
    style UC2 fill:#1e3a5f,color:#f1f5f9,stroke:#0ea5e9
    style UC3 fill:#1e3a5f,color:#f1f5f9,stroke:#0ea5e9
    style UC4 fill:#1e3a5f,color:#f1f5f9,stroke:#0ea5e9`
},

'usecase-vendor': {
title: 'Use Case: Vendor — include/extend (vendorPOIs fetched from DB)',
mermaid: `flowchart TD
    V(["🏪 Vendor"])

    UC1["View and Edit Own POI"]
    I1a["INCLUDE: POIsController extract userId from JWT sub"]
    I1b["INCLUDE: SELECT VendorPOI IDs from DB fresh"]
    I1c["INCLUDE: PUT ownership check poi.VendorUserId == callerId"]
    E1a["EXTEND: Upload Translation per language"]
    E1b["EXTEND: Toggle IsActive PATCH /pois/id/toggle"]

    UC2["Manage Audio"]
    I2a["INCLUDE: GET /audio/poi/id list"]
    I2b["INCLUDE: POST /audio/poi/id/upload multipart"]
    E2a["EXTEND: Generate TTS AzureTTSService SpeakSsmlAsync"]
    E2b["EXTEND: PATCH /audio/id/set-default"]

    UC3["Manage Menu Items"]
    I3a["INCLUDE: GET /menu/poi/id list"]
    I3b["INCLUDE: POST PUT DELETE /menu items"]
    E3a["EXTEND: Toggle IsAvailable IsSignature"]

    UC4["View Own Analytics"]
    I4a["INCLUDE: GET /dashboard/stats vendorPoiIds scoped DB fresh"]
    I4b["INCLUDE: GET /analytics/trends"]
    E4a["EXTEND: Visits by Day Hour charts"]

    V --> UC1 & UC2 & UC3 & UC4
    UC1 -.->|include| I1a & I1b & I1c
    UC1 -.->|extend| E1a & E1b
    UC2 -.->|include| I2a & I2b
    UC2 -.->|extend| E2a & E2b
    UC3 -.->|include| I3a & I3b
    UC3 -.->|extend| E3a
    UC4 -.->|include| I4a & I4b
    UC4 -.->|extend| E4a

    style UC1 fill:#0f4c3a,color:#f1f5f9,stroke:#14b8a6
    style UC2 fill:#0f4c3a,color:#f1f5f9,stroke:#14b8a6
    style UC3 fill:#0f4c3a,color:#f1f5f9,stroke:#14b8a6
    style UC4 fill:#0f4c3a,color:#f1f5f9,stroke:#14b8a6`
},

'usecase-admin': {
title: 'Use Case: Admin — include/extend (Program.cs services verified)',
mermaid: `flowchart TD
    AD(["🛡️ Admin"])

    UC1["Manage All POIs"]
    I1a["INCLUDE: POIService.CreateAsync with translations all languages"]
    I1b["INCLUDE: Assign VendorUserId per POI for scoping"]
    E1a["EXTEND: Toggle IsFeatured PATCH /pois/id/featured"]
    E1b["EXTEND: Delete cascades translations audio menu"]

    UC2["Manage Users"]
    I2a["INCLUDE: UserService.CreateAsync role Admin or Vendor"]
    I2b["INCLUDE: ToggleActive PATCH /users/id/toggle"]
    E2a["EXTEND: ResetPassword POST /users/id/reset-password"]
    E2b["EXTEND: Assign VendorPOIs on Vendor creation"]

    UC3["Build Offline Packages"]
    I3a["INCLUDE: OfflinePackageService.CreateAsync definition"]
    I3b["INCLUDE: POST /offlinepackages/id/build trigger async"]
    E3a["EXTEND: GET /offlinepackages/id/status polling"]
    E3b["EXTEND: Customer DownloadAndInstallAsync ZIP"]

    UC4["System Administration"]
    I4a["INCLUDE: SettingsService GET PUT /settings"]
    I4b["INCLUDE: MaintenanceMiddleware toggle from settings"]
    E4a["EXTEND: Generate new API key POST /settings/generate-api-key"]
    E4b["EXTEND: Email: SesEmailSender reset password emails"]

    AD --> UC1 & UC2 & UC3 & UC4
    UC1 -.->|include| I1a & I1b
    UC1 -.->|extend| E1a & E1b
    UC2 -.->|include| I2a & I2b
    UC2 -.->|extend| E2a & E2b
    UC3 -.->|include| I3a & I3b
    UC3 -.->|extend| E3a & E3b
    UC4 -.->|include| I4a & I4b
    UC4 -.->|extend| E4a & E4b

    style UC1 fill:#2d1b69,color:#f1f5f9,stroke:#6366f1
    style UC2 fill:#2d1b69,color:#f1f5f9,stroke:#6366f1
    style UC3 fill:#2d1b69,color:#f1f5f9,stroke:#6366f1
    style UC4 fill:#2d1b69,color:#f1f5f9,stroke:#6366f1`
},

/* ══════════════════════════════════════════
   DATABASE ER — verified from Entities.cs naming
══════════════════════════════════════════ */
'db-schema': {
title: 'ER Diagram — MySQL 8 Core Tables (domain verified)',
mermaid: `erDiagram
    Users {
        int Id PK
        string Username
        string Email
        string PasswordHash
        string FullName
        string Role
        string Phone
        string AvatarUrl
        bool IsActive
        bool EmailConfirmed
        int PreferredLanguageId
        string RefreshToken
        datetime RefreshTokenExpiry
        string PasswordResetTokenHash
        datetime PasswordResetExpiry
        datetime LastLoginAt
    }
    POIs {
        int Id PK
        int CategoryId FK
        int VendorUserId FK
        double Latitude
        double Longitude
        int GeofenceRadius
        int Priority
        string Address
        string Phone
        decimal PriceRangeMin
        decimal PriceRangeMax
        string OpeningHours
        bool IsActive
        bool IsFeatured
        int TotalVisits
    }
    POITranslations {
        int Id PK
        int POIId FK
        int LanguageId FK
        string Name
        string ShortDescription
        string FullDescription
        string NarrationText
        string Highlights
    }
    AudioNarrations {
        int Id PK
        int POIId FK
        int LanguageId FK
        string FilePath
        int DurationSeconds
        bool IsDefault
        bool IsActive
        bool TTSGenerated
    }
    VisitHistory {
        int Id PK
        int POIId FK
        int UserId FK
        int LanguageId FK
        string TriggerType
        bool NarrationPlayed
        int ListenDuration
        double Latitude
        double Longitude
        datetime VisitedAt
    }
    Categories {
        int Id PK
        string Icon
        string Color
        bool IsActive
    }
    Languages {
        int Id PK
        string Code
        string NativeName
        string FlagEmoji
        bool IsActive
    }
    MenuItems {
        int Id PK
        int POIId FK
        string Name
        decimal Price
        bool IsSignature
        bool IsAvailable
    }
    OfflinePackages {
        int Id PK
        string Name
        int LanguageId FK
        string Status
        string FilePath
        string ContentChecksum
        string Version
        datetime BuildAt
    }

    Users }o--o{ POIs : "Vendor owns"
    POIs ||--o{ POITranslations : "has"
    POIs ||--o{ AudioNarrations : "has"
    POIs ||--o{ VisitHistory : "visited"
    POIs ||--o{ MenuItems : "has"
    Users ||--o{ VisitHistory : "generates"
    Categories ||--o{ POIs : "classifies"
    Languages ||--o{ POITranslations : "used by"
    Languages ||--o{ AudioNarrations : "for"
    Languages ||--o{ OfflinePackages : "for"`
},

'routing': {
title: 'Frontend Routing — React Router v7 (Admin + Vendor shared panel)',
mermaid: `graph TB
    URL["Browser URL /"]
    LOGIN["LoginPage\nGuestRoute\nauto-redirect if localStorage token exists"]
    PROT["ProtectedRoute\ncheck localStorage accessToken"]
    DASH["DashboardRoute\nuseCurrentUser decode JWT\nisAdmin isVendor flags"]

    subgraph AdminOnly["Admin-only routes adminOnly:true sidebar"]
        AD1["Dashboard\nGET /dashboard/stats + /visits-chart"]
        AD2["User Management\nPOST /users reset-password toggle"]
        AD3["System Settings\n/settings maintenance api-key"]
        AD4["Offline Packages\n/offlinepackages build status"]
        AD5["Categories\nGET POST PUT DELETE /categories"]
    end

    subgraph Shared["Admin + Vendor routes"]
        SH1["POI Management\nAdmin: all / Vendor: vendorPoiIds scoped"]
        SH2["Audio Management\nupload mp3 generate TTS set-default"]
        SH3["Analytics\n/analytics/trends visits-by-day language-distribution"]
        SH4["Change Password\n/auth/change-password"]
    end

    URL -->|/login| LOGIN
    URL -->|any other| PROT
    PROT -->|no token| LOGIN
    PROT --> DASH
    DASH -->|isAdmin| AD1 & AD2 & AD3 & AD4 & AD5
    DASH --> SH1 & SH2 & SH3 & SH4

    style AD1 fill:#0f766e,color:#fff
    style AD2 fill:#0f766e,color:#fff
    style AD3 fill:#0f766e,color:#fff
    style AD4 fill:#0f766e,color:#fff
    style AD5 fill:#0f766e,color:#fff`
}

}}; // end DIAGRAM_DATA

/* ============================================================
   Endpoint Sequences (73) - generated from Controllers.cs
   ============================================================ */
(function registerEndpointSequences() {
  if (!window.DIAGRAM_DATA || !window.DIAGRAM_DATA.diagrams) return;

  const endpointDefs = [
    // Auth (8)
    ["auth", "ep-auth-login", "POST", "/api/v1/auth/login", "AuthController", "IAuthService", "LoginAsync"],
    ["auth", "ep-auth-refresh", "POST", "/api/v1/auth/refresh", "AuthController", "IAuthService", "RefreshTokenAsync"],
    ["auth", "ep-auth-change-password", "POST", "/api/v1/auth/change-password", "AuthController", "IAuthService", "ChangePasswordAsync"],
    ["auth", "ep-auth-me", "GET", "/api/v1/auth/me", "AuthController", "IAuthService", "GetCurrentUserAsync"],
    ["auth", "ep-auth-register", "POST", "/api/v1/auth/register", "AuthController", "IAuthService", "RegisterAsync"],
    ["auth", "ep-auth-forgot-password", "POST", "/api/v1/auth/forgot-password", "AuthController", "IAuthService", "ForgotPasswordAsync"],
    ["auth", "ep-auth-reset-password", "POST", "/api/v1/auth/reset-password", "AuthController", "IAuthService", "ResetPasswordAsync"],
    ["auth", "ep-auth-profile", "PUT", "/api/v1/auth/profile", "AuthController", "IAuthService", "UpdateProfileAsync"],

    // POIs (10)
    ["pois", "ep-pois-list", "GET", "/api/v1/pois", "POIsController", "IPOIService", "GetListAsync"],
    ["pois", "ep-pois-detail", "GET", "/api/v1/pois/{id}", "POIsController", "IPOIService", "GetDetailAsync"],
    ["pois", "ep-pois-create", "POST", "/api/v1/pois", "POIsController", "IPOIService", "CreateAsync"],
    ["pois", "ep-pois-update", "PUT", "/api/v1/pois/{id}", "POIsController", "IPOIService", "UpdateAsync"],
    ["pois", "ep-pois-delete", "DELETE", "/api/v1/pois/{id}", "POIsController", "IPOIService", "DeleteAsync"],
    ["pois", "ep-pois-toggle", "PATCH", "/api/v1/pois/{id}/toggle", "POIsController", "IPOIService", "ToggleActiveAsync"],
    ["pois", "ep-pois-featured", "PATCH", "/api/v1/pois/{id}/featured", "POIsController", "IPOIService", "ToggleFeaturedAsync"],
    ["pois", "ep-pois-nearby", "GET", "/api/v1/pois/nearby", "POIsController", "IPOIService", "GetNearbyAsync"],
    ["pois", "ep-pois-public", "GET", "/api/v1/pois/{id}/public", "POIsController", "IPOIService", "GetPublicDetailAsync"],
    ["pois", "ep-pois-audio-queue", "GET", "/api/v1/pois/audio-queue", "POIsController", "IPOIService", "GetAudioQueueAsync"],

    // Languages (1)
    ["languages", "ep-languages-get-all", "GET", "/api/v1/languages", "LanguagesController", "ILanguageService", "GetAllActiveAsync"],

    // Categories (6)
    ["categories", "ep-categories-list", "GET", "/api/v1/categories", "CategoriesController", "ICategoryService", "GetAllAsync"],
    ["categories", "ep-categories-detail", "GET", "/api/v1/categories/{id}", "CategoriesController", "ICategoryService", "GetByIdAsync"],
    ["categories", "ep-categories-create", "POST", "/api/v1/categories", "CategoriesController", "ICategoryService", "CreateAsync"],
    ["categories", "ep-categories-update", "PUT", "/api/v1/categories/{id}", "CategoriesController", "ICategoryService", "UpdateAsync"],
    ["categories", "ep-categories-delete", "DELETE", "/api/v1/categories/{id}", "CategoriesController", "ICategoryService", "DeleteAsync"],
    ["categories", "ep-categories-toggle", "PATCH", "/api/v1/categories/{id}/toggle", "CategoriesController", "ICategoryService", "ToggleActiveAsync"],

    // Audio (7)
    ["audio", "ep-audio-by-poi", "GET", "/api/v1/audio/poi/{poiId}", "AudioController", "IAudioService", "GetByPOIAsync"],
    ["audio", "ep-audio-upload", "POST", "/api/v1/audio/poi/{poiId}/upload", "AudioController", "IAudioService", "UploadAsync"],
    ["audio", "ep-audio-generate-tts", "POST", "/api/v1/audio/poi/{poiId}/generate-tts", "AudioController", "IAudioService", "GenerateTTSAsync"],
    ["audio", "ep-audio-stream", "GET", "/api/v1/audio/{id}/stream", "AudioController", "IAudioService", "GetStreamAsync or GetFileKeyAsync"],
    ["audio", "ep-audio-qr", "GET", "/api/v1/audio/{id}/qr", "AudioController", "IAudioQrService", "GetAudioQrPngAsync"],
    ["audio", "ep-audio-delete", "DELETE", "/api/v1/audio/{id}", "AudioController", "IAudioService", "DeleteAsync"],
    ["audio", "ep-audio-set-default", "PATCH", "/api/v1/audio/{id}/set-default", "AudioController", "IAudioService", "SetDefaultAsync"],

    // Media (5)
    ["media", "ep-media-by-poi", "GET", "/api/v1/media/poi/{poiId}", "MediaController", "IMediaService", "GetByPOIAsync"],
    ["media", "ep-media-upload", "POST", "/api/v1/media/poi/{poiId}/upload", "MediaController", "IMediaService", "UploadAsync"],
    ["media", "ep-media-delete", "DELETE", "/api/v1/media/{id}", "MediaController", "IMediaService", "DeleteAsync"],
    ["media", "ep-media-set-primary", "PATCH", "/api/v1/media/{id}/set-primary", "MediaController", "IMediaService", "SetPrimaryAsync"],
    ["media", "ep-media-reorder", "PUT", "/api/v1/media/poi/{poiId}/reorder", "MediaController", "IMediaService", "ReorderAsync"],

    // Menu (7)
    ["menu", "ep-menu-by-poi", "GET", "/api/v1/menu/poi/{poiId}", "MenuController", "IMenuService", "GetByPOIAsync"],
    ["menu", "ep-menu-create", "POST", "/api/v1/menu/poi/{poiId}", "MenuController", "IMenuService", "CreateAsync"],
    ["menu", "ep-menu-update", "PUT", "/api/v1/menu/{id}", "MenuController", "IMenuService", "UpdateAsync"],
    ["menu", "ep-menu-delete", "DELETE", "/api/v1/menu/{id}", "MenuController", "IMenuService", "DeleteAsync"],
    ["menu", "ep-menu-toggle-available", "PATCH", "/api/v1/menu/{id}/toggle-available", "MenuController", "IMenuService", "ToggleAvailableAsync"],
    ["menu", "ep-menu-toggle-signature", "PATCH", "/api/v1/menu/{id}/toggle-signature", "MenuController", "IMenuService", "ToggleSignatureAsync"],
    ["menu", "ep-menu-upload-image", "POST", "/api/v1/menu/{id}/upload-image", "MenuController", "IMenuService", "UploadImageAsync"],

    // Users (7)
    ["users", "ep-users-list", "GET", "/api/v1/users", "UsersController", "IUserService", "GetListAsync"],
    ["users", "ep-users-detail", "GET", "/api/v1/users/{id}", "UsersController", "IUserService", "GetByIdAsync"],
    ["users", "ep-users-create", "POST", "/api/v1/users", "UsersController", "IUserService", "CreateAsync"],
    ["users", "ep-users-update", "PUT", "/api/v1/users/{id}", "UsersController", "IUserService", "UpdateAsync"],
    ["users", "ep-users-delete", "DELETE", "/api/v1/users/{id}", "UsersController", "IUserService", "DeleteAsync"],
    ["users", "ep-users-toggle", "PATCH", "/api/v1/users/{id}/toggle", "UsersController", "IUserService", "ToggleActiveAsync"],
    ["users", "ep-users-reset-password", "POST", "/api/v1/users/{id}/reset-password", "UsersController", "IUserService", "ResetPasswordAsync"],

    // Dashboard (5)
    ["dashboard", "ep-dashboard-stats", "GET", "/api/v1/dashboard/stats", "DashboardController", "IDashboardService", "GetStatsAsync"],
    ["dashboard", "ep-dashboard-top-pois", "GET", "/api/v1/dashboard/top-pois", "DashboardController", "IDashboardService", "GetTopPOIsAsync"],
    ["dashboard", "ep-dashboard-visits-chart", "GET", "/api/v1/dashboard/visits-chart", "DashboardController", "IDashboardService", "GetVisitsChartAsync"],
    ["dashboard", "ep-dashboard-language-stats", "GET", "/api/v1/dashboard/language-stats", "DashboardController", "IDashboardService", "GetLanguageStatsAsync"],
    ["dashboard", "ep-dashboard-recent-activity", "GET", "/api/v1/dashboard/recent-activity", "DashboardController", "IDashboardService", "GetRecentActivityAsync"],

    // Analytics (4)
    ["analytics", "ep-analytics-trends", "GET", "/api/v1/analytics/trends", "AnalyticsController", "IAnalyticsService", "GetTrendsAsync"],
    ["analytics", "ep-analytics-visits-by-day", "GET", "/api/v1/analytics/visits-by-day", "AnalyticsController", "IAnalyticsService", "GetVisitsByDayAsync"],
    ["analytics", "ep-analytics-visits-by-hour", "GET", "/api/v1/analytics/visits-by-hour", "AnalyticsController", "IAnalyticsService", "GetVisitsByHourAsync"],
    ["analytics", "ep-analytics-language-distribution", "GET", "/api/v1/analytics/language-distribution", "AnalyticsController", "IAnalyticsService", "GetLanguageDistributionAsync"],

    // Offline Packages (7)
    ["offlinepackages", "ep-offline-catalog", "GET", "/api/v1/offlinepackages/catalog", "OfflinePackagesController", "IOfflinePackageService", "GetPublicCatalogAsync"],
    ["offlinepackages", "ep-offline-list", "GET", "/api/v1/offlinepackages", "OfflinePackagesController", "IOfflinePackageService", "GetAllAsync"],
    ["offlinepackages", "ep-offline-create", "POST", "/api/v1/offlinepackages", "OfflinePackagesController", "IOfflinePackageService", "CreateAsync"],
    ["offlinepackages", "ep-offline-build", "POST", "/api/v1/offlinepackages/{id}/build", "OfflinePackagesController", "IOfflinePackageService", "BuildAsync"],
    ["offlinepackages", "ep-offline-status", "GET", "/api/v1/offlinepackages/{id}/status", "OfflinePackagesController", "IOfflinePackageService", "GetStatusAsync"],
    ["offlinepackages", "ep-offline-download", "GET", "/api/v1/offlinepackages/{id}/download", "OfflinePackagesController", "IOfflinePackageService", "GetStatusAsync then DownloadAsync"],
    ["offlinepackages", "ep-offline-delete", "DELETE", "/api/v1/offlinepackages/{id}", "OfflinePackagesController", "IOfflinePackageService", "DeleteAsync"],

    // Settings (4)
    ["settings", "ep-settings-get-all", "GET", "/api/v1/settings", "SettingsController", "ISettingsService", "GetAllAsync"],
    ["settings", "ep-settings-update", "PUT", "/api/v1/settings", "SettingsController", "ISettingsService", "UpdateAsync"],
    ["settings", "ep-settings-maintenance", "PUT", "/api/v1/settings/maintenance", "SettingsController", "ISettingsService", "SetMaintenanceModeAsync"],
    ["settings", "ep-settings-generate-api-key", "POST", "/api/v1/settings/generate-api-key", "SettingsController", "ISettingsService", "GenerateApiKeyAsync"],

    // Sync (2)
    ["sync", "ep-sync-delta", "GET", "/api/v1/sync/delta", "SyncController", "ISyncService", "GetDeltaAsync"],
    ["sync", "ep-sync-visits", "POST", "/api/v1/sync/visits", "SyncController", "ISyncService", "UploadVisitsAsync"]
  ];

  const groupLabels = {
    auth: "Auth",
    pois: "POIs",
    languages: "Languages",
    categories: "Categories",
    audio: "Audio",
    media: "Media",
    menu: "Menu",
    users: "Users",
    dashboard: "Dashboard",
    analytics: "Analytics",
    offlinepackages: "OfflinePackages",
    settings: "Settings",
    sync: "Sync"
  };

  const allowAnonymousRoutes = new Set([
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/pois/nearby",
    "/api/v1/pois/{id}/public",
    "/api/v1/pois/audio-queue",
    "/api/v1/languages",
    "/api/v1/categories",
    "/api/v1/audio/{id}/stream",
    "/api/v1/audio/{id}/qr",
    "/api/v1/offlinepackages/catalog",
    "/api/v1/offlinepackages/{id}/download"
  ]);

  function resolveAuthNote(route, method) {
    if (allowAnonymousRoutes.has(route)) return "AllowAnonymous";
    if (route === "/api/v1/auth/profile") return "Authorize Roles: Customer,Vendor";
    if (route === "/api/v1/settings" || route === "/api/v1/settings/maintenance" || route === "/api/v1/settings/generate-api-key") {
      return "Authorize Roles: Admin";
    }
    if (route.startsWith("/api/v1/users")) return "Authorize Roles: Admin";
    if (route.startsWith("/api/v1/dashboard") || route.startsWith("/api/v1/analytics")) return "Authorize Roles: Admin,Vendor";
    if (route === "/api/v1/offlinepackages" || route === "/api/v1/offlinepackages/{id}/build" || route === "/api/v1/offlinepackages/{id}/status" || route === "/api/v1/offlinepackages/{id}") {
      return "Authorize Roles: Admin";
    }
    if (route === "/api/v1/pois/{id}/toggle" || route === "/api/v1/pois/{id}/featured") return "Authorize Roles: Admin";
    if (route === "/api/v1/pois" && method === "POST") return "Authorize Roles: Admin,Vendor";
    if (route === "/api/v1/pois/{id}" && method === "DELETE") return "Authorize Roles: Admin,Vendor";
    if (route === "/api/v1/audio/poi/{poiId}/generate-tts" || route === "/api/v1/audio/{id}" && method === "DELETE") {
      return "Authorize Roles: Admin,Vendor";
    }
    if (route.startsWith("/api/v1/sync/")) return "Authorize";
    return "Authorize";
  }

  function buildDetailedMermaid(controller, service, method, route, operation) {
    const authNote = resolveAuthNote(route, method);
    const hasVendorScope = route.startsWith("/api/v1/pois") || route.startsWith("/api/v1/audio") || route.startsWith("/api/v1/dashboard") || route.startsWith("/api/v1/analytics");
    const hasCoordinatesValidation = route === "/api/v1/pois/nearby" || route === "/api/v1/pois/audio-queue";

    const isUpload = route.includes("/upload") || route.includes("/upload-image");
    const isStream = route === "/api/v1/audio/{id}/stream";
    const isQr = route === "/api/v1/audio/{id}/qr";
    const isNearby = route === "/api/v1/pois/nearby" || route === "/api/v1/pois/audio-queue";
    const isOfflineDownload = route === "/api/v1/offlinepackages/{id}/download";
    const isSyncVisits = route === "/api/v1/sync/visits";
    const isPagedList = (method === "GET" && (route === "/api/v1/pois" || route === "/api/v1/users"));

    const lines = [
      "sequenceDiagram",
      "    autonumber",
      "    participant Client",
      "    participant Controller as " + controller,
      "    participant Service as " + service,
      "    participant Repository",
      "    participant DB",
      "",
      "    Client->>Controller: " + method + " " + route,
      "    Note over Controller: " + authNote
    ];

    if (isUpload) {
      lines.push("    Note over Controller: Request content-type is multipart/form-data");
    }
    if (isPagedList) {
      lines.push("    Note over Controller: Read page/size/filter query params");
    }
    if (hasCoordinatesValidation) {
      lines.push("    Note over Controller: Validate lat/lng ranges before service call");
    }
    if (hasVendorScope) {
      lines.push("    Note over Controller: Vendor flows may resolve vendor POI scope from DB");
    }
    if (isSyncVisits) {
      lines.push("    Note over Controller: Attach authenticated userId to visit batch");
    }

    lines.push(
      "    alt AuthN/AuthZ failed",
      "        Controller-->>Client: 401 Unauthorized or 403 Forbidden",
      "    else AuthN/AuthZ passed",
      "        Controller->>Service: " + operation,
      "        Service->>Repository: Execute business rules",
      "        Repository->>DB: Execute SQL query or command",
      "        DB-->>Repository: Data rows or affected count",
      "        Repository-->>Service: Domain result",
      "",
      "        alt Validation/business error",
      "            Service-->>Controller: ApiResponse<T> Success=false with Error.Code",
      "            Note over Controller: ApiResult maps NOT_FOUND/FORBIDDEN/UNAUTHORIZED/VALIDATION_ERROR",
      "            Controller-->>Client: 4xx with ApiResponse<T>",
      "        else Success path",
      "            Service-->>Controller: ApiResponse<T> Success=true",
      "            Controller-->>Client: 200 OK with ApiResponse<T>",
      "        end",
      "    end"
    );

    if (isStream) {
      lines.push(
        "",
        "    Note over Service: Stream endpoint may return redirect or audio stream",
        "    alt Cloud mode and proxy disabled",
        "        Controller-->>Client: 302 Redirect to signed URL",
        "    else Proxy mode or local storage",
        "        Controller-->>Client: 200 audio/mpeg stream (range enabled)",
        "    end"
      );
    }

    if (isQr) {
      lines.push(
        "",
        "    Note over Service: Build stream URL then generate QR PNG",
        "    alt Audio not found",
        "        Controller-->>Client: 404 NotFound",
        "    else Found",
        "        Controller-->>Client: 200 image/png file",
        "    end"
      );
    }

    if (isOfflineDownload) {
      lines.push(
        "",
        "    Note over Service: Check package status before download",
        "    alt Cloud storage active",
        "        Controller-->>Client: 302 Redirect signed URL",
        "    else Local storage",
        "        Controller-->>Client: 200 application/zip stream",
        "    end"
      );
    }

    if (isNearby) {
      lines.push(
        "",
        "    alt Invalid coordinates",
        "        Controller-->>Client: 400 VALIDATION_ERROR",
        "    else Valid coordinates",
        "        Note over Repository: Spatial query and ordered results by distance/priority",
        "    end"
      );
    }

    if (isSyncVisits) {
      lines.push(
        "",
        "    Note over Service: Upsert visits and update denormalized counters"
      );
    }

    lines.push(
      "",
      "    Note over Controller,Client: Response envelope is always ApiResponse<T>"
    );

    return lines.join("\n");
  }

  function buildEndpointActivityMermaid(controller, service, method, route, operation) {
    function quoteLabel(text) {
      return String(text).replace(/"/g, '\\"');
    }

    const authNote = resolveAuthNote(route, method);
    const hasVendorScope = route.startsWith("/api/v1/pois") || route.startsWith("/api/v1/audio") || route.startsWith("/api/v1/dashboard") || route.startsWith("/api/v1/analytics");
    const hasCoordinatesValidation = route === "/api/v1/pois/nearby" || route === "/api/v1/pois/audio-queue";
    const isUpload = route.includes("/upload") || route.includes("/upload-image");
    const isStream = route === "/api/v1/audio/{id}/stream";
    const isQr = route === "/api/v1/audio/{id}/qr";
    const isOfflineDownload = route === "/api/v1/offlinepackages/{id}/download";
    const isSyncVisits = route === "/api/v1/sync/visits";
    const isPagedList = method === "GET" && (route === "/api/v1/pois" || route === "/api/v1/users");

    const lines = [
      "flowchart TD",
      "    startNode([Receive HTTP request]) --> routeNode[\"" + quoteLabel(method + " " + route) + "\"]",
      "    routeNode --> authNode{\"Auth check\"}",
      "    authNode -->|Fail| failAuth[Return 401 or 403]",
      "    authNode -->|Pass| controllerNode[\"" + quoteLabel(controller + " action invoked") + "\"]",
      "    controllerNode --> authzNode[\"" + quoteLabel(authNote) + "\"]"
    ];

    if (isUpload) {
      lines.push("    authzNode --> contentTypeNode{multipart form-data?}");
      lines.push("    contentTypeNode -->|No| failContentType[Return 400 VALIDATION_ERROR]");
      lines.push("    contentTypeNode -->|Yes| validationNode[Request payload validation]");
    } else {
      lines.push("    authzNode --> validationNode[Request payload validation]");
    }

    if (isPagedList) {
      lines.push("    validationNode --> pagingNode[Parse page size filter sort params]");
      lines.push("    pagingNode --> coordNode");
    }

    if (hasCoordinatesValidation) {
      if (!isPagedList) {
        lines.push("    validationNode --> coordNode");
      }
      lines.push("    coordNode{Coordinates valid?}");
      lines.push("    coordNode -->|No| failCoord[Return 400 VALIDATION_ERROR]");
      lines.push("    coordNode -->|Yes| scopeNode");
    } else {
      lines.push("    validationNode --> scopeNode");
    }

    if (hasVendorScope) {
      lines.push("    scopeNode{Vendor scope needed?}");
      lines.push("    scopeNode -->|Yes| vendorScopeNode[Load vendor POI IDs from DB]");
      lines.push("    scopeNode -->|No| serviceNode");
      lines.push("    vendorScopeNode --> serviceNode[\"" + quoteLabel(service + "." + operation) + "\"]");
    } else {
      lines.push("    scopeNode --> serviceNode[\"" + quoteLabel(service + "." + operation) + "\"]");
    }

    lines.push(
      "    serviceNode --> repoNode[Repository and data access]",
      "    repoNode --> dbNode[(MySQL and storage)]",
      "    dbNode --> serviceResultNode{Service result success?}",
      "    serviceResultNode -->|No| errorMapNode[Map Error.Code to ApiResult status]",
      "    errorMapNode --> failBusiness[Return 4xx ApiResponse]",
      "    serviceResultNode -->|Yes| successNode[Return 200 ApiResponse]"
    );

    if (isStream) {
      lines.push("    successNode --> streamModeNode{Cloud signed URL or proxy stream?}");
      lines.push("    streamModeNode -->|Signed URL| streamRedirectNode[Return 302 Redirect]");
      lines.push("    streamModeNode -->|Proxy or local| streamFileNode[Return 200 audio/mpeg stream]");
    }

    if (isQr) {
      lines.push("    successNode --> qrNode{Audio exists?}");
      lines.push("    qrNode -->|No| qrNotFoundNode[Return 404 NotFound]");
      lines.push("    qrNode -->|Yes| qrPngNode[Return 200 image/png]");
    }

    if (isOfflineDownload) {
      lines.push("    successNode --> offlineModeNode{Cloud storage enabled?}");
      lines.push("    offlineModeNode -->|Yes| offlineRedirectNode[Return 302 signed URL]");
      lines.push("    offlineModeNode -->|No| offlineStreamNode[Return 200 application/zip stream]");
    }

    if (isSyncVisits) {
      lines.push("    serviceNode --> visitsNode[Attach userId and process visit batch]");
      lines.push("    visitsNode --> repoNode");
    }

    lines.push("    failAuth --> endNode([Done])");
    lines.push("    failContentType --> endNode");
    lines.push("    failCoord --> endNode");
    lines.push("    failBusiness --> endNode");
    lines.push("    successNode --> endNode");
    if (isStream) {
      lines.push("    streamRedirectNode --> endNode");
      lines.push("    streamFileNode --> endNode");
    }
    if (isQr) {
      lines.push("    qrNotFoundNode --> endNode");
      lines.push("    qrPngNode --> endNode");
    }
    if (isOfflineDownload) {
      lines.push("    offlineRedirectNode --> endNode");
      lines.push("    offlineStreamNode --> endNode");
    }

    return lines.join("\n");
  }

  endpointDefs.forEach(function(def) {
    const group = def[0];
    const key = def[1];
    const method = def[2];
    const route = def[3];
    const controller = def[4];
    const service = def[5];
    const operation = def[6];

    window.DIAGRAM_DATA.diagrams[key] = {
      title: "Sequence: " + method + " " + route,
      mermaid: buildDetailedMermaid(controller, service, method, route, operation)
    };

    window.DIAGRAM_DATA.endpointSequenceItems = window.DIAGRAM_DATA.endpointSequenceItems || [];
    window.DIAGRAM_DATA.endpointSequenceItems.push({
      key: key,
      group: group,
      label: "[" + groupLabels[group] + "] " + method + " " + route
    });

    const activityKey = key.replace("ep-", "epa-");
    window.DIAGRAM_DATA.diagrams[activityKey] = {
      title: "Activity: " + method + " " + route,
      mermaid: buildEndpointActivityMermaid(controller, service, method, route, operation)
    };

    window.DIAGRAM_DATA.endpointActivityItems = window.DIAGRAM_DATA.endpointActivityItems || [];
    window.DIAGRAM_DATA.endpointActivityItems.push({
      key: activityKey,
      group: group,
      label: "[" + groupLabels[group] + "] " + method + " " + route
    });
  });
})();

/* Render endpoint sequence buttons into docs/uml.html section */
document.addEventListener("DOMContentLoaded", function() {
  const host = document.getElementById("endpoint-sequence-buttons");
  const activityHost = document.getElementById("endpoint-activity-buttons");
  const data = window.DIAGRAM_DATA;
  if (!data) return;

  if (host && Array.isArray(data.endpointSequenceItems)) {
    const frag = document.createDocumentFragment();
    data.endpointSequenceItems.forEach(function(item) {
      const btn = document.createElement("button");
      btn.className = "diagram-btn";
      btn.setAttribute("data-diagram", item.key);
      btn.textContent = item.label;
      frag.appendChild(btn);
    });
    host.appendChild(frag);
  }

  if (activityHost && Array.isArray(data.endpointActivityItems)) {
    const frag = document.createDocumentFragment();
    data.endpointActivityItems.forEach(function(item) {
      const btn = document.createElement("button");
      btn.className = "diagram-btn";
      btn.setAttribute("data-diagram", item.key);
      btn.textContent = item.label;
      frag.appendChild(btn);
    });
    activityHost.appendChild(frag);
  }
});
