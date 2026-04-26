using VinhKhanh.Application.DTOs;

namespace VinhKhanh.Application.Services;

// ============ Auth Service ============
public interface IAuthService
{
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<LoginResponse>> RefreshTokenAsync(string refreshToken);
    Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId);
    /// <summary>
    /// Register a new tourist account (Role = Customer).
    /// Returns JWT tokens immediately after registration so the user is logged in.
    /// </summary>
    Task<ApiResponse<LoginResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<ForgotPasswordResponse>> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequest request);
    /// <summary>Update the signed-in Customer or Vendor profile (not for Admin — use Users API).</summary>
    Task<ApiResponse<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request);
}

// ============ POI Service ============
public interface IPOIService
{
    Task<ApiResponse<PagedResult<POIListDto>>> GetListAsync(
        int page, int size, string? search, int? categoryId,
        bool? isActive, string sortBy, string order,
        List<int>? vendorPOIIds = null);
    Task<ApiResponse<POIDetailDto>> GetDetailAsync(int id);
    Task<ApiResponse<POIDetailDto>> CreateAsync(CreatePOIRequest request);
    /// <summary>
    /// Update an existing POI.
    /// When <paramref name="callerId"/> is supplied and the caller is a <c>Vendor</c>,
    /// the service MUST verify that <c>POI.VendorUserId == callerId</c> and return
    /// a 403-equivalent error if not. Admins may update any POI unconditionally.
    /// </summary>
    /// <param name="callerId">ID of the authenticated user (from JWT sub claim).</param>
    /// <param name="callerRole">Role string of the caller (e.g. "Vendor", "Admin").</param>
    Task<ApiResponse<POIDetailDto>> UpdateAsync(int id, UpdatePOIRequest request, int? callerId = null, string? callerRole = null);
    Task<ApiResponse<bool>> DeleteAsync(int id, int? callerId = null, string? callerRole = null);
    Task<ApiResponse<bool>> ToggleActiveAsync(int id);
    Task<ApiResponse<bool>> ToggleFeaturedAsync(int id);
    /// <summary>
    /// Returns all active POIs within <paramref name="radiusMeters"/> of the given coordinates,
    /// sorted by distance ascending. Designed for the mobile app's geofence bootstrap.
    /// Uses MySQL ST_Distance_Sphere for accurate spherical distance calculation.
    /// </summary>
    /// <param name="lat">Requester latitude (-90 to 90)</param>
    /// <param name="lng">Requester longitude (-180 to 180)</param>
    /// <param name="radiusMeters">Search radius in meters (max 5000)</param>
    /// <param name="langId">If provided, filters translations to this language only</param>
    Task<ApiResponse<List<NearbyPOIDto>>> GetNearbyAsync(double lat, double lng, int radiusMeters, int? langId);
    /// <summary>
    /// Returns full POI detail for anonymous mobile access (no authentication required).
    /// Only returns active POIs. Used by mobile tourist flow.
    /// </summary>
    Task<ApiResponse<POIDetailDto>> GetPublicDetailAsync(int id, int? langId);

    /// <summary>
    /// Returns an ordered audio playback queue for a user's current position.
    /// When multiple POIs are within the search radius, their narrations are
    /// ordered by Priority (descending) then Distance (ascending) so the mobile
    /// app can play them sequentially instead of simultaneously.
    /// Each POI contributes at most one audio track (the default one for the language).
    /// </summary>
    /// <param name="lat">Requester latitude (-90 to 90)</param>
    /// <param name="lng">Requester longitude (-180 to 180)</param>
    /// <param name="radiusMeters">Search radius in meters (max 5000)</param>
    /// <param name="langId">If provided, selects audio for this language only</param>
    Task<ApiResponse<AudioQueueResponse>> GetAudioQueueAsync(double lat, double lng, int radiusMeters, int? langId);
}

