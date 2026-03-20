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

    public async Task<ApiResponse<POIDetailDto>> UpdateAsync(int id, UpdatePOIRequest request)
    {
        var poi = await _db.POIs
            .Include(p => p.Translations)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (poi == null)
            return ApiResponse<POIDetailDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        poi.CategoryId = request.CategoryId;
        poi.Address = request.Address;
        poi.Phone = request.Phone;
        poi.Website = request.Website;
        poi.Latitude = request.Latitude;
        poi.Longitude = request.Longitude;
        poi.GeofenceRadius = request.GeofenceRadius;
        poi.PriceRangeMin = request.PriceRangeMin;
        poi.PriceRangeMax = request.PriceRangeMax;
        poi.OpeningHours = request.OpeningHours;
        poi.VendorUserId = request.VendorUserId;
        poi.IsFeatured = request.IsFeatured;

        // Update translations: remove old, add new
        _db.POITranslations.RemoveRange(poi.Translations);
        poi.Translations = request.Translations.Select(t => new POITranslation
        {
            POIId = id,
            LanguageId = t.LanguageId,
            Name = t.Name,
            ShortDescription = t.ShortDescription,
            FullDescription = t.FullDescription,
            NarrationText = t.NarrationText,
            Highlights = t.Highlights != null ? System.Text.Json.JsonSerializer.Serialize(t.Highlights) : null
        }).ToList();

        await _db.SaveChangesAsync();
        _logger.LogInformation("POI updated: {Id}", id);

        var detail = await _poiRepo.GetDetailAsync(id);
        return ApiResponse<POIDetailDto>.Ok(MapToDetail(detail!));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var poi = await _poiRepo.GetByIdAsync(id);
        if (poi == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy POI");

        await _poiRepo.DeleteAsync(poi);
        _logger.LogInformation("POI deleted: {Id}", id);
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
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy POI");

        poi.IsFeatured = !poi.IsFeatured;
        await _poiRepo.UpdateAsync(poi);
        return ApiResponse<bool>.Ok(true);
    }

    // ============ Mapping ============

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
