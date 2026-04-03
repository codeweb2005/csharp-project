using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class SyncService : ISyncService
{
    private readonly AppDbContext _db;

    public SyncService(AppDbContext db) => _db = db;

    public async Task<ApiResponse<SyncDeltaResponse>> GetDeltaAsync(DateTime since, int languageId)
    {
        var serverTime = DateTime.UtcNow;

        // POIs updated since 'since'
        var updatedPOIs = await _db.POIs
            .Include(p => p.Translations.Where(t => t.LanguageId == languageId))
            .Include(p => p.Category).ThenInclude(c => c.Translations)
            .Include(p => p.Media.Where(m => m.IsPrimary))
            .Include(p => p.AudioNarrations.Where(a => a.LanguageId == languageId))
            .Where(p => p.UpdatedAt >= since && p.IsActive)
            .AsNoTracking()
            .ToListAsync();

        var poiDtos = updatedPOIs.Select(p => new POIListDto
        {
            Id = p.Id,
            Name = p.Translations.Select(t => t.Name).FirstOrDefault() ?? "",
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
            PrimaryImageUrl = p.Media.FirstOrDefault()?.FilePath,
            AudioCount = p.AudioNarrations.Count,
            TranslationCount = p.Translations.Count,
            CreatedAt = p.CreatedAt
        }).ToList();

        // Categories
        var updatedCats = await _db.Categories
            .Include(c => c.Translations.Where(t => t.LanguageId == languageId))
            .Where(c => c.UpdatedAt >= since)
            .AsNoTracking()
            .ToListAsync();

        var catDtos = updatedCats.Select(c => new CategoryDto
        {
            Id = c.Id,
            Icon = c.Icon,
            Color = c.Color,
            SortOrder = c.SortOrder,
            IsActive = c.IsActive,
            Translations = c.Translations.Select(t => new CategoryTranslationDto
            {
                LanguageId = t.LanguageId,
                Name = t.Name
            }).ToList()
        }).ToList();

        // Audio
        var updatedAudio = await _db.AudioNarrations
            .Include(a => a.Language)
            .Where(a => a.LanguageId == languageId && a.UpdatedAt >= since && a.IsActive)
            .AsNoTracking()
            .ToListAsync();

        var audioDtos = updatedAudio.Select(a => new AudioDto
        {
            Id = a.Id,
            POIId = a.POIId,
            LanguageId = a.LanguageId,
            LanguageName = a.Language.Name,
            FlagEmoji = a.Language.FlagEmoji,
            FilePath = a.FilePath,
            VoiceType = a.VoiceType.ToString(),
            VoiceName = a.VoiceName,
            Duration = a.Duration,
            FileSize = a.FileSize,
            IsDefault = a.IsDefault
        }).ToList();

        // Menu items
        var updatedMenu = await _db.MenuItems
            .Include(m => m.Translations.Where(t => t.LanguageId == languageId))
            .Where(m => m.UpdatedAt >= since)
            .AsNoTracking()
            .ToListAsync();

        var menuDtos = updatedMenu.Select(m => new MenuItemDto
        {
            Id = m.Id,
            POIId = m.POIId,
            Price = m.Price,
            ImageUrl = m.ImagePath,
            IsSignature = m.IsSignature,
            IsAvailable = m.IsAvailable,
            SortOrder = m.SortOrder,
            Name = m.Translations.Select(t => t.Name).FirstOrDefault() ?? "",
            Description = m.Translations.Select(t => t.Description).FirstOrDefault(),
            Translations = m.Translations.Select(t => new MenuTranslationDto
            {
                LanguageId = t.LanguageId,
                Name = t.Name,
                Description = t.Description
            }).ToList()
        }).ToList();

        return ApiResponse<SyncDeltaResponse>.Ok(new SyncDeltaResponse
        {
            ServerTime = serverTime,
            POIs = new SyncGroup<POIListDto> { Updated = poiDtos, Deleted = [] },
            Categories = new SyncGroup<CategoryDto> { Updated = catDtos, Deleted = [] },
            Audio = new SyncGroup<AudioDto> { Updated = audioDtos, Deleted = [] },
            Menu = new SyncGroup<MenuItemDto> { Updated = menuDtos, Deleted = [] }
        });
    }

    public async Task<ApiResponse<int>> UploadVisitsAsync(VisitBatchRequest request, int? userId)
    {
        var visits = request.Visits.Select(v => new VisitHistory
        {
            POIId = v.POIId,
            UserId = userId,
            LanguageId = v.LanguageId,
            TriggerType = Enum.TryParse<TriggerType>(v.TriggerType, true, out var tt) ? tt : TriggerType.Manual,
            NarrationPlayed = v.NarrationPlayed,
            ListenDuration = v.ListenDuration,
            VisitedAt = v.VisitedAt,
            Latitude = v.Latitude,
            Longitude = v.Longitude
        }).ToList();

        _db.VisitHistory.AddRange(visits);

        // Update POI visit counts
        var poiVisitCounts = visits.GroupBy(v => v.POIId).ToDictionary(g => g.Key, g => g.Count());
        foreach (var (poiId, count) in poiVisitCounts)
        {
            var poi = await _db.POIs.FindAsync(poiId);
            if (poi != null) poi.TotalVisits += count;
        }

        await _db.SaveChangesAsync();
        return ApiResponse<int>.Ok(visits.Count);
    }
}
