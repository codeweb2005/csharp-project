using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Sync service for the mobile app.
///
/// GetDeltaAsync:     Returns POI/audio/category/menu changes since a given timestamp.
/// UploadVisitsAsync: Fire-and-forget — enqueues visit batch to Channel&lt;T&gt; for
///   async processing by VisitIngestionService. Returns immediately so the
///   mobile app isn't blocked by DB writes.
/// </summary>
public class SyncService(
    AppDbContext db,
    Channel<VisitBatchMessage> visitChannel) : ISyncService
{
    public async Task<ApiResponse<SyncDeltaResponse>> GetDeltaAsync(DateTime since, int languageId)
    {
        var serverTime = DateTime.UtcNow;

        // AsSplitQuery() avoids Cartesian explosion when Loading multiple collections
        var updatedPOIs = await db.POIs
            .Include(p => p.Translations.Where(t => t.LanguageId == languageId))
            .Include(p => p.Category).ThenInclude(c => c.Translations)
            .Include(p => p.Media.Where(m => m.IsPrimary))
            .Include(p => p.AudioNarrations.Where(a => a.LanguageId == languageId && a.IsActive))
            .Where(p => p.UpdatedAt >= since && p.IsActive)
            .AsSplitQuery()
            .AsNoTracking()
            .ToListAsync();

        var poiDtos = updatedPOIs.Select(p => new POIListDto
        {
            Id               = p.Id,
            Name             = p.Translations.Select(t => t.Name).FirstOrDefault() ?? "",
            CategoryId       = p.CategoryId,
            CategoryName     = p.Category.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            CategoryIcon     = p.Category.Icon,
            CategoryColor    = p.Category.Color,
            Address          = p.Address,
            Latitude         = p.Latitude,
            Longitude        = p.Longitude,
            GeofenceRadius   = p.GeofenceRadius,
            Priority         = p.Priority,
            Rating           = p.Rating,
            TotalVisits      = p.TotalVisits,
            IsActive         = p.IsActive,
            IsFeatured       = p.IsFeatured,
            PrimaryImageUrl  = p.Media.FirstOrDefault()?.FilePath,
            AudioCount       = p.AudioNarrations.Count,
            TranslationCount = p.Translations.Count,
            CreatedAt        = p.CreatedAt
        }).ToList();

        var updatedCats = await db.Categories
            .Include(c => c.Translations.Where(t => t.LanguageId == languageId))
            .Where(c => c.UpdatedAt >= since)
            .AsNoTracking()
            .ToListAsync();

        var catDtos = updatedCats.Select(c => new CategoryDto
        {
            Id        = c.Id,
            Icon      = c.Icon,
            Color     = c.Color,
            SortOrder = c.SortOrder,
            IsActive  = c.IsActive,
            Translations = c.Translations.Select(t => new CategoryTranslationDto
            {
                LanguageId = t.LanguageId,
                Name       = t.Name
            }).ToList()
        }).ToList();

        var updatedAudio = await db.AudioNarrations
            .Include(a => a.Language)
            .Where(a => a.LanguageId == languageId && a.UpdatedAt >= since && a.IsActive)
            .AsNoTracking()
            .ToListAsync();

        var audioDtos = updatedAudio.Select(a => new AudioDto
        {
            Id           = a.Id,
            POIId        = a.POIId,
            LanguageId   = a.LanguageId,
            LanguageName = a.Language.Name,
            FlagEmoji    = a.Language.FlagEmoji,
            FilePath     = a.FilePath,
            VoiceType    = a.VoiceType.ToString(),
            VoiceName    = a.VoiceName,
            Duration     = a.Duration,
            FileSize     = a.FileSize,
            IsDefault    = a.IsDefault
        }).ToList();

        var updatedMenu = await db.MenuItems
            .Include(m => m.Translations.Where(t => t.LanguageId == languageId))
            .Where(m => m.UpdatedAt >= since)
            .AsNoTracking()
            .ToListAsync();

        var menuDtos = updatedMenu.Select(m => new MenuItemDto
        {
            Id          = m.Id,
            POIId       = m.POIId,
            Price       = m.Price,
            ImageUrl    = m.ImagePath,
            IsSignature = m.IsSignature,
            IsAvailable = m.IsAvailable,
            SortOrder   = m.SortOrder,
            Name        = m.Translations.Select(t => t.Name).FirstOrDefault() ?? "",
            Description = m.Translations.Select(t => t.Description).FirstOrDefault(),
            Translations = m.Translations.Select(t => new MenuTranslationDto
            {
                LanguageId  = t.LanguageId,
                Name        = t.Name,
                Description = t.Description
            }).ToList()
        }).ToList();

        return ApiResponse<SyncDeltaResponse>.Ok(new SyncDeltaResponse
        {
            ServerTime  = serverTime,
            POIs        = new SyncGroup<POIListDto>   { Updated = poiDtos,   Deleted = [] },
            Categories  = new SyncGroup<CategoryDto>  { Updated = catDtos,   Deleted = [] },
            Audio       = new SyncGroup<AudioDto>      { Updated = audioDtos, Deleted = [] },
            Menu        = new SyncGroup<MenuItemDto>   { Updated = menuDtos,  Deleted = [] }
        });
    }

    /// <summary>
    /// Fire-and-forget: enqueues the visit batch into Channel for async DB writes.
    /// Returns the count immediately — does not wait for persistence.
    /// </summary>
    public async Task<ApiResponse<int>> UploadVisitsAsync(
        VisitBatchRequest request, int? userId, string? sessionId = null)
    {
        if (request.Visits.Count == 0)
            return ApiResponse<int>.Ok(0);

        await visitChannel.Writer.WriteAsync(new VisitBatchMessage
        {
            Visits     = request.Visits,
            UserId     = userId,
            SessionId  = sessionId,
            ReceivedAt = DateTime.UtcNow
        });

        return ApiResponse<int>.Ok(request.Visits.Count);
    }

    // Interface compatibility shim (old signature without sessionId)
    public Task<ApiResponse<int>> UploadVisitsAsync(VisitBatchRequest request, int? userId)
        => UploadVisitsAsync(request, userId, sessionId: null);
}
