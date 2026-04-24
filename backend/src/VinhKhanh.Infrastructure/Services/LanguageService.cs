using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Provides language data for the mobile app's language picker (public/anonymous),
/// and full CRUD for the Admin management panel.
/// </summary>
public class LanguageService : ILanguageService
{
    private readonly AppDbContext _db;
    private readonly ILogger<LanguageService> _logger;

    public LanguageService(AppDbContext db, ILogger<LanguageService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Public (mobile) ──────────────────────────────────────────────────────

    /// <summary>
    /// Returns all active languages sorted by SortOrder.
    /// Result is small and rarely changes — consider adding response caching
    /// (e.g. IMemoryCache with 5-min expiry) in a future optimization pass.
    /// </summary>
    public async Task<ApiResponse<List<LanguageDto>>> GetAllActiveAsync()
    {
        var languages = await _db.Languages
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Name)
            .Select(l => new LanguageDto
            {
                Id         = l.Id,
                Code       = l.Code,
                Name       = l.Name,
                NativeName = l.NativeName,
                TtsCode    = l.TtsCode,
                FlagEmoji  = l.FlagEmoji,
                SortOrder  = l.SortOrder,
                IsActive   = l.IsActive,
            })
            .ToListAsync();

        _logger.LogDebug("Languages fetched: {Count} active languages returned", languages.Count);
        return ApiResponse<List<LanguageDto>>.Ok(languages);
    }

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    public async Task<ApiResponse<List<LanguageAdminDto>>> GetAllAsync()
    {
        var languages = await _db.Languages
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Name)
            .Select(l => MapToAdminDto(l))
            .ToListAsync();

        return ApiResponse<List<LanguageAdminDto>>.Ok(languages);
    }

    public async Task<ApiResponse<LanguageAdminDto>> GetByIdAsync(int id)
    {
        var lang = await _db.Languages.FindAsync(id);
        if (lang == null)
            return ApiResponse<LanguageAdminDto>.Fail("NOT_FOUND", $"Language {id} not found.");

        return ApiResponse<LanguageAdminDto>.Ok(MapToAdminDto(lang));
    }

    public async Task<ApiResponse<LanguageAdminDto>> CreateAsync(CreateLanguageRequest request)
    {
        // Code must be unique (case-insensitive)
        var exists = await _db.Languages.AnyAsync(l => l.Code.ToLower() == request.Code.ToLower());
        if (exists)
            return ApiResponse<LanguageAdminDto>.Fail("VALIDATION_ERROR", $"Language code '{request.Code}' already exists.");

        var lang = new Language
        {
            Code       = request.Code.ToLower().Trim(),
            Name       = request.Name.Trim(),
            NativeName = request.NativeName.Trim(),
            TtsCode    = request.TtsCode?.Trim() ?? null,
            FlagEmoji  = request.FlagEmoji?.Trim() ?? null,
            SortOrder  = request.SortOrder,
            IsActive   = request.IsActive,
        };

        _db.Languages.Add(lang);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Language created: {Code} ({Name}) by admin", lang.Code, lang.Name);
        return ApiResponse<LanguageAdminDto>.Ok(MapToAdminDto(lang));
    }

    public async Task<ApiResponse<LanguageAdminDto>> UpdateAsync(int id, UpdateLanguageRequest request)
    {
        var lang = await _db.Languages.FindAsync(id);
        if (lang == null)
            return ApiResponse<LanguageAdminDto>.Fail("NOT_FOUND", $"Language {id} not found.");

        // Code uniqueness check (exclude self)
        var codeConflict = await _db.Languages
            .AnyAsync(l => l.Id != id && l.Code.ToLower() == request.Code.ToLower());
        if (codeConflict)
            return ApiResponse<LanguageAdminDto>.Fail("VALIDATION_ERROR", $"Language code '{request.Code}' is already used by another language.");

        lang.Code       = request.Code.ToLower().Trim();
        lang.Name       = request.Name.Trim();
        lang.NativeName = request.NativeName.Trim();
        lang.TtsCode    = request.TtsCode?.Trim() ?? null;
        lang.FlagEmoji  = request.FlagEmoji?.Trim() ?? null;
        lang.SortOrder  = request.SortOrder;
        lang.IsActive   = request.IsActive;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Language updated: {Id} {Code}", id, lang.Code);
        return ApiResponse<LanguageAdminDto>.Ok(MapToAdminDto(lang));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var lang = await _db.Languages.FindAsync(id);
        if (lang == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", $"Language {id} not found.");

        // Guard: don't delete if translations / audio / visits reference this language
        var inUse = await _db.Set<POITranslation>().AnyAsync(t => t.LanguageId == id)
                 || await _db.Set<AudioNarration>().AnyAsync(a => a.LanguageId == id);
        if (inUse)
            return ApiResponse<bool>.Fail("VALIDATION_ERROR",
                "Cannot delete this language because POI translations or audio narrations reference it. Deactivate it instead.");

        _db.Languages.Remove(lang);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Language deleted: {Id} {Code}", id, lang.Code);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleActiveAsync(int id)
    {
        var lang = await _db.Languages.FindAsync(id);
        if (lang == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", $"Language {id} not found.");

        lang.IsActive = !lang.IsActive;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Language {Id} toggled → IsActive={IsActive}", id, lang.IsActive);
        return ApiResponse<bool>.Ok(lang.IsActive);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private static LanguageAdminDto MapToAdminDto(Language l) => new()
    {
        Id         = l.Id,
        Code       = l.Code,
        Name       = l.Name,
        NativeName = l.NativeName,
        TtsCode    = l.TtsCode,
        FlagEmoji  = l.FlagEmoji,
        SortOrder  = l.SortOrder,
        IsActive   = l.IsActive,
        CreatedAt  = l.CreatedAt,
        UpdatedAt  = l.UpdatedAt,
    };
}