// ============ Category Service ============
public interface ICategoryService
{
    Task<ApiResponse<List<CategoryDto>>> GetAllAsync();
    Task<ApiResponse<CategoryDto>> GetByIdAsync(int id);
    Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryRequest request);
    Task<ApiResponse<CategoryDto>> UpdateAsync(int id, CreateCategoryRequest request);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> ToggleActiveAsync(int id);
}

// ============ Audio Service ============
public interface IAudioService
{
    Task<ApiResponse<List<AudioDto>>> GetByPOIAsync(int poiId, string? lang = null);
    Task<ApiResponse<AudioDto>> UploadAsync(int poiId, int languageId, Stream file, string fileName);
    Task<ApiResponse<AudioDto>> GenerateTTSAsync(int poiId, GenerateTTSRequest request, List<int>? vendorPOIIds = null);
    Task<ApiResponse<bool>> DeleteAsync(int id, List<int>? vendorPOIIds = null);
    Task<ApiResponse<bool>> SetDefaultAsync(int id);
    Task<Stream?> GetStreamAsync(int id);
    Task<string?> GetFileKeyAsync(int id);
}

// ============ Audio QR Service ============
public interface IAudioQrService
{
    /// <summary>
    /// Generates a PNG QR code for a given <paramref name="audioId"/> and QR payload URL (<paramref name="streamUrl"/>).
    /// Returns null when the audio does not exist or is inactive.
    /// </summary>
    Task<byte[]?> GetAudioQrPngAsync(int audioId, string streamUrl, int pixels = 512);
}

// ============ Media Service ============
public interface IMediaService
{
    Task<ApiResponse<List<MediaDto>>> GetByPOIAsync(int poiId);
    Task<ApiResponse<MediaDto>> UploadAsync(int poiId, Stream file, string fileName, string? caption, bool isPrimary);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> SetPrimaryAsync(int id);
    Task<ApiResponse<bool>> ReorderAsync(int poiId, List<int> orderedIds);
}

// ============ Menu Service ============
public interface IMenuService
{
    Task<ApiResponse<List<MenuItemDto>>> GetByPOIAsync(int poiId);
    Task<ApiResponse<MenuItemDto>> CreateAsync(int poiId, CreateMenuItemRequest request);
    Task<ApiResponse<MenuItemDto>> UpdateAsync(int id, CreateMenuItemRequest request);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> ToggleAvailableAsync(int id);
    Task<ApiResponse<bool>> ToggleSignatureAsync(int id);
    Task<ApiResponse<MenuItemDto>> UploadImageAsync(int id, Stream file, string fileName);
}

// ============ User Service ============
public interface IUserService
{
    Task<ApiResponse<PagedResult<UserDto>>> GetListAsync(
        int page, int size, string? search, string? role);
    Task<ApiResponse<UserDto>> GetByIdAsync(int id);
    Task<ApiResponse<UserDto>> CreateAsync(CreateUserRequest request);
    Task<ApiResponse<UserDto>> UpdateAsync(int id, UpdateUserRequest request);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> ToggleActiveAsync(int id);
    Task<ApiResponse<bool>> ResetPasswordAsync(int id);
    /// <summary>
    /// Returns the DB-authoritative list of POI IDs assigned to this vendor.
    /// Always fresh — does not rely on the JWT claim.
    /// Returns null for non-Vendor users.
    /// </summary>
    Task<List<int>?> GetVendorPOIIdsAsync(int userId);
}

