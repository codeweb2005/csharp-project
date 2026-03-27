namespace VinhKhanh.Application.DTOs;

// ============ Common ============
public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public ErrorInfo? Error { get; set; }
    public string? TraceId { get; set; }

    public static ApiResponse<T> Ok(T data) => new() { Data = data };
    public static ApiResponse<T> Fail(string code, string message) =>
        new() { Success = false, Error = new ErrorInfo { Code = code, Message = message } };
}

public class ErrorInfo
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public List<FieldError>? Details { get; set; }
}

public class FieldError
{
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];
    public PaginationInfo Pagination { get; set; } = new();
}

public class PaginationInfo
{
    public int Page { get; set; }
    public int Size { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalItems / Size);
}

// ============ Auth ============
public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Request body for tourist self-registration (POST /api/v1/auth/register).
/// Creates a Customer-role account and returns JWT tokens.
/// </summary>
public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;         // min 8 chars
    public string? FullName { get; set; }
    public int? PreferredLanguageId { get; set; }                // optional, set language preference
}

// ============ Language ============

/// <summary>
/// Language record returned by GET /api/v1/languages.
/// Used by mobile app for language picker.
/// </summary>
public class LanguageDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;            // ISO 639-1: "vi", "en"
    public string Name { get; set; } = string.Empty;            // "Vietnamese", "English"
    public string NativeName { get; set; } = string.Empty;      // "Tiếng Việt"
    public string? TtsCode { get; set; }                        // "vi-VN", "en-US"
    public string? FlagEmoji { get; set; }
    public int SortOrder { get; set; }
}

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public UserDto User { get; set; } = null!;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

// ============ User ============
public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? ShopName { get; set; }           // For Vendor
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer";
    public string? Phone { get; set; }
    public int? POIId { get; set; }                 // Link vendor to POI
}

public class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public int? PreferredLanguageId { get; set; }
}

