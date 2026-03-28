using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class POIService : IPOIService
{
    private readonly AppDbContext _db;
    private readonly IPOIRepository _poiRepo;
    private readonly ILogger<POIService> _logger;

    public POIService(AppDbContext db, IPOIRepository poiRepo, ILogger<POIService> logger)
    {
        _db = db;
        _poiRepo = poiRepo;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<POIListDto>>> GetListAsync(
        int page, int size, string? search, int? categoryId,
        bool? isActive, string sortBy, string order)
    {
        var (items, totalCount) = await _poiRepo.GetPagedAsync(page, size, search, categoryId, isActive, sortBy, order);

        var dtos = items.Select(p => new POIListDto
        {
            Id = p.Id,
            Name = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            CategoryName = p.Category.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            CategoryIcon = p.Category.Icon,
            CategoryColor = p.Category.Color,
            Address = p.Address,
            Latitude = p.Latitude,
            Longitude = p.Longitude,
            GeofenceRadius = p.GeofenceRadius,
            Rating = p.Rating,
            TotalVisits = p.TotalVisits,
            IsActive = p.IsActive,
            IsFeatured = p.IsFeatured,
            PrimaryImageUrl = p.Media.FirstOrDefault(m => m.IsPrimary)?.FilePath,
            AudioCount = p.AudioNarrations.Count,
            TranslationCount = p.Translations.Count,
            CreatedAt = p.CreatedAt
        }).ToList();

        return ApiResponse<PagedResult<POIListDto>>.Ok(new PagedResult<POIListDto>
        {
            Items = dtos,
            Pagination = new PaginationInfo { Page = page, Size = size, TotalItems = totalCount }
        });
    }

    public async Task<ApiResponse<POIDetailDto>> GetDetailAsync(int id)
    {
        var poi = await _poiRepo.GetDetailAsync(id);
        if (poi == null)
            return ApiResponse<POIDetailDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        return ApiResponse<POIDetailDto>.Ok(MapToDetail(poi));
    }

    public async Task<ApiResponse<POIDetailDto>> CreateAsync(CreatePOIRequest request)
    {
        var poi = new POI
        {
            CategoryId = request.CategoryId,
            Address = request.Address,
            Phone = request.Phone,
            Website = request.Website,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeofenceRadius = request.GeofenceRadius,
            PriceRangeMin = request.PriceRangeMin,
            PriceRangeMax = request.PriceRangeMax,
            OpeningHours = request.OpeningHours,
            VendorUserId = request.VendorUserId,
            IsFeatured = request.IsFeatured,
            IsActive = true,
            Translations = request.Translations.Select(t => new POITranslation
            {
                LanguageId = t.LanguageId,
                Name = t.Name,
                ShortDescription = t.ShortDescription,
                FullDescription = t.FullDescription,
                NarrationText = t.NarrationText,
                Highlights = t.Highlights != null ? System.Text.Json.JsonSerializer.Serialize(t.Highlights) : null
            }).ToList()
        };

        await _poiRepo.AddAsync(poi);
        _logger.LogInformation("POI created: {Id}", poi.Id);

        var detail = await _poiRepo.GetDetailAsync(poi.Id);
        return ApiResponse<POIDetailDto>.Ok(MapToDetail(detail!));
    }

    /// <inheritdoc />
    public async Task<ApiResponse<POIDetailDto>> UpdateAsync(
        int id, UpdatePOIRequest request, int? callerId = null, string? callerRole = null)
    {
        var poi = await _db.POIs
            .Include(p => p.Translations)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (poi == null)
            return ApiResponse<POIDetailDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        // ── Vendor ownership guard ──────────────────────────────────────
        // A Vendor may only update the POI that is linked to their user account.
        // Admins bypass this check (callerRole != "Vendor").
        if (callerRole == "Vendor" && poi.VendorUserId != callerId)
        {
            _logger.LogWarning(
                "Vendor {UserId} attempted to edit POI {POIId} which belongs to Vendor {OwnerUserId}",
                callerId, id, poi.VendorUserId);
            return ApiResponse<POIDetailDto>.Fail("FORBIDDEN",
                "Bạn chỉ có thể chỉnh sửa thông tin quán của mình."); // You can only edit your own shop
        }

        // ── Apply updates ───────────────────────────────────────────────
        poi.CategoryId    = request.CategoryId;
        poi.Address       = request.Address;
        poi.Phone         = request.Phone;
        poi.Website       = request.Website;
        poi.Latitude      = request.Latitude;
        poi.Longitude     = request.Longitude;
        poi.GeofenceRadius= request.GeofenceRadius;
        poi.Priority      = request.Priority;      // for geofence conflict resolution
        poi.PriceRangeMin = request.PriceRangeMin;
        poi.PriceRangeMax = request.PriceRangeMax;
        poi.OpeningHours  = request.OpeningHours;
        poi.IsFeatured    = request.IsFeatured;

        // Only Admin can reassign VendorUserId; Vendor cannot change their own link
        if (callerRole != "Vendor")
            poi.VendorUserId = request.VendorUserId;

        // Update translations: remove old, add new
        _db.POITranslations.RemoveRange(poi.Translations);
        poi.Translations = request.Translations.Select(t => new POITranslation
        {
            POIId            = id,
            LanguageId       = t.LanguageId,
            Name             = t.Name,
            ShortDescription = t.ShortDescription,
            FullDescription  = t.FullDescription,
            NarrationText    = t.NarrationText,
            Highlights       = t.Highlights != null
                               ? System.Text.Json.JsonSerializer.Serialize(t.Highlights)
                               : null
        }).ToList();

        await _db.SaveChangesAsync();
        _logger.LogInformation("POI {Id} updated by user {UserId} (role: {Role})", id, callerId, callerRole);

        var detail = await _poiRepo.GetDetailAsync(id);
        return ApiResponse<POIDetailDto>.Ok(MapToDetail(detail!));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id, int? callerId = null, string? callerRole = null)
    {
        var poi = await _poiRepo.GetByIdAsync(id);
        if (poi == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy POI");

        // Vendor can only delete their own POI
        if (callerRole == "Vendor" && poi.VendorUserId != callerId)
        {
            _logger.LogWarning("Vendor {UserId} attempted to delete POI {POIId} owned by {OwnerId}", callerId, id, poi.VendorUserId);
            return ApiResponse<bool>.Fail("FORBIDDEN", "Bạn chỉ có thể xóa quán của mình.");
        }

        await _poiRepo.DeleteAsync(poi);
        _logger.LogInformation("POI {Id} deleted by user {UserId} (role: {Role})", id, callerId, callerRole);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleActiveAsync(int id)
    {
        var poi = await _poiRepo.GetByIdAsync(id);
        if (poi == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy POI");

        poi.IsActive = !poi.IsActive;
        await _poiRepo.UpdateAsync(poi);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleFeaturedAsync(int id)
    {
        var poi = await _poiRepo.GetByIdAsync(id);
        if (poi == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "POI not found");

        poi.IsFeatured = !poi.IsFeatured;
        await _poiRepo.UpdateAsync(poi);
        return ApiResponse<bool>.Ok(true);
    }

    /// <summary>
    /// Finds all active POIs within a radius of the given GPS coordinates.
    ///
    /// Algorithm:
    /// 1. Use MySQL ST_Distance_Sphere(point(lng, lat), point(POI.lng, POI.lat))
    ///    for precise great-circle distance calculation (returns meters).
    /// 2. Load candidate POIs within radiusMeters and filter IsActive = true.
    /// 3. Cap radius at 5000m to prevent abuse / excessive data transfer.
    /// 4. Filter translations to the requested language (or return all if langId is null).
    /// 5. Sort by distance ascending so nearest POIs come first.
    ///
    /// This endpoint is called by the mobile app on startup to load all POIs
    /// for the local geofence engine. The default radius (500m) covers a typical
    /// food street block; increase it if the area is larger.
    /// </summary>
    public async Task<ApiResponse<List<NearbyPOIDto>>> GetNearbyAsync(
        double lat, double lng, int radiusMeters, int? langId)
    {
        // Enforce a maximum radius to prevent excessive data loads
        const int MaxRadiusMeters = 5000;
        if (radiusMeters > MaxRadiusMeters)
            radiusMeters = MaxRadiusMeters;

        // Use raw SQL with MySQL spatial function for accurate distance calculation.
        // ST_Distance_Sphere returns distance in meters between two points.
        // Note: MySQL point() takes (longitude, latitude) — not (lat, lng).
        var sql = $@"
            SELECT p.Id,
                   ST_Distance_Sphere(
                       point(p.Longitude, p.Latitude),
                       point({lng}, {lat})
                   ) AS DistanceMeters
            FROM POIs p
            WHERE p.IsActive = 1
              AND ST_Distance_Sphere(
                       point(p.Longitude, p.Latitude),
                       point({lng}, {lat})
                  ) <= {radiusMeters}
            ORDER BY DistanceMeters ASC";

        // Get IDs + distances via raw query, then load full entities via EF
        var distanceResults = await _db.Database
            .SqlQueryRaw<PoiDistanceResult>(sql)
            .ToListAsync();

        if (distanceResults.Count == 0)
            return ApiResponse<List<NearbyPOIDto>>.Ok([]);

        var poiIds = distanceResults.Select(r => r.Id).ToList();
        var distanceMap = distanceResults.ToDictionary(r => r.Id, r => r.DistanceMeters);

        // Load full POI data with all related entities
        var pois = await _db.POIs
            .Where(p => poiIds.Contains(p.Id))
            .Include(p => p.Category)
                .ThenInclude(c => c.Translations)
            .Include(p => p.Translations.Where(t => langId == null || t.LanguageId == langId))
                .ThenInclude(t => t.Language)
            .Include(p => p.AudioNarrations.Where(a => a.IsActive &&
                          (langId == null || a.LanguageId == langId)))
                .ThenInclude(a => a.Language)
            .Include(p => p.Media.Where(m => m.IsPrimary))
            .ToListAsync();

        // Map to DTOs and sort by distance
        var dtos = pois.Select(p => new NearbyPOIDto
        {
            Id = p.Id,
            Name = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            CategoryName = p.Category?.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            CategoryIcon = p.Category?.Icon ?? "",
            CategoryColor = p.Category?.Color ?? "",
            Address = p.Address,
            Latitude = p.Latitude,
            Longitude = p.Longitude,
            GeofenceRadius = p.GeofenceRadius,
            Priority = p.Priority,
            Rating = p.Rating,
            TotalVisits = p.TotalVisits,
            IsActive = p.IsActive,
            IsFeatured = p.IsFeatured,
            PrimaryImageUrl = p.Media.FirstOrDefault(m => m.IsPrimary)?.FilePath,
            AudioCount = p.AudioNarrations.Count,
            TranslationCount = p.Translations.Count,
            CreatedAt = p.CreatedAt,
            DistanceMeters = distanceMap.GetValueOrDefault(p.Id),
            Translations = p.Translations.Select(t => new POITranslationDto
            {
                Id = t.Id,
                LanguageId = t.LanguageId,
                LanguageCode = t.Language?.Code ?? "",
                LanguageName = t.Language?.Name ?? "",
                FlagEmoji = t.Language?.FlagEmoji ?? "",
                Name = t.Name,
                ShortDescription = t.ShortDescription,
                FullDescription = t.FullDescription,
                NarrationText = t.NarrationText,
                Highlights = !string.IsNullOrEmpty(t.Highlights)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(t.Highlights)
                    : null
            }).ToList(),
            Audio = p.AudioNarrations.Select(a => new AudioDto
            {
                Id = a.Id,
                POIId = a.POIId,
                LanguageId = a.LanguageId,
                LanguageName = a.Language?.Name ?? "",
                FlagEmoji = a.Language?.FlagEmoji ?? "",
                FilePath = a.FilePath,
                VoiceType = a.VoiceType.ToString(),
                VoiceName = a.VoiceName,
                Duration = a.Duration,
                FileSize = a.FileSize,
                IsDefault = a.IsDefault
            }).ToList()
        })
        .OrderBy(dto => dto.DistanceMeters)
        .ToList();

        _logger.LogDebug(
            "Nearby POIs at ({Lat},{Lng}) radius={Radius}m → {Count} results",
            lat, lng, radiusMeters, dtos.Count);

        return ApiResponse<List<NearbyPOIDto>>.Ok(dtos);
    }

    /// <summary>
    /// Returns full POI detail for anonymous mobile access.
    /// - Only returns POIs where IsActive = true (inactive POIs return 404).
    /// - Optionally filters translations and audio to a single language.
    /// - Used by the tourist mobile app; no JWT token required.
    /// </summary>
    public async Task<ApiResponse<POIDetailDto>> GetPublicDetailAsync(int id, int? langId)
    {
        // Only fetch active POIs — inactive ones are not visible to tourists
        var poi = await _db.POIs
            .Where(p => p.Id == id && p.IsActive)
            .Include(p => p.Category)
                .ThenInclude(c => c.Translations)
            .Include(p => p.Translations.Where(t => langId == null || t.LanguageId == langId))
                .ThenInclude(t => t.Language)
            .Include(p => p.AudioNarrations.Where(a => a.IsActive &&
                          (langId == null || a.LanguageId == langId)))
                .ThenInclude(a => a.Language)
            .Include(p => p.Media)
            .Include(p => p.MenuItems.Where(m => m.IsAvailable))
                .ThenInclude(m => m.Translations.Where(t => langId == null || t.LanguageId == langId))
            .FirstOrDefaultAsync();

        if (poi == null)
            return ApiResponse<POIDetailDto>.Fail("NOT_FOUND", "POI not found or not available");

        // Reuse the existing MapToDetail helper (it maps all related entities)
        return ApiResponse<POIDetailDto>.Ok(MapToDetail(poi));
    }


    private static POIDetailDto MapToDetail(POI p) => new()
    {
        Id = p.Id,
        Name = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
        CategoryName = p.Category?.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
        CategoryIcon = p.Category?.Icon ?? "",
        CategoryColor = p.Category?.Color ?? "",
        Address = p.Address,
        Phone = p.Phone,
        Website = p.Website,
        Latitude = p.Latitude,
        Longitude = p.Longitude,
        GeofenceRadius = p.GeofenceRadius,
        PriceRangeMin = p.PriceRangeMin,
        PriceRangeMax = p.PriceRangeMax,
        OpeningHours = p.OpeningHours,
        Rating = p.Rating,
        TotalVisits = p.TotalVisits,
        IsActive = p.IsActive,
        IsFeatured = p.IsFeatured,
        VendorUserId = p.VendorUserId,
        VendorName = p.VendorUser?.FullName,
        AudioCount = p.AudioNarrations?.Count ?? 0,
        TranslationCount = p.Translations.Count,
        CreatedAt = p.CreatedAt,
        Translations = p.Translations.Select(t => new POITranslationDto
        {
            Id = t.Id,
            LanguageId = t.LanguageId,
            LanguageCode = t.Language?.Code ?? "",
            LanguageName = t.Language?.Name ?? "",
            FlagEmoji = t.Language?.FlagEmoji ?? "",
            Name = t.Name,
            ShortDescription = t.ShortDescription,
            FullDescription = t.FullDescription,
            NarrationText = t.NarrationText,
            Highlights = !string.IsNullOrEmpty(t.Highlights)
                ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(t.Highlights)
                : null
        }).ToList(),
        Media = p.Media?.Select(m => new MediaDto
        {
            Id = m.Id,
            FilePath = m.FilePath,
            Url = m.FilePath,
            Caption = m.Caption,
            MediaType = m.MediaType.ToString(),
            IsPrimary = m.IsPrimary,
            SortOrder = m.SortOrder,
            FileSize = m.FileSize
        }).ToList() ?? [],
        Audio = p.AudioNarrations?.Select(a => new AudioDto
        {
            Id = a.Id,
            POIId = a.POIId,
            LanguageId = a.LanguageId,
            LanguageName = a.Language?.Name ?? "",
            FlagEmoji = a.Language?.FlagEmoji ?? "",
            FilePath = a.FilePath,
            VoiceType = a.VoiceType.ToString(),
            VoiceName = a.VoiceName,
            Duration = a.Duration,
            FileSize = a.FileSize,
            IsDefault = a.IsDefault
        }).ToList() ?? [],
        MenuItems = p.MenuItems?.Select(m => new MenuItemDto
        {
            Id = m.Id,
            POIId = m.POIId,
            Price = m.Price,
            ImageUrl = m.ImagePath,
            IsSignature = m.IsSignature,
            IsAvailable = m.IsAvailable,
            SortOrder = m.SortOrder,
            Name = m.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            Description = m.Translations.OrderBy(t => t.LanguageId).Select(t => t.Description).FirstOrDefault(),
            Translations = m.Translations.Select(t => new MenuTranslationDto
            {
                LanguageId = t.LanguageId,
                Name = t.Name,
                Description = t.Description
            }).ToList()
        }).ToList() ?? []
    };
}
