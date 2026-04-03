using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Provides language data for the mobile app's language picker.
/// This is an anonymous (no-auth) endpoint — tourists and visitors use it
/// before they have an account to choose their preferred language.
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
                Id = l.Id,
                Code = l.Code,
                Name = l.Name,
                NativeName = l.NativeName,
                TtsCode = l.TtsCode,
                FlagEmoji = l.FlagEmoji,
                SortOrder = l.SortOrder
            })
            .ToListAsync();

        _logger.LogDebug("Languages fetched: {Count} active languages returned", languages.Count);
        return ApiResponse<List<LanguageDto>>.Ok(languages);
    }
}