// ============ Dashboard Service ============
/// <summary>
/// Aggregated stats for the admin dashboard and the Vendor mini-dashboard.
/// When <c>vendorPOIIds</c> is supplied, ALL queries are scoped to those POIs
/// so a Vendor only ever sees their own shops' data.
/// </summary>
public interface IDashboardService
{
    Task<ApiResponse<DashboardStatsDto>> GetStatsAsync(List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<TopPOIDto>>>   GetTopPOIsAsync(int count = 5, List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<VisitChartDto>>> GetVisitsChartAsync(DateTime from, DateTime to, List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<LanguageStatDto>>> GetLanguageStatsAsync(List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<RecentActivityDto>>> GetRecentActivityAsync(int count = 10, List<int>? vendorPOIIds = null);
}

// ============ Analytics Service ============
/// <summary>
/// Detailed analytics data. All methods accept an optional <c>vendorPOIIds</c>.
/// When provided, queries are restricted to visits for those POIs only.
/// </summary>
public interface IAnalyticsService
{
    Task<ApiResponse<Dictionary<string, TrendDto>>> GetTrendsAsync(string period, List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<VisitChartDto>>>   GetVisitsByDayAsync(DateTime from, DateTime to, List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<HourlyVisitDto>>>  GetVisitsByHourAsync(DateTime date, List<int>? vendorPOIIds = null, int tzOffsetMinutes = 420);
    Task<ApiResponse<List<LanguageStatDto>>> GetLanguageDistributionAsync(DateTime from, DateTime to, List<int>? vendorPOIIds = null);
}

// ============ Offline Package Service ============
public interface IOfflinePackageService
{
    Task<ApiResponse<List<OfflinePackageDto>>> GetAllAsync();
    Task<ApiResponse<List<OfflinePackageCatalogItemDto>>> GetPublicCatalogAsync();
    Task<ApiResponse<OfflinePackageDto>> CreateAsync(CreatePackageRequest request);
    Task<ApiResponse<bool>> BuildAsync(int id);
    Task<ApiResponse<OfflinePackageDto>> GetStatusAsync(int id);
    Task<Stream?> DownloadAsync(int id);
    Task<ApiResponse<bool>> DeleteAsync(int id);
}

// ============ Settings Service ============
public interface ISettingsService
{
    Task<ApiResponse<SystemSettingsDto>> GetAllAsync();
    Task<ApiResponse<bool>> UpdateAsync(SystemSettingsDto settings);
    Task<ApiResponse<bool>> SetMaintenanceModeAsync(bool enabled);
    Task<ApiResponse<string>> GenerateApiKeyAsync();
}

// ============ Sync Service ============
public interface ISyncService
{
    Task<ApiResponse<SyncDeltaResponse>> GetDeltaAsync(DateTime since, int languageId);
    Task<ApiResponse<int>> UploadVisitsAsync(VisitBatchRequest request, int? userId, string? sessionId = null);
}

// ============ Language Service ============
/// <summary>
/// Provides language data. Anonymous endpoint used by mobile app for the language picker.
/// Admin CRUD endpoints are protected by [Authorize(Roles = "Admin")].
/// </summary>
public interface ILanguageService
{
    /// <summary>Returns all ACTIVE languages sorted by SortOrder (mobile/public use).</summary>
    Task<ApiResponse<List<LanguageDto>>> GetAllActiveAsync();

    /// <summary>Returns ALL languages (active + inactive) for the admin management table.</summary>
    Task<ApiResponse<List<LanguageAdminDto>>> GetAllAsync();

    Task<ApiResponse<LanguageAdminDto>> GetByIdAsync(int id);
    Task<ApiResponse<LanguageAdminDto>> CreateAsync(CreateLanguageRequest request);
    Task<ApiResponse<LanguageAdminDto>> UpdateAsync(int id, UpdateLanguageRequest request);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> ToggleActiveAsync(int id);
}

// ============ Tourist Session Service ============
/// <summary>
/// Manages anonymous tourist sessions created via QR code scan.
/// No account creation required — a session token embedded in a QR code is
/// exchanged for a short-lived JWT with role = Tourist.
/// </summary>
public interface ITouristSessionService
{
    /// <summary>
    /// Exchange a QR session token for a 24-hour JWT.
    /// Creates or updates the TouristSession row; increments QR use-count.
    /// Returns an error if the QR is invalid, expired, or max-uses reached.
    /// </summary>
    Task<ApiResponse<TouristTokenResponse>> StartSessionAsync(StartSessionRequest request);

    /// <summary>
    /// Return current session info for the authenticated tourist (from JWT claims).
    /// </summary>
    Task<ApiResponse<TouristSessionDto>> GetSessionAsync(string sessionId);

    /// <summary>Mark a session as inactive. Called when tourist exits the app.</summary>
    Task<ApiResponse<bool>> EndSessionAsync(string sessionId);

    // ── Admin: QR Management ──────────────────────────────────────────────

    /// <summary>List all QR codes created by admins (with use counts).</summary>
    Task<ApiResponse<List<TourQRCodeDto>>> GetQRCodesAsync();

    /// <summary>Generate a new QR (UUID v4) and return its PNG bytes.</summary>
    Task<ApiResponse<TourQRCodeDto>> CreateQRCode(CreateQRCodeRequest request);

    /// <summary>Returns PNG bytes for an existing QR code.</summary>
    Task<byte[]?> GetQRPngAsync(string qrToken, int pixels = 512);

    /// <summary>Deactivate a QR code so it can no longer be used.</summary>
    Task<ApiResponse<bool>> DeactivateQRCodeAsync(int id);
}

// ============ Presence Service ============
/// <summary>
/// Tracks real-time GPS positions of active tourists and broadcasts
/// presence events to admin monitors via SignalR.
/// </summary>
public interface IPresenceService
{
    /// <summary>
    /// Record that a tourist has entered a POI's geofence.
    /// Upserts ActivePresence row and broadcasts "TouristEnteredPOI" to admin hub.
    /// </summary>
    Task TrackEnterAsync(string sessionId, int poiId, double? lat, double? lng);

    /// <summary>
    /// Record that a tourist has exited a POI's geofence (or session ended).
    /// Sets PoiId = null in ActivePresence and broadcasts "TouristExitedPOI".
    /// </summary>
    Task TrackExitAsync(string sessionId, int? poiId);

    /// <summary>
    /// Update only the tourist's GPS coordinates (between POIs).
    /// Used by periodic location pings from the mobile app.
    /// </summary>
    Task UpdateLocationAsync(string sessionId, double lat, double lng);

    /// <summary>
    /// Record anonymous visitor website heartbeat.
    /// The visitor is considered online while heartbeats continue.
    /// </summary>
    Task TrackWebVisitorHeartbeatAsync(string visitorId);

    /// <summary>
    /// Mark anonymous visitor website session as ended.
    /// </summary>
    Task TrackWebVisitorExitAsync(string visitorId);

    /// <summary>
    /// Update GPS location of an anonymous web visitor (visitor site with geolocation).
    /// Stored in-memory and included in the next snapshot for admin heatmap.
    /// </summary>
    Task TrackWebVisitorLocationAsync(string visitorId, double lat, double lng);

    /// <summary>
    /// Increment the narration count for the current web visitor session.
    /// Called when a web visitor starts playing an audio narration.
    /// </summary>
    Task TrackWebNarrationAsync(string visitorId);

    /// <summary>
    /// Get a snapshot of all currently active tourists (for admin heatmap).
    /// Returns position + active POI for every non-expired ActivePresence row.
    /// </summary>
    Task<ApiResponse<PresenceSnapshot>> GetSnapshotAsync();

    /// <summary>
    /// Get aggregated monitor dashboard stats:
    ///   - ActiveSessions  : TouristSessions active in last 24h
    ///   - TouristsAtPOI   : ActivePresence rows with a PoiId (realtime)
    ///   - ActivePOIs      : POIs that have at least one active tourist (realtime)
    ///   - TotalVisitsToday: VisitHistory count for today (UTC)
    ///   - TotalQRCodes    : active TourQRCodes
    ///   - WebVisitors     : anonymous web heartbeat count
    /// </summary>
    Task<ApiResponse<PresenceDashboardStats>> GetDashboardStatsAsync();

    /// <summary>Remove stale presence rows for sessions older than the threshold.</summary>
    Task PurgeStaleAsync(TimeSpan staleThreshold);
}
