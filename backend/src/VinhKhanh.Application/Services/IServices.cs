using VinhKhanh.Application.DTOs;

namespace VinhKhanh.Application.Services;

// ============ Auth Service ============
public interface IAuthService
{
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<LoginResponse>> RefreshTokenAsync(string refreshToken);
    Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId);
}

// ============ POI Service ============
public interface IPOIService
{
    Task<ApiResponse<PagedResult<POIListDto>>> GetListAsync(
        int page, int size, string? search, int? categoryId,
        bool? isActive, string sortBy, string order);
    Task<ApiResponse<POIDetailDto>> GetDetailAsync(int id);
    Task<ApiResponse<POIDetailDto>> CreateAsync(CreatePOIRequest request);
    Task<ApiResponse<POIDetailDto>> UpdateAsync(int id, UpdatePOIRequest request);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> ToggleActiveAsync(int id);
    Task<ApiResponse<bool>> ToggleFeaturedAsync(int id);
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
    Task<ApiResponse<AudioDto>> GenerateTTSAsync(int poiId, GenerateTTSRequest request);
    Task<ApiResponse<bool>> DeleteAsync(int id);
    Task<ApiResponse<bool>> SetDefaultAsync(int id);
    Task<Stream?> GetStreamAsync(int id);
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
}

// ============ Dashboard Service ============
public interface IDashboardService
{
    Task<ApiResponse<DashboardStatsDto>> GetStatsAsync();
    Task<ApiResponse<List<TopPOIDto>>> GetTopPOIsAsync(int count = 5);
    Task<ApiResponse<List<VisitChartDto>>> GetVisitsChartAsync(DateTime from, DateTime to);
    Task<ApiResponse<List<LanguageStatDto>>> GetLanguageStatsAsync();
    Task<ApiResponse<List<RecentActivityDto>>> GetRecentActivityAsync(int count = 10);
}

// ============ Analytics Service ============
public interface IAnalyticsService
{
    Task<ApiResponse<Dictionary<string, TrendDto>>> GetTrendsAsync(string period);
    Task<ApiResponse<List<VisitChartDto>>> GetVisitsByDayAsync(DateTime from, DateTime to);
    Task<ApiResponse<List<HourlyVisitDto>>> GetVisitsByHourAsync(DateTime date);
    Task<ApiResponse<List<LanguageStatDto>>> GetLanguageDistributionAsync(DateTime from, DateTime to);
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
