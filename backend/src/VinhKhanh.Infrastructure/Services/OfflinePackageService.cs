using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class OfflinePackageService : IOfflinePackageService
{
    private static readonly JsonSerializerOptions ManifestJsonOpt = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly AppDbContext _db;
    private readonly IFileStorageService _files;
    private readonly ILogger<OfflinePackageService> _logger;

    public OfflinePackageService(
        AppDbContext db,
        IFileStorageService files,
        ILogger<OfflinePackageService> logger)
    {
        _db = db;
        _files = files;
        _logger = logger;
    }

    public async Task<ApiResponse<List<OfflinePackageDto>>> GetAllAsync()
    {
        var packages = await _db.OfflinePackages
            .Include(p => p.Language)
            .OrderBy(p => p.Language.SortOrder)
            .AsNoTracking()
            .ToListAsync();

        var dtos = packages.Select(MapToDto).ToList();
        return ApiResponse<List<OfflinePackageDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<List<OfflinePackageCatalogItemDto>>> GetPublicCatalogAsync()
    {
        var packages = await _db.OfflinePackages
            .Include(p => p.Language)
            .Where(p => p.Status == PackageStatus.Active
                        && !string.IsNullOrWhiteSpace(p.FilePath)
                        && !string.IsNullOrWhiteSpace(p.Checksum))
            .OrderBy(p => p.Language.SortOrder)
            .AsNoTracking()
            .ToListAsync();

        var list = packages.Select(p => new OfflinePackageCatalogItemDto
        {
            Id = p.Id,
            LanguageId = p.LanguageId,
            LanguageName = p.Language?.NativeName ?? "",
            FlagEmoji = p.Language?.FlagEmoji ?? "",
            Name = p.Name,
            Version = p.Version,
            FileSize = p.FileSize,
            Checksum = p.Checksum,
            POICount = p.POICount,
            AudioCount = p.AudioCount,
            UpdatedAt = p.UpdatedAt
        }).ToList();

        return ApiResponse<List<OfflinePackageCatalogItemDto>>.Ok(list);
    }

    public async Task<ApiResponse<OfflinePackageDto>> CreateAsync(CreatePackageRequest request)
    {
        if (await _db.OfflinePackages.AnyAsync(p => p.LanguageId == request.LanguageId))
            return ApiResponse<OfflinePackageDto>.Fail("VALIDATION_ERROR",
                "Gói offline cho ngôn ngữ này đã tồn tại");

        var poiCount = await _db.POIs.CountAsync(p => p.IsActive);
        var audioCount = await _db.AudioNarrations
            .CountAsync(a => a.LanguageId == request.LanguageId && a.IsActive);
        var imageCount = await _db.POIMedia.CountAsync();

        var package = new OfflinePackage
        {
            LanguageId = request.LanguageId,
            Name = request.Name,
            Version = request.Version,
            Status = PackageStatus.Draft,
            Progress = 0,
            POICount = poiCount,
            AudioCount = audioCount,
            ImageCount = imageCount
        };

        _db.OfflinePackages.Add(package);
        await _db.SaveChangesAsync();

        var created = await _db.OfflinePackages
            .Include(p => p.Language)
            .FirstAsync(p => p.Id == package.Id);

        _logger.LogInformation("Offline package created: {Id} for language {LangId}", package.Id, request.LanguageId);
        return ApiResponse<OfflinePackageDto>.Ok(MapToDto(created));
    }

    public async Task<ApiResponse<bool>> BuildAsync(int id)
    {
        var package = await _db.OfflinePackages
            .Include(p => p.Language)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (package == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy gói offline");

        if (package.Status == PackageStatus.Building)
            return ApiResponse<bool>.Fail("VALIDATION_ERROR", "Gói đang được tạo");

        package.Status = PackageStatus.Building;
        package.Progress = 50;
        package.CurrentStep = "Building ZIP...";
        await _db.SaveChangesAsync();

        var oldKey = package.FilePath;

        try
        {
            await using var zipMs = new MemoryStream();
            var (checksum, byteLen) = await WriteOfflineZipAsync(package, zipMs);
            zipMs.Position = 0;

            if (!string.IsNullOrWhiteSpace(oldKey))
            {
                try { await _files.DeleteAsync(oldKey); }
                catch (Exception ex) { _logger.LogWarning(ex, "Could not delete old package file {Key}", oldKey); }
            }

            var storageKey = await _files.UploadAsync(zipMs, $"offline-{package.Id}-{package.LanguageId}.zip",
                "offline-packages");

            package.FilePath = storageKey;
            package.FileSize = byteLen;
            package.Checksum = checksum;
            package.Status = PackageStatus.Active;
            package.Progress = 100;
            package.CurrentStep = "Hoàn thành";
            package.POICount = await _db.POIs.CountAsync(p => p.IsActive);
            package.AudioCount = await _db.AudioNarrations
                .CountAsync(a => a.LanguageId == package.LanguageId && a.IsActive);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Offline package built: {Id}, {Bytes} bytes, checksum {Sum}", id, byteLen, checksum);
            return ApiResponse<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Offline package build failed: {Id}", id);
            package.Status = PackageStatus.Draft;
            package.Progress = 0;
            package.CurrentStep = "Build failed";
            await _db.SaveChangesAsync();
            return ApiResponse<bool>.Fail("BUILD_ERROR", ex.Message);
        }
    }

    private async Task<(string checksum, long byteLength)> WriteOfflineZipAsync(OfflinePackage package, MemoryStream zipMs)
    {
        var langId = package.LanguageId;
        var langCode = package.Language?.Code ?? await _db.Languages.AsNoTracking()
            .Where(l => l.Id == langId)
            .Select(l => l.Code)
            .FirstOrDefaultAsync() ?? "vi";

        var pois = await _db.POIs.AsNoTracking()
            .Include(p => p.Category).ThenInclude(c => c.Translations)
            .Include(p => p.Translations)
            .Include(p => p.AudioNarrations)
            .Where(p => p.IsActive)
            .ToListAsync();

        var manifestPois = new List<ManifestPoi>();
        var checksum = "";
        await using (var zip = new ZipArchive(zipMs, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var poi in pois)
            {
                var tr = poi.Translations.FirstOrDefault(t => t.LanguageId == langId)
                         ?? poi.Translations.OrderBy(t => t.LanguageId).FirstOrDefault();
                var catTr = poi.Category.Translations.FirstOrDefault(t => t.LanguageId == langId)
                            ?? poi.Category.Translations.OrderBy(t => t.LanguageId).FirstOrDefault();
                var audio = poi.AudioNarrations.FirstOrDefault(a => a.LanguageId == langId && a.IsActive);
                string? audioEntry = null;
                int? audioNarrationId = null;

                if (audio != null && !string.IsNullOrWhiteSpace(audio.FilePath))
                {
                    var audioStream = await _files.GetFileAsync(audio.FilePath);
                    if (audioStream != null)
                    {
                        await using (audioStream)
                        {
                            audioEntry = $"audio/{audio.Id}.mp3";
                            audioNarrationId = audio.Id;
                            var ze = zip.CreateEntry(audioEntry, CompressionLevel.Fastest);
                            await using var zeStream = ze.Open();
                            await audioStream.CopyToAsync(zeStream);
                        }
                    }
                }

                manifestPois.Add(new ManifestPoi
                {
                    Id = poi.Id,
                    Name = tr?.Name ?? "",
                    Address = poi.Address,
                    Latitude = poi.Latitude,
                    Longitude = poi.Longitude,
                    GeofenceRadius = poi.GeofenceRadius,
                    Priority = poi.Priority,
                    CategoryIcon = poi.Category.Icon,
                    CategoryName = catTr?.Name ?? "",
                    NarrationText = tr?.NarrationText,
                    LanguageCode = langCode,
                    AudioNarrationId = audioNarrationId,
                    AudioEntry = audioEntry
                });
            }

            var forHash = new
            {
                schemaVersion = 1,
                packageId = package.Id,
                languageId = langId,
                languageCode = langCode,
                version = package.Version,
                generatedAtUtc = DateTime.UtcNow,
                pois = manifestPois
            };
            var jsonForHash = JsonSerializer.Serialize(forHash, ManifestJsonOpt);
            checksum = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(jsonForHash))).ToLowerInvariant();

            var final = new
            {
                schemaVersion = 1,
                packageId = package.Id,
                languageId = langId,
                languageCode = langCode,
                version = package.Version,
                generatedAtUtc = DateTime.UtcNow,
                contentChecksum = checksum,
                pois = manifestPois
            };
            var jsonFinal = JsonSerializer.Serialize(final, ManifestJsonOpt);
            var m = zip.CreateEntry("manifest.json", CompressionLevel.Optimal);
            await using (var mw = m.Open())
                await mw.WriteAsync(Encoding.UTF8.GetBytes(jsonFinal));
        }

        return (checksum, zipMs.Length);
    }

    public async Task<ApiResponse<OfflinePackageDto>> GetStatusAsync(int id)
    {
        var package = await _db.OfflinePackages
            .Include(p => p.Language)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (package == null)
            return ApiResponse<OfflinePackageDto>.Fail("NOT_FOUND", "Không tìm thấy gói offline");

        return ApiResponse<OfflinePackageDto>.Ok(MapToDto(package));
    }

    public async Task<Stream?> DownloadAsync(int id)
    {
        var package = await _db.OfflinePackages.FindAsync(id);
        if (package == null || package.Status != PackageStatus.Active || string.IsNullOrEmpty(package.FilePath))
            return null;

        var stream = await _files.GetFileAsync(package.FilePath);
        if (stream == null)
            return null;

        package.DownloadCount++;
        await _db.SaveChangesAsync();

        return stream;
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var package = await _db.OfflinePackages.FindAsync(id);
        if (package == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy gói offline");

        if (!string.IsNullOrWhiteSpace(package.FilePath))
        {
            try { await _files.DeleteAsync(package.FilePath); }
            catch (Exception ex) { _logger.LogWarning(ex, "Delete package file {Path}", package.FilePath); }
        }

        _db.OfflinePackages.Remove(package);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Offline package deleted: {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    private static OfflinePackageDto MapToDto(OfflinePackage p) => new()
    {
        Id = p.Id,
        LanguageId = p.LanguageId,
        LanguageName = p.Language?.NativeName ?? "",
        FlagEmoji = p.Language?.FlagEmoji ?? "",
        Name = p.Name,
        Version = p.Version,
        Status = p.Status.ToString(),
        Progress = p.Progress,
        CurrentStep = p.CurrentStep,
        FileSize = p.FileSize,
        FilePath = p.FilePath,
        Checksum = p.Checksum,
        DownloadCount = p.DownloadCount,
        POICount = p.POICount,
        AudioCount = p.AudioCount,
        ImageCount = p.ImageCount,
        UpdatedAt = p.UpdatedAt
    };

    private sealed class ManifestPoi
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Address { get; set; } = "";
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int GeofenceRadius { get; set; }
        public int Priority { get; set; }
        public string CategoryIcon { get; set; } = "";
        public string CategoryName { get; set; } = "";
        public string? NarrationText { get; set; }
        public string LanguageCode { get; set; } = "";
        public int? AudioNarrationId { get; set; }
        public string? AudioEntry { get; set; }
    }
}
