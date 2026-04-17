using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Interfaces;

namespace VinhKhanh.API.Controllers;

/// <summary>
/// Base controller for all API controllers.
/// Provides JWT claim helpers and DB-backed vendor scoping used throughout the application.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>Returns the authenticated user's ID from the JWT 'sub' claim.</summary>
    protected int GetUserId() =>
        int.Parse(User.FindFirst("sub")?.Value 
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
            ?? "0");

    /// <summary>Returns the authenticated user's role string (e.g. "Admin", "Vendor", "Customer").</summary>
    protected string GetUserRole() =>
        User.FindFirst("role")?.Value 
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value 
            ?? "";

    /// <summary>
    /// Returns the Vendor's linked POI IDs by querying the database directly.
    /// Always fresh — bypasses the JWT claim so admin changes (add/remove shops)
    /// are reflected immediately without requiring the vendor to re-login.
    /// Returns <c>null</c> for Admin and Customer users.
    /// </summary>
    protected async Task<List<int>?> GetVendorPOIIdsAsync(IUserService userService)
    {
        if (GetUserRole() != "Vendor") return null;
        return await userService.GetVendorPOIIdsAsync(GetUserId());
    }

    /// <summary>Maps an <see cref="ApiResponse{T}"/> to an appropriate HTTP result.</summary>
    protected IActionResult ApiResult<T>(ApiResponse<T> response)
    {
        if (response.Success) return Ok(response);
        return response.Error?.Code switch
        {
            "NOT_FOUND"          => NotFound(response),
            "FORBIDDEN"          => StatusCode(403, response),
            "UNAUTHORIZED"       => Unauthorized(response),
            "VALIDATION_ERROR"   => BadRequest(response),
            "ACCOUNT_DISABLED"   => StatusCode(403, response),
            _                    => BadRequest(response)
        };
    }
}


// ================================
// Auth Controller
// ================================
[Route("api/v1/auth")]
public class AuthController(IAuthService authService) : BaseApiController
{
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => ApiResult(await authService.LoginAsync(request));

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] string refreshToken)
        => ApiResult(await authService.RefreshTokenAsync(refreshToken));

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        => ApiResult(await authService.ChangePasswordAsync(GetUserId(), request));

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMe()
        => ApiResult(await authService.GetCurrentUserAsync(GetUserId()));

    /// <summary>
    /// Tourist self-registration. Creates a Customer-role account and returns JWT tokens,
    /// so the user is immediately authenticated after registering.
    /// No existing session required — AllowAnonymous.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        => ApiResult(await authService.RegisterAsync(request));

    /// <summary>
    /// Request a password-reset for Customer or Vendor accounts. Response shape is always the same
    /// (no email enumeration). When <c>PasswordReset:ReturnTokenInResponse</c> is true, dev clients may receive <c>resetToken</c>.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        => ApiResult(await authService.ForgotPasswordAsync(request));

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        => ApiResult(await authService.ResetPasswordAsync(request));

    /// <summary>Self-service profile update for Customer and Vendor (not Admin).</summary>
    [HttpPut("profile")]
    [Authorize(Roles = "Customer,Vendor")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        => ApiResult(await authService.UpdateProfileAsync(GetUserId(), request));
}

