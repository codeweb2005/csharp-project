using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class OfflinePackageService : IOfflinePackageService
{
    private readonly AppDbContext _db;
    private readonly ILogger<OfflinePackageService> _logger;

    public OfflinePackageService(AppDbContext db, ILogger<OfflinePackageService> logger)
    {
        _db = db;
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

    public async Task<ApiResponse<OfflinePackageDto>> CreateAsync(CreatePackageRequest request)
    {
        // Check if package for this language already exists
        if (await _db.OfflinePackages.AnyAsync(p => p.LanguageId == request.LanguageId))
            return ApiResponse<OfflinePackageDto>.Fail("VALIDATION_ERROR",
                "Gói offline cho ngôn ngữ này đã tồn tại");

        // Count resources for this language
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
        var package = await _db.OfflinePackages.FindAsync(id);
        if (package == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy gói offline");

        if (package.Status == PackageStatus.Building)
            return ApiResponse<bool>.Fail("VALIDATION_ERROR", "Gói đang được tạo");

        // In production, this would trigger a background job.
        // For now, simulate: set to building, then mark as active.
        package.Status = PackageStatus.Building;
        package.Progress = 0;
        package.CurrentStep = "Đang chuẩn bị...";
        await _db.SaveChangesAsync();

        // Simulate build completion (in production, use BackgroundService/Hangfire)
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(2000);
                using var scope = new AppDbContext(
                    new DbContextOptionsBuilder<AppDbContext>()
                        .Options); // Note: This is a placeholder.
                // In production, resolve from DI scope
            }
            catch { /* log error */ }
        });

        // For demo purposes, immediately mark as active
        package.Status = PackageStatus.Active;
        package.Progress = 100;
        package.CurrentStep = "Hoàn thành";
        package.FilePath = $"packages/offline-{id}-{package.LanguageId}.zip";
        package.FileSize = (package.AudioCount * 2_000_000L) + (package.ImageCount * 300_000L);
        package.Checksum = Guid.NewGuid().ToString("N")[..12];
        await _db.SaveChangesAsync();

        _logger.LogInformation("Offline package built: {Id}", id);
        return ApiResponse<bool>.Ok(true);
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

        // Increment download count
        package.DownloadCount++;
        await _db.SaveChangesAsync();

        // In production, return actual file stream from storage
        // For now, return empty stream
        return new MemoryStream();
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var package = await _db.OfflinePackages.FindAsync(id);
        if (package == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy gói offline");

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
        Checksum = p.Checksum,
        DownloadCount = p.DownloadCount,
        POICount = p.POICount,
        AudioCount = p.AudioCount,
        ImageCount = p.ImageCount,
        UpdatedAt = p.UpdatedAt
    };
}
