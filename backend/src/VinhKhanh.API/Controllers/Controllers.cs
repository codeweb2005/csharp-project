using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;

namespace VinhKhanh.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected int GetUserId() =>
        int.Parse(User.FindFirst("sub")?.Value ?? "0");

    protected string GetUserRole() =>
        User.FindFirst("role")?.Value ?? "";

    protected IActionResult ApiResult<T>(ApiResponse<T> response)
    {
        if (response.Success) return Ok(response);
        return response.Error?.Code switch
        {
            "NOT_FOUND" => NotFound(response),
            "FORBIDDEN" => StatusCode(403, response),
            "UNAUTHORIZED" => Unauthorized(response),
            "VALIDATION_ERROR" => BadRequest(response),
            _ => BadRequest(response)
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
    public async Task<IActionResult> GetMe()
        => ApiResult(await authService.GetCurrentUserAsync(GetUserId()));
}

// ================================
// POI Controller
// ================================
[Authorize]
public class POIsController(IPOIService poiService) : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int page = 1, [FromQuery] int size = 10,
        [FromQuery] string? search = null, [FromQuery] int? categoryId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string sortBy = "name", [FromQuery] string order = "asc")
        => ApiResult(await poiService.GetListAsync(page, size, search, categoryId, isActive, sortBy, order));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id)
        => ApiResult(await poiService.GetDetailAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreatePOIRequest request)
        => ApiResult(await poiService.CreateAsync(request));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePOIRequest request)
        => ApiResult(await poiService.UpdateAsync(id, request));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await poiService.DeleteAsync(id));

    [HttpPatch("{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Toggle(int id)
        => ApiResult(await poiService.ToggleActiveAsync(id));

    [HttpPatch("{id}/featured")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Featured(int id)
        => ApiResult(await poiService.ToggleFeaturedAsync(id));
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
public class AudioController(IAudioService svc) : BaseApiController
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
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GenerateTTS(int poiId, [FromBody] GenerateTTSRequest req)
        => ApiResult(await svc.GenerateTTSAsync(poiId, req));

    [HttpGet("{id}/stream")]
    [AllowAnonymous]
    public async Task<IActionResult> Stream(int id)
    {
        var stream = await svc.GetStreamAsync(id);
        if (stream == null) return NotFound();
        return File(stream, "audio/mpeg");
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
        => ApiResult(await svc.DeleteAsync(id));

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
// Dashboard Controller
// ================================
[Authorize(Roles = "Admin,Vendor")]
public class DashboardController(IDashboardService svc) : BaseApiController
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
        => ApiResult(await svc.GetStatsAsync());

    [HttpGet("top-pois")]
    public async Task<IActionResult> GetTopPOIs([FromQuery] int count = 5)
        => ApiResult(await svc.GetTopPOIsAsync(count));

    [HttpGet("visits-chart")]
    public async Task<IActionResult> GetVisitsChart([FromQuery] DateTime from, [FromQuery] DateTime to)
        => ApiResult(await svc.GetVisitsChartAsync(from, to));

    [HttpGet("language-stats")]
    public async Task<IActionResult> GetLanguageStats()
        => ApiResult(await svc.GetLanguageStatsAsync());

    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity([FromQuery] int count = 10)
        => ApiResult(await svc.GetRecentActivityAsync(count));
}

// ================================
// Analytics Controller
// ================================
[Authorize(Roles = "Admin,Vendor")]
public class AnalyticsController(IAnalyticsService svc) : BaseApiController
{
    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends([FromQuery] string period = "30d")
        => ApiResult(await svc.GetTrendsAsync(period));

    [HttpGet("visits-by-day")]
    public async Task<IActionResult> GetVisitsByDay([FromQuery] DateTime from, [FromQuery] DateTime to)
        => ApiResult(await svc.GetVisitsByDayAsync(from, to));

    [HttpGet("visits-by-hour")]
    public async Task<IActionResult> GetVisitsByHour([FromQuery] DateTime date)
        => ApiResult(await svc.GetVisitsByHourAsync(date));

    [HttpGet("language-distribution")]
    public async Task<IActionResult> GetLanguages([FromQuery] DateTime from, [FromQuery] DateTime to)
        => ApiResult(await svc.GetLanguageDistributionAsync(from, to));
}

// ================================
// Offline Packages Controller
// ================================
public class OfflinePackagesController(IOfflinePackageService svc) : BaseApiController
{
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

    [HttpGet("{id}/download")]
    [AllowAnonymous]
    public async Task<IActionResult> Download(int id)
    {
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
