using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Provides aggregated statistics and activity data for the dashboard.
///
/// Vendor scoping:
///   All public methods accept an optional <c>vendorPOIId</c> parameter.
///   When provided (i.e. the caller is a Vendor), every DB query is filtered
///   to records belonging to that single POI. Admins call these methods with
///   <c>null</c> to get system-wide data.
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<ApiResponse<DashboardStatsDto>> GetStatsAsync(int? vendorPOIId = null)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sixtyDaysAgo  = now.AddDays(-60);

        // ── Vendor mode: show stats for their shop only ───────────────
        if (vendorPOIId.HasValue)
        {
            var poiId = vendorPOIId.Value;

            var totalVisits = await _db.VisitHistory
                .CountAsync(v => v.POIId == poiId && v.VisitedAt >= thirtyDaysAgo);
            var prevVisits  = await _db.VisitHistory
                .CountAsync(v => v.POIId == poiId && v.VisitedAt >= sixtyDaysAgo && v.VisitedAt < thirtyDaysAgo);
            var audioFiles  = await _db.AudioNarrations
                .CountAsync(a => a.POIId == poiId && a.IsActive);

            double visitChange = prevVisits > 0
                ? Math.Round((double)(totalVisits - prevVisits) / prevVisits * 100, 1)
                : 0;

            // Vendors see a cut-down stats card (no system-wide counters)
            return ApiResponse<DashboardStatsDto>.Ok(new DashboardStatsDto
            {
                ActivePOIs          = 1,          // just their shop
                TotalVisits         = totalVisits,
                TotalVisitsChange   = visitChange,
                Languages           = await _db.Languages.CountAsync(l => l.IsActive),
                AudioFiles          = audioFiles,
                TotalUsers          = 0,          // not shown on Vendor dashboard
                TotalVendors        = 0           // not shown on Vendor dashboard
            });
        }

        // ── Admin mode: system-wide ───────────────────────────────────
        var allActivePOIs = await _db.POIs.CountAsync(p => p.IsActive);
        var allVisits     = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= thirtyDaysAgo);
        var allPrevVisits = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= sixtyDaysAgo && v.VisitedAt < thirtyDaysAgo);
        var allLanguages  = await _db.Languages.CountAsync(l => l.IsActive);
        var allAudio      = await _db.AudioNarrations.CountAsync(a => a.IsActive);
        var allUsers      = await _db.Users.CountAsync();
        var allVendors    = await _db.Users.CountAsync(u => u.Role == Domain.Enums.UserRole.Vendor);

        double change = allPrevVisits > 0
            ? Math.Round((double)(allVisits - allPrevVisits) / allPrevVisits * 100, 1)
            : 0;

        return ApiResponse<DashboardStatsDto>.Ok(new DashboardStatsDto
        {
            ActivePOIs        = allActivePOIs,
            TotalVisits       = allVisits,
            TotalVisitsChange = change,
            Languages         = allLanguages,
            AudioFiles        = allAudio,
            TotalUsers        = allUsers,
            TotalVendors      = allVendors
        });
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<TopPOIDto>>> GetTopPOIsAsync(int count = 5, int? vendorPOIId = null)
    {
        // Build base query
        var query = _db.POIs
            .Include(p => p.Translations)
            .Include(p => p.Category)
            .Where(p => p.IsActive)
            .AsQueryable();

        // Vendor: scope to their POI only
        if (vendorPOIId.HasValue)
            query = query.Where(p => p.Id == vendorPOIId.Value);

        var pois = await query
            .OrderByDescending(p => p.TotalVisits)
            .Take(count)
            .AsNoTracking()
            .Select(p => new TopPOIDto
            {
                Id     = p.Id,
                Name   = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
                Icon   = p.Category.Icon,
                Visits = p.TotalVisits
            })
            .ToListAsync();

        return ApiResponse<List<TopPOIDto>>.Ok(pois);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<VisitChartDto>>> GetVisitsChartAsync(
        DateTime from, DateTime to, int? vendorPOIId = null)
    {
        var query = _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to)
            .AsQueryable();

        // Vendor: limit to visits for their POI only
        if (vendorPOIId.HasValue)
            query = query.Where(v => v.POIId == vendorPOIId.Value);

        var rawVisits = await query
            .GroupBy(v => v.VisitedAt.Date)
            .Select(g => new 
            {
                Date       = g.Key,
                Visits     = g.Count(),
                Narrations = g.Count(v => v.NarrationPlayed)
            })
            .OrderBy(v => v.Date)
            .ToListAsync();

        var visits = rawVisits.Select(v => new VisitChartDto
        {
            Date       = v.Date.ToString("dd/MM"),
            Visits     = v.Visits,
            Narrations = v.Narrations
        }).ToList();

        return ApiResponse<List<VisitChartDto>>.Ok(visits);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<LanguageStatDto>>> GetLanguageStatsAsync(int? vendorPOIId = null)
    {
        var historyQuery = _db.VisitHistory.AsQueryable();

        // Vendor: filter visits by their POI
        if (vendorPOIId.HasValue)
            historyQuery = historyQuery.Where(v => v.POIId == vendorPOIId.Value);

        var total = await historyQuery.CountAsync();

        if (total == 0)
        {
            // Return languages with 0 visits so the UI still renders the list
            var langs = await _db.Languages
                .Where(l => l.IsActive)
                .Select(l => new LanguageStatDto
                {
                    Name       = l.NativeName,
                    FlagEmoji  = l.FlagEmoji,
                    Count      = 0,
                    Percentage = 0
                }).ToListAsync();
            return ApiResponse<List<LanguageStatDto>>.Ok(langs);
        }

        var stats = await historyQuery
            .Include(v => v.Language)
            .GroupBy(v => new { v.Language.NativeName, v.Language.FlagEmoji })
            .Select(g => new LanguageStatDto
            {
                Name       = g.Key.NativeName,
                FlagEmoji  = g.Key.FlagEmoji,
                Count      = g.Count(),
                Percentage = Math.Round((double)g.Count() / total * 100, 1)
            })
            .OrderByDescending(s => s.Count)
            .ToListAsync();

        return ApiResponse<List<LanguageStatDto>>.Ok(stats);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<RecentActivityDto>>> GetRecentActivityAsync(
        int count = 10, int? vendorPOIId = null)
    {
        var query = _db.VisitHistory
            .Include(v => v.User)
            .Include(v => v.POI).ThenInclude(p => p.Translations)
            .Include(v => v.Language)
            .AsQueryable();

        // Vendor: limit activity feed to their POI
        if (vendorPOIId.HasValue)
            query = query.Where(v => v.POIId == vendorPOIId.Value);

        var activities = await query
            .OrderByDescending(v => v.VisitedAt)
            .Take(count)
            .AsNoTracking()
            .ToListAsync();

        var dtos = activities.Select(v => new RecentActivityDto
        {
            UserName    = v.User?.FullName ?? $"Tourist #{v.UserId ?? 0}",
            POIName     = v.POI.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            TriggerType = v.TriggerType.ToString(),
            FlagEmoji   = v.Language.FlagEmoji,
            VisitedAt   = v.VisitedAt
        }).ToList();

        return ApiResponse<List<RecentActivityDto>>.Ok(dtos);
    }
}
