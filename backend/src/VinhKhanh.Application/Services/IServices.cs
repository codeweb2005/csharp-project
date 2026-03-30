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
    Task<ApiResponse<List<HourlyVisitDto>>>  GetVisitsByHourAsync(DateTime date, List<int>? vendorPOIIds = null);
    Task<ApiResponse<List<LanguageStatDto>>> GetLanguageDistributionAsync(DateTime from, DateTime to, List<int>? vendorPOIIds = null);
}

// ============ Offline Package Service ============
public interface IOfflinePackageService
{
    Task<ApiResponse<List<OfflinePackageDto>>> GetAllAsync();
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
    Task<ApiResponse<int>> UploadVisitsAsync(VisitBatchRequest request, int? userId);
}

// ============ Language Service ============
/// <summary>
/// Provides the list of supported languages. Anonymous endpoint used by mobile app for the language picker.
/// </summary>
public interface ILanguageService
{
    Task<ApiResponse<List<LanguageDto>>> GetAllActiveAsync();
}
