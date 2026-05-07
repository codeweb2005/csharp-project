using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Provides aggregated statistics and activity data for the dashboard.
///
/// Vendor scoping:
///   All public methods accept an optional <c>vendorPOIIds</c> parameter.
///   When provided (i.e. the caller is a Vendor), every DB query is filtered
///   to records belonging to those POIs. Admins call these methods with
///   <c>null</c> to get system-wide data.
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<ApiResponse<DashboardStatsDto>> GetStatsAsync(List<int>? vendorPOIIds = null)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sixtyDaysAgo  = now.AddDays(-60);

        // ── Vendor mode: show stats for their shops ───────────────
        if (vendorPOIIds != null)
        {
            var totalVisits = await _db.VisitHistory
                .CountAsync(v => vendorPOIIds.Contains(v.POIId) && v.VisitedAt >= thirtyDaysAgo);
            var prevVisits  = await _db.VisitHistory
                .CountAsync(v => vendorPOIIds.Contains(v.POIId) && v.VisitedAt >= sixtyDaysAgo && v.VisitedAt < thirtyDaysAgo);
            var audioFiles  = await _db.AudioNarrations
                .CountAsync(a => vendorPOIIds.Contains(a.POIId) && a.IsActive);
            var activePois  = await _db.POIs
                .CountAsync(p => vendorPOIIds.Contains(p.Id) && p.IsActive);

            double visitChange = prevVisits > 0
                ? Math.Round((double)(totalVisits - prevVisits) / prevVisits * 100, 1)
                : 0;

            var narrationsToday = await _db.VisitHistory
                .CountAsync(v => vendorPOIIds.Contains(v.POIId) && v.VisitedAt >= now.Date && v.NarrationPlayed);

            return ApiResponse<DashboardStatsDto>.Ok(new DashboardStatsDto
            {
                ActivePOIs          = activePois,
                TotalVisits         = totalVisits,
                TotalVisitsChange   = visitChange,
                Languages           = await _db.Languages.CountAsync(l => l.IsActive),
                AudioFiles          = audioFiles,
                TotalUsers          = 0,
                TotalVendors        = 0,
                NarrationsToday     = narrationsToday
            });
        }

        // ── Admin mode: system-wide (POI visits + web site visits) ───────────
        var allActivePOIs  = await _db.POIs.CountAsync(p => p.IsActive);
        var poiVisits      = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= thirtyDaysAgo);
        var webVisits      = await _db.WebSiteVisits.CountAsync(v => v.VisitedAt >= thirtyDaysAgo);
        var allVisits      = poiVisits + webVisits;
        var poiPrevVisits  = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= sixtyDaysAgo && v.VisitedAt < thirtyDaysAgo);
        var webPrevVisits  = await _db.WebSiteVisits.CountAsync(v => v.VisitedAt >= sixtyDaysAgo && v.VisitedAt < thirtyDaysAgo);
        var allPrevVisits  = poiPrevVisits + webPrevVisits;
        var allLanguages   = await _db.Languages.CountAsync(l => l.IsActive);
        var allAudio       = await _db.AudioNarrations.CountAsync(a => a.IsActive);
        var allUsers       = await _db.Users.CountAsync();
        var allVendors     = await _db.Users.CountAsync(u => u.Role == Domain.Enums.UserRole.Vendor);

        double change = allPrevVisits > 0
            ? Math.Round((double)(allVisits - allPrevVisits) / allPrevVisits * 100, 1)
            : 0;

        var poiNarrationsToday = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= now.Date && v.NarrationPlayed);
        var webNarrationsToday = await _db.WebSiteVisits.Where(v => v.VisitedAt >= now.Date).SumAsync(v => v.NarrationCount);

        return ApiResponse<DashboardStatsDto>.Ok(new DashboardStatsDto
        {
            ActivePOIs        = allActivePOIs,
            TotalVisits       = allVisits,
            TotalVisitsChange = change,
            Languages         = allLanguages,
            AudioFiles        = allAudio,
            TotalUsers        = allUsers,
            TotalVendors      = allVendors,
            NarrationsToday   = poiNarrationsToday + webNarrationsToday
        });
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<TopPOIDto>>> GetTopPOIsAsync(int count = 5, List<int>? vendorPOIIds = null)
    {
        var query = _db.POIs
            .Include(p => p.Translations)
            .Include(p => p.Category)
            .Where(p => p.IsActive)
            .AsQueryable();

        if (vendorPOIIds != null)
            query = query.Where(p => vendorPOIIds.Contains(p.Id));

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
        DateTime from, DateTime to, List<int>? vendorPOIIds = null)
    {
        // ── POI visits (all callers) ──────────────────────────────────────────
        var poiQuery = _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to)
            .AsQueryable();

        if (vendorPOIIds != null)
            poiQuery = poiQuery.Where(v => vendorPOIIds.Contains(v.POIId));

        var poiByDay = await poiQuery
            .GroupBy(v => v.VisitedAt.Date)
            .Select(g => new { Date = g.Key, Visits = g.Count(), Narrations = g.Count(v => v.NarrationPlayed) })
            .ToListAsync();

        // ── Web site visits (Admin only — vendor chart stays POI-scoped) ───────
        var webByDay = new List<(DateTime Date, int Visits, int Narrations)>();
        if (vendorPOIIds == null)
        {
            webByDay = (await _db.WebSiteVisits
                .Where(v => v.VisitedAt >= from && v.VisitedAt <= to)
                .GroupBy(v => v.VisitedAt.Date)
                .Select(g => new
                {
                    Date       = g.Key,
                    Visits     = g.Count(),
                    Narrations = g.Sum(v => v.NarrationCount)
                })
                .ToListAsync())
                .Select(x => (x.Date, x.Visits, x.Narrations)).ToList();
        }

        // ── Merge by date ─────────────────────────────────────────────────────
        var merged = poiByDay.ToDictionary(x => x.Date, x => (Visits: x.Visits, Narrations: x.Narrations));
        foreach (var (date, webVisits, webNarrations) in webByDay)
        {
            if (merged.TryGetValue(date, out var existing))
                merged[date] = (existing.Visits + webVisits, existing.Narrations + webNarrations);
            else
                merged[date] = (webVisits, webNarrations);
        }

        var visits = merged
            .OrderBy(kv => kv.Key)
            .Select(kv => new VisitChartDto
            {
                Date       = kv.Key.ToString("dd/MM"),
                Visits     = kv.Value.Visits,
                Narrations = kv.Value.Narrations
            }).ToList();

        return ApiResponse<List<VisitChartDto>>.Ok(visits);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<LanguageStatDto>>> GetLanguageStatsAsync(List<int>? vendorPOIIds = null)
    {
        var allActiveLanguages = await _db.Languages.Where(l => l.IsActive).ToListAsync();

        var historyQuery = _db.VisitHistory.AsQueryable();
        if (vendorPOIIds != null)
            historyQuery = historyQuery.Where(v => vendorPOIIds.Contains(v.POIId));

        var visitCounts = await historyQuery
            .GroupBy(v => v.LanguageId)
            .Select(g => new { LanguageId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.LanguageId, x => x.Count);

        var total = visitCounts.Values.Sum();

        var stats = allActiveLanguages.Select(l => new LanguageStatDto
        {
            Name       = l.NativeName,
            FlagEmoji  = l.FlagEmoji ?? "🌐",
            Count      = visitCounts.GetValueOrDefault(l.Id, 0),
            Percentage = total > 0 ? Math.Round((double)visitCounts.GetValueOrDefault(l.Id, 0) / total * 100, 1) : 0
        })
        .OrderByDescending(s => s.Count)
        .ThenBy(s => s.Name)
        .ToList();

        return ApiResponse<List<LanguageStatDto>>.Ok(stats);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<RecentActivityDto>>> GetRecentActivityAsync(
        int count = 10, List<int>? vendorPOIIds = null)
    {
        var query = _db.VisitHistory
            .Include(v => v.User)
            .Include(v => v.POI).ThenInclude(p => p.Translations)
            .Include(v => v.Language)
            .AsQueryable();

        if (vendorPOIIds != null)
            query = query.Where(v => vendorPOIIds.Contains(v.POIId));

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
