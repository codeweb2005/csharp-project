using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class MediaService : IMediaService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly ILogger<MediaService> _logger;

    public MediaService(AppDbContext db, IFileStorageService storage, ILogger<MediaService> logger)
    {
        _db = db;
        _storage = storage;
        _logger = logger;
    }

    public async Task<ApiResponse<List<MediaDto>>> GetByPOIAsync(int poiId)
    {
        var media = await _db.POIMedia
            .Where(m => m.POIId == poiId)
            .OrderBy(m => m.SortOrder)
            .AsNoTracking()
            .ToListAsync();

        var dtos = media.Select(m => new MediaDto
        {
            Id = m.Id,
            FilePath = m.FilePath,
            Url = _storage.GetFileUrl(m.FilePath),
            Caption = m.Caption,
            MediaType = m.MediaType.ToString(),
            IsPrimary = m.IsPrimary,
            SortOrder = m.SortOrder,
            FileSize = m.FileSize
        }).ToList();

        return ApiResponse<List<MediaDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<MediaDto>> UploadAsync(
        int poiId, Stream file, string fileName, string? caption, bool isPrimary)
    {
        if (!await _db.POIs.AnyAsync(p => p.Id == poiId))
            return ApiResponse<MediaDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        var filePath = await _storage.UploadAsync(file, fileName, $"media/poi-{poiId}");

        // Detect media type from extension
        var ext = Path.GetExtension(fileName).ToLower();
        var mediaType = ext is ".mp4" or ".webm" or ".mov" ? MediaType.Video : MediaType.Image;

        // If setting as primary, unset others
        if (isPrimary)
        {
            var existing = await _db.POIMedia.Where(m => m.POIId == poiId && m.IsPrimary).ToListAsync();
            foreach (var e in existing) e.IsPrimary = false;
        }

        var maxOrder = await _db.POIMedia
            .Where(m => m.POIId == poiId)
            .MaxAsync(m => (int?)m.SortOrder) ?? 0;

        var media = new POIMedia
        {
            POIId = poiId,
            FilePath = filePath,
            Caption = caption,
            MediaType = mediaType,
            IsPrimary = isPrimary,
            SortOrder = maxOrder + 1,
            FileSize = file.Length
        };

        _db.POIMedia.Add(media);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Media uploaded for POI {PoiId}: {Id}", poiId, media.Id);

        return ApiResponse<MediaDto>.Ok(new MediaDto
        {
            Id = media.Id,
            FilePath = media.FilePath,
            Url = _storage.GetFileUrl(media.FilePath),
            Caption = media.Caption,
            MediaType = media.MediaType.ToString(),
            IsPrimary = media.IsPrimary,
            SortOrder = media.SortOrder,
            FileSize = media.FileSize
        });
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var media = await _db.POIMedia.FindAsync(id);
        if (media == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy media");

        try { await _storage.DeleteAsync(media.FilePath); } catch { /* log */ }

        _db.POIMedia.Remove(media);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Media deleted: {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> SetPrimaryAsync(int id)
    {
        var media = await _db.POIMedia.FindAsync(id);
        if (media == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy media");

        // Unset all primaries for this POI
        var siblings = await _db.POIMedia
            .Where(m => m.POIId == media.POIId)
            .ToListAsync();

        foreach (var s in siblings)
            s.IsPrimary = s.Id == id;

        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ReorderAsync(int poiId, List<int> orderedIds)
    {
        var mediaItems = await _db.POIMedia
            .Where(m => m.POIId == poiId)
            .ToListAsync();

        for (int i = 0; i < orderedIds.Count; i++)
        {
            var item = mediaItems.FirstOrDefault(m => m.Id == orderedIds[i]);
            if (item != null)
                item.SortOrder = i + 1;
        }

        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }
}