// ================================
// POI Controller
// ================================
[Authorize]
public class POIsController(IPOIService poiService, IUserService userSvc) : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int page = 1, [FromQuery] int size = 10,
        [FromQuery] string? search = null, [FromQuery] int? categoryId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string sortBy = "name", [FromQuery] string order = "asc")
        => ApiResult(await poiService.GetListAsync(page, size, search, categoryId, isActive, sortBy, order,
            await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id)
        => ApiResult(await poiService.GetDetailAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,Vendor")]
    public async Task<IActionResult> Create([FromBody] CreatePOIRequest request)
    {
        // Vendor: auto-link POI to themselves
        if (GetUserRole() == "Vendor")
            request.VendorUserId = GetUserId();
        return ApiResult(await poiService.CreateAsync(request));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePOIRequest request)
        => ApiResult(await poiService.UpdateAsync(id, request, GetUserId(), GetUserRole()));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Vendor")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await poiService.DeleteAsync(id, GetUserId(), GetUserRole()));

    [HttpPatch("{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Toggle(int id)
        => ApiResult(await poiService.ToggleActiveAsync(id));

    [HttpPatch("{id}/featured")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Featured(int id)
        => ApiResult(await poiService.ToggleFeaturedAsync(id));

    /// <summary>
    /// Returns active POIs within a radius of the caller's GPS position.
    /// Designed for the mobile app — call this on app startup to bootstrap
    /// the local geofence engine. Anonymous access (no JWT required).
    ///
    /// Query params:
    ///   lat          — latitude   (required)
    ///   lng          — longitude  (required)
    ///   radiusMeters — search radius in meters, default 500, max 5000
    ///   langId       — if supplied, returns translations for that language only
    /// </summary>
    [HttpGet("nearby")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNearby(
        [FromQuery] double lat,
        [FromQuery] double lng,
        [FromQuery] int radiusMeters = 500,
        [FromQuery] int? langId = null)
    {
        // Basic coordinate validation
        if (lat < -90 || lat > 90)
            return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR", "lat must be between -90 and 90"));
        if (lng < -180 || lng > 180)
            return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR", "lng must be between -180 and 180"));

        return ApiResult(await poiService.GetNearbyAsync(lat, lng, radiusMeters, langId));
    }

    /// <summary>
    /// Returns full public detail for a single active POI, without authentication.
    /// Used by the mobile app tourist flow. Returns 404 if the POI is inactive.
    /// Optional langId param filters translations and audio to a single language.
    /// </summary>
    [HttpGet("{id}/public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicDetail(
        int id,
        [FromQuery] int? langId = null)
        => ApiResult(await poiService.GetPublicDetailAsync(id, langId));

    /// <summary>
    /// Returns an ordered audio playback queue based on the user's GPS position.
    /// When multiple POIs are within range, their narrations are queued sequentially
    /// (sorted by Priority DESC, then Distance ASC) instead of playing simultaneously.
    /// The mobile app should play items in the returned order.
    ///
    /// Query params:
    ///   lat          — latitude   (required)
    ///   lng          — longitude  (required)
    ///   radiusMeters — search radius in meters, default 500, max 5000
    ///   langId       — if supplied, selects audio for that language only
    /// </summary>
    [HttpGet("audio-queue")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAudioQueue(
        [FromQuery] double lat,
        [FromQuery] double lng,
        [FromQuery] int radiusMeters = 500,
        [FromQuery] int? langId = null)
    {
        if (lat < -90 || lat > 90)
            return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR", "lat must be between -90 and 90"));
        if (lng < -180 || lng > 180)
            return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR", "lng must be between -180 and 180"));

        return ApiResult(await poiService.GetAudioQueueAsync(lat, lng, radiusMeters, langId));
    }
}

// ================================
// Languages Controller
// ================================

/// <summary>
/// Public endpoint for the mobile app language picker.
/// Returns all active languages — no authentication required.
/// </summary>
[Route("api/v1/languages")]
public class LanguagesController(ILanguageService languageService) : BaseApiController
{
    /// <summary>
    /// GET /api/v1/languages
    /// Returns all active languages sorted by SortOrder.
    /// Mobile app uses this to populate the language selection screen on first run.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
        => ApiResult(await languageService.GetAllActiveAsync());
}

// ================================
// Categories Controller
// ================================
[Authorize(Roles = "Admin")]
public class CategoriesController(ICategoryService svc) : BaseApiController
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
        => ApiResult(await svc.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => ApiResult(await svc.GetByIdAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
        => ApiResult(await svc.CreateAsync(req));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateCategoryRequest req)
        => ApiResult(await svc.UpdateAsync(id, req));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id));

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
        => ApiResult(await svc.ToggleActiveAsync(id));
}

// ================================
// Audio Controller
// ================================
[Authorize]
public class AudioController(IAudioService svc, IFileStorageService fileStorage, IUserService userSvc, IAudioQrService qrSvc) : BaseApiController
{
    [HttpGet("poi/{poiId}")]
    public async Task<IActionResult> GetByPOI(int poiId, [FromQuery] string? lang = null)
        => ApiResult(await svc.GetByPOIAsync(poiId, lang));

    [HttpPost("poi/{poiId}/upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(int poiId, IFormFile file, [FromForm] int languageId)
    {
        using var stream = file.OpenReadStream();
        return ApiResult(await svc.UploadAsync(poiId, languageId, stream, file.FileName));
    }

    [HttpPost("poi/{poiId}/generate-tts")]
    [Authorize(Roles = "Admin,Vendor")]
    public async Task<IActionResult> GenerateTTS(int poiId, [FromBody] GenerateTTSRequest req)
        => ApiResult(await svc.GenerateTTSAsync(poiId, req, await GetVendorPOIIdsAsync(userSvc)));

    /// <summary>
    /// Stream or redirect audio content.
    /// - S3 provider (default): returns HTTP 302 redirect to a presigned S3 URL.
    /// - S3 provider with ?proxy=1: API downloads from S3 and streams audio/mpeg directly.
    ///   This mode is useful for clients that fail to play redirected media URLs.
    /// - Local provider: always streams audio/mpeg through the API server.
    /// </summary>
    [HttpGet("{id}/stream")]
    [AllowAnonymous]
    public async Task<IActionResult> Stream(int id, [FromQuery] string? proxy = null)
    {
        var useProxy = string.Equals(proxy, "1", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(proxy, "true", StringComparison.OrdinalIgnoreCase);

        if (fileStorage.IsCloudStorage)
        {
            var key = await svc.GetFileKeyAsync(id);
            if (key == null) return NotFound();

            if (!useProxy)
            {
                var url = fileStorage.GetSignedUrl(key);
                return Redirect(url);
            }

            var cloudStream = await fileStorage.GetFileAsync(key);
            if (cloudStream == null) return NotFound();
            return File(cloudStream, "audio/mpeg", enableRangeProcessing: true);
        }

        var localStream = await svc.GetStreamAsync(id);
        if (localStream == null) return NotFound();
        return File(localStream, "audio/mpeg", enableRangeProcessing: true);
    }

    [HttpGet("{id}/qr")]
    [AllowAnonymous]
    public async Task<IActionResult> Qr(int id, [FromQuery] int pixels = 512)
    {
        var streamUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/v1/audio/{id}/stream";
        if (fileStorage.IsCloudStorage)
            streamUrl += "?proxy=1";

        var png = await qrSvc.GetAudioQrPngAsync(id, streamUrl, pixels);
        if (png == null) return NotFound();

        return File(png, "image/png", $"audio-{id}-qr.png");
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Vendor")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id, await GetVendorPOIIdsAsync(userSvc)));

    [HttpPatch("{id}/set-default")]
    public async Task<IActionResult> SetDefault(int id)
        => ApiResult(await svc.SetDefaultAsync(id));
}

// ================================
// Media Controller
// ================================
[Authorize]
public class MediaController(IMediaService svc) : BaseApiController
{
    [HttpGet("poi/{poiId}")]
    public async Task<IActionResult> GetByPOI(int poiId)
        => ApiResult(await svc.GetByPOIAsync(poiId));

    [HttpPost("poi/{poiId}/upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(int poiId, IFormFile file,
        [FromForm] string? caption = null, [FromForm] bool isPrimary = false)
    {
        using var stream = file.OpenReadStream();
        return ApiResult(await svc.UploadAsync(poiId, stream, file.FileName, caption, isPrimary));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id));

    [HttpPatch("{id}/set-primary")]
    public async Task<IActionResult> SetPrimary(int id)
        => ApiResult(await svc.SetPrimaryAsync(id));

    [HttpPut("poi/{poiId}/reorder")]
    public async Task<IActionResult> Reorder(int poiId, [FromBody] List<int> orderedIds)
        => ApiResult(await svc.ReorderAsync(poiId, orderedIds));
}

// ================================
// Menu Controller
// ================================
[Authorize]
public class MenuController(IMenuService svc) : BaseApiController
{
    [HttpGet("poi/{poiId}")]
    public async Task<IActionResult> GetByPOI(int poiId)
        => ApiResult(await svc.GetByPOIAsync(poiId));

    [HttpPost("poi/{poiId}")]
    public async Task<IActionResult> Create(int poiId, [FromBody] CreateMenuItemRequest req)
        => ApiResult(await svc.CreateAsync(poiId, req));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateMenuItemRequest req)
        => ApiResult(await svc.UpdateAsync(id, req));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id));

    [HttpPatch("{id}/toggle-available")]
    public async Task<IActionResult> ToggleAvailable(int id)
        => ApiResult(await svc.ToggleAvailableAsync(id));

    [HttpPatch("{id}/toggle-signature")]
    public async Task<IActionResult> ToggleSignature(int id)
        => ApiResult(await svc.ToggleSignatureAsync(id));

    [HttpPost("{id}/upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file)
    {
        using var stream = file.OpenReadStream();
        return ApiResult(await svc.UploadImageAsync(id, stream, file.FileName));
    }
}

// ================================
// Users Controller
// ================================
[Authorize(Roles = "Admin")]
public class UsersController(IUserService svc) : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int page = 1, [FromQuery] int size = 10,
        [FromQuery] string? search = null, [FromQuery] string? role = null)
        => ApiResult(await svc.GetListAsync(page, size, search, role));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => ApiResult(await svc.GetByIdAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
        => ApiResult(await svc.CreateAsync(req));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest req)
        => ApiResult(await svc.UpdateAsync(id, req));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id));

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
        => ApiResult(await svc.ToggleActiveAsync(id));

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id)
        => ApiResult(await svc.ResetPasswordAsync(id));
}

// ================================
// ================================
// Dashboard Controller
// ================================
/// <summary>
/// Dashboard stats endpoint - accessible by both Admin and Vendor.
/// Vendor scoping is done via a fresh DB query (not JWT claim) so newly
/// assigned shops are visible immediately without re-login.
/// </summary>
[Authorize(Roles = "Admin,Vendor")]
public class DashboardController(IDashboardService svc, IUserService userSvc) : BaseApiController
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
        => ApiResult(await svc.GetStatsAsync(await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("top-pois")]
    public async Task<IActionResult> GetTopPOIs([FromQuery] int count = 5)
        => ApiResult(await svc.GetTopPOIsAsync(count, await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("visits-chart")]
    public async Task<IActionResult> GetVisitsChart([FromQuery] DateTime from, [FromQuery] DateTime to)
        => ApiResult(await svc.GetVisitsChartAsync(from, to, await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("language-stats")]
    public async Task<IActionResult> GetLanguageStats()
        => ApiResult(await svc.GetLanguageStatsAsync(await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity([FromQuery] int count = 10)
        => ApiResult(await svc.GetRecentActivityAsync(count, await GetVendorPOIIdsAsync(userSvc)));
}

// ================================
// Analytics Controller
// ================================
/// <summary>
/// Detailed analytics - accessible by Admin and Vendor.
/// Vendor scoping is done via a fresh DB query (not JWT claim) so newly
/// assigned shops are visible immediately without re-login.
/// </summary>
[Authorize(Roles = "Admin,Vendor")]
public class AnalyticsController(IAnalyticsService svc, IUserService userSvc) : BaseApiController
{
    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends([FromQuery] string period = "30d")
        => ApiResult(await svc.GetTrendsAsync(period, await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("visits-by-day")]
    public async Task<IActionResult> GetVisitsByDay([FromQuery] DateTime from, [FromQuery] DateTime to)
        => ApiResult(await svc.GetVisitsByDayAsync(from, to, await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("visits-by-hour")]
    public async Task<IActionResult> GetVisitsByHour([FromQuery] DateTime date)
        => ApiResult(await svc.GetVisitsByHourAsync(date, await GetVendorPOIIdsAsync(userSvc)));

    [HttpGet("language-distribution")]
    public async Task<IActionResult> GetLanguages([FromQuery] DateTime from, [FromQuery] DateTime to)
        => ApiResult(await svc.GetLanguageDistributionAsync(from, to, await GetVendorPOIIdsAsync(userSvc)));
}

// ================================
// Offline Packages Controller
// ================================
public class OfflinePackagesController(IOfflinePackageService svc, IFileStorageService fileStorage) : BaseApiController
{
    /// <summary>Public catalog of Active packages for mobile download (no auth).</summary>
    [HttpGet("catalog")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCatalog()
        => ApiResult(await svc.GetPublicCatalogAsync());

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
        => ApiResult(await svc.GetAllAsync());

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreatePackageRequest req)
        => ApiResult(await svc.CreateAsync(req));

    [HttpPost("{id}/build")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Build(int id)
        => ApiResult(await svc.BuildAsync(id));

    [HttpGet("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetStatus(int id)
        => ApiResult(await svc.GetStatusAsync(id));

    /// <summary>
    /// Download offline ZIP package.
    /// - S3: redirects to a presigned download URL (60-min expiry) for large file efficiency.
    /// - Local: streams the file through the API.
    /// </summary>
    [HttpGet("{id}/download")]
    [AllowAnonymous]
    public async Task<IActionResult> Download(int id)
    {
        var pkg = await svc.GetStatusAsync(id);
        if (!pkg.Success || pkg.Data == null) return NotFound();

        // If cloud storage is active and the package has an S3 key, redirect to presigned URL
        if (fileStorage.IsCloudStorage && !string.IsNullOrWhiteSpace(pkg.Data.FilePath))
        {
            var signedUrl = fileStorage.GetSignedUrl(pkg.Data.FilePath, expiryMinutes: 60);
            return Redirect(signedUrl);
        }

        var stream = await svc.DownloadAsync(id);
        if (stream == null) return NotFound();
        return File(stream, "application/zip", $"vk-offline-{id}.zip");
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id));
}

// ================================
// Settings Controller
// ================================
[Authorize(Roles = "Admin")]
public class SettingsController(ISettingsService svc) : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => ApiResult(await svc.GetAllAsync());

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] SystemSettingsDto settings)
        => ApiResult(await svc.UpdateAsync(settings));

    [HttpPut("maintenance")]
    public async Task<IActionResult> SetMaintenance([FromBody] bool enabled)
        => ApiResult(await svc.SetMaintenanceModeAsync(enabled));

    [HttpPost("generate-api-key")]
    public async Task<IActionResult> GenerateApiKey()
        => ApiResult(await svc.GenerateApiKeyAsync());
}

// ================================
// Sync Controller (for Mobile App)
// ================================
[Route("api/v1/sync")]
public class SyncController(ISyncService svc) : BaseApiController
{
    [HttpGet("delta")]
    [Authorize]
    public async Task<IActionResult> GetDelta([FromQuery] DateTime since, [FromQuery] int langId)
        => ApiResult(await svc.GetDeltaAsync(since, langId));

    [HttpPost("visits")]
    [Authorize]
    public async Task<IActionResult> UploadVisits([FromBody] VisitBatchRequest req)
        => ApiResult(await svc.UploadVisitsAsync(req, GetUserId()));
}