// ============ POI ============
public class POIListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryIcon { get; set; } = string.Empty;
    public string CategoryColor { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadius { get; set; }
    /// <summary>Higher value = higher priority when multiple geofences overlap on mobile.</summary>
    public int Priority { get; set; }
    public double Rating { get; set; }
    public int TotalVisits { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public int AudioCount { get; set; }
    public int TranslationCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Extended POIListDto returned by GET /api/v1/pois/nearby.
/// Includes distance from the requester's current position.
/// </summary>
public class NearbyPOIDto : POIListDto
{
    /// <summary>Distance in meters from the query lat/lng to this POI.</summary>
    public double DistanceMeters { get; set; }
    /// <summary>Active audio narrations available for this POI. Filtered by langId if supplied.</summary>
    public List<AudioDto> Audio { get; set; } = [];
    /// <summary>Translations available. Filtered to requested langId if supplied.</summary>
    public List<POITranslationDto> Translations { get; set; } = [];
}

public class POIDetailDto : POIListDto
{
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public decimal? PriceRangeMin { get; set; }
    public decimal? PriceRangeMax { get; set; }
    public string? OpeningHours { get; set; }
    public int? VendorUserId { get; set; }
    public string? VendorName { get; set; }
    public List<POITranslationDto> Translations { get; set; } = [];
    public List<MediaDto> Media { get; set; } = [];
    public List<AudioDto> Audio { get; set; } = [];
    public List<MenuItemDto> MenuItems { get; set; } = [];
}

public class CreatePOIRequest
{
    public int CategoryId { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadius { get; set; } = 25;
    /// <summary>
    /// Priority for geofence conflict resolution on mobile.
    /// When multiple geofences overlap, the POI with the highest priority plays first.
    /// Default 0 = normal; use higher values (e.g. 10, 20) to boost specific POIs.
    /// </summary>
    public int Priority { get; set; } = 0;
    public decimal? PriceRangeMin { get; set; }
    public decimal? PriceRangeMax { get; set; }
    public string? OpeningHours { get; set; }
    public int? VendorUserId { get; set; }
    public bool IsFeatured { get; set; }
    public List<TranslationInput> Translations { get; set; } = [];
}

public class UpdatePOIRequest : CreatePOIRequest { }

public class TranslationInput
{
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string? FullDescription { get; set; }
    public string? NarrationText { get; set; }
    public List<string>? Highlights { get; set; }
}

public class POITranslationDto : TranslationInput
{
    public int Id { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string LanguageName { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
}

// ============ Media ============
public class MediaDto
{
    public int Id { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public string MediaType { get; set; } = "Image";
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public long FileSize { get; set; }
}

// ============ Audio ============
public class AudioDto
{
    public int Id { get; set; }
    public int POIId { get; set; }
    public int LanguageId { get; set; }
    public string LanguageName { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string VoiceType { get; set; } = string.Empty;
    public string? VoiceName { get; set; }
    public int Duration { get; set; }
    public long FileSize { get; set; }
    public bool IsDefault { get; set; }
}

public class GenerateTTSRequest
{
    public int LanguageId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string VoiceName { get; set; } = "vi-VN-HoaiMyNeural";
    public double Speed { get; set; } = 1.0;
}

// ============ Category ============
public class CategoryDto
{
    public int Id { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public int POICount { get; set; }
    public List<CategoryTranslationDto> Translations { get; set; } = [];
}

public class CategoryTranslationDto
{
    public int LanguageId { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class CreateCategoryRequest
{
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = "#3b82f6";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public List<CategoryTranslationInput> Translations { get; set; } = [];
}

public class CategoryTranslationInput
{
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
}

// ============ Menu ============
public class MenuItemDto
{
    public int Id { get; set; }
    public int POIId { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsSignature { get; set; }
    public bool IsAvailable { get; set; }
    public int SortOrder { get; set; }
    public string Name { get; set; } = string.Empty;       // default lang
    public string? Description { get; set; }
    public List<MenuTranslationDto> Translations { get; set; } = [];
}

public class MenuTranslationDto
{
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateMenuItemRequest
{
    public decimal Price { get; set; }
    public bool IsSignature { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int SortOrder { get; set; }
    public List<MenuTranslationDto> Translations { get; set; } = [];
}

// ============ Dashboard ============
public class DashboardStatsDto
{
    public int ActivePOIs { get; set; }
    public int TotalVisits { get; set; }
    public double TotalVisitsChange { get; set; }
    public int Languages { get; set; }
    public int AudioFiles { get; set; }
    public int TotalUsers { get; set; }
    public int TotalVendors { get; set; }
}

public class TopPOIDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public int Visits { get; set; }
}

public class VisitChartDto
{
    public string Date { get; set; } = string.Empty;
    public int Visits { get; set; }
    public int Narrations { get; set; }
}

public class LanguageStatDto
{
    public string Name { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RecentActivityDto
{
    public string UserName { get; set; } = string.Empty;
    public string POIName { get; set; } = string.Empty;
    public string TriggerType { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
    public DateTime VisitedAt { get; set; }
}

// ============ Analytics ============
public class TrendDto
{
    public decimal Value { get; set; }
    public double ChangePercent { get; set; }
}

public class HourlyVisitDto
{
    public int Hour { get; set; }
    public int Visits { get; set; }
}

// ============ Offline Package ============
public class OfflinePackageDto
{
    public int Id { get; set; }
    public int LanguageId { get; set; }
    public string LanguageName { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    public string? CurrentStep { get; set; }
    public long? FileSize { get; set; }
    public string? FilePath { get; set; }   // S3 key or local relative path for download redirect
    public string? Checksum { get; set; }
    public int DownloadCount { get; set; }
    public int POICount { get; set; }
    public int AudioCount { get; set; }
    public int ImageCount { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreatePackageRequest
{
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
}

// ============ Settings ============
public class SystemSettingsDto
{
    public GeofenceSettings Geofence { get; set; } = new();
    public NarrationSettings Narration { get; set; } = new();
    public SyncSettings Sync { get; set; } = new();
    public ApiSettings Api { get; set; } = new();
}

public class GeofenceSettings
{
    public int DefaultRadius { get; set; } = 30;
    public int GpsUpdateFrequency { get; set; } = 5;
    public string GpsAccuracy { get; set; } = "High";
}

public class NarrationSettings
{
    public int DefaultCooldown { get; set; } = 30;
    public string DefaultMode { get; set; } = "Auto";
    public string TtsVoiceVi { get; set; } = "vi-VN-HoaiMyNeural";
    public string TtsVoiceEn { get; set; } = "en-US-JennyNeural";
    public double TtsSpeed { get; set; } = 1.0;
    public bool AutoGenerateTTS { get; set; } = true;
}

public class SyncSettings
{
    public int SyncFrequency { get; set; } = 15;
    public int BatchSize { get; set; } = 50;
    public bool CompressData { get; set; } = true;
    public bool WifiOnly { get; set; }
}

public class ApiSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public bool MaintenanceMode { get; set; }
}

// ============ Sync ============
public class SyncDeltaResponse
{
    public DateTime ServerTime { get; set; }
    public SyncGroup<POIListDto> POIs { get; set; } = new();
    public SyncGroup<CategoryDto> Categories { get; set; } = new();
    public SyncGroup<AudioDto> Audio { get; set; } = new();
    public SyncGroup<MenuItemDto> Menu { get; set; } = new();
}

public class SyncGroup<T>
{
    public List<T> Updated { get; set; } = [];
    public List<int> Deleted { get; set; } = [];
}

public class VisitBatchRequest
{
    public List<VisitInput> Visits { get; set; } = [];
}

public class VisitInput
{
    public int POIId { get; set; }
    public int LanguageId { get; set; }
    public string TriggerType { get; set; } = string.Empty;
    public bool NarrationPlayed { get; set; }
    public int ListenDuration { get; set; }
    public DateTime VisitedAt { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
