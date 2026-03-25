using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Provides detailed analytics data for the analytics page.
///
/// Vendor scoping:
///   All public methods accept an optional <c>vendorPOIId</c>.
///   When provided, all VisitHistory queries are additionally filtered to
///   <c>WHERE POIId = vendorPOIId</c> so a Vendor only ever sees their
///   own shop's analytics data. Admins call with <c>null</c> for global data.
/// </summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly AppDbContext _db;

    public AnalyticsService(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<ApiResponse<Dictionary<string, TrendDto>>> GetTrendsAsync(
        string period, int? vendorPOIId = null)
    {
        // Parse period: "7d", "30d", "90d"
        var days = period switch
        {
            "7d"  => 7,
            "90d" => 90,
            _     => 30  // default 30d
        };

        var now      = DateTime.UtcNow;
        var from     = now.AddDays(-days);
        var prevFrom = from.AddDays(-days);

        // ── Base history query, optionally scoped to vendor's POI ──────
        IQueryable<Domain.Entities.VisitHistory> h = _db.VisitHistory;
        if (vendorPOIId.HasValue)
            h = h.Where(v => v.POIId == vendorPOIId.Value);

        // Current vs previous period counts
        var currentVisits    = await h.CountAsync(v => v.VisitedAt >= from);
        var previousVisits   = await h.CountAsync(v => v.VisitedAt >= prevFrom && v.VisitedAt < from);

        var currentNarrations  = await h.CountAsync(v => v.VisitedAt >= from && v.NarrationPlayed);
        var previousNarrations = await h.CountAsync(v => v.VisitedAt >= prevFrom && v.VisitedAt < from && v.NarrationPlayed);

        // New users — scoping doesn't apply here for vendors (show global for context),
        // but for strict scoping we show 0 for vendors (they don't manage users)
        var currentUsers  = vendorPOIId.HasValue ? 0
            : await _db.Users.CountAsync(u => u.CreatedAt >= from);
        var previousUsers = vendorPOIId.HasValue ? 0
            : await _db.Users.CountAsync(u => u.CreatedAt >= prevFrom && u.CreatedAt < from);

        // Avg listen duration
        var currentAvgDuration  = await h
            .Where(v => v.VisitedAt >= from && v.NarrationPlayed)
            .AverageAsync(v => (double?)v.ListenDuration) ?? 0;
        var previousAvgDuration = await h
            .Where(v => v.VisitedAt >= prevFrom && v.VisitedAt < from && v.NarrationPlayed)
            .AverageAsync(v => (double?)v.ListenDuration) ?? 0;

        var trends = new Dictionary<string, TrendDto>
        {
            ["totalVisits"] = new()
            {
                Value         = currentVisits,
                ChangePercent = CalcChange(currentVisits, previousVisits)
            },
            ["narrations"] = new()
            {
                Value         = currentNarrations,
                ChangePercent = CalcChange(currentNarrations, previousNarrations)
            },
            ["newUsers"] = new()
            {
                Value         = currentUsers,
                ChangePercent = CalcChange(currentUsers, previousUsers)
            },
            ["avgListenDuration"] = new()
            {
                Value         = (decimal)Math.Round(currentAvgDuration, 1),
                ChangePercent = CalcChange(currentAvgDuration, previousAvgDuration)
            }
        };

        return ApiResponse<Dictionary<string, TrendDto>>.Ok(trends);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<VisitChartDto>>> GetVisitsByDayAsync(
        DateTime from, DateTime to, int? vendorPOIId = null)
    {
        IQueryable<Domain.Entities.VisitHistory> q = _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to);

        if (vendorPOIId.HasValue)
            q = q.Where(v => v.POIId == vendorPOIId.Value);

        var rawData = await q
            .GroupBy(v => v.VisitedAt.Date)
            .Select(g => new 
            {
                Date       = g.Key,
                Visits     = g.Count(),
                Narrations = g.Count(v => v.NarrationPlayed)
            })
            .OrderBy(v => v.Date)
            .ToListAsync();

        var data = rawData.Select(v => new VisitChartDto
        {
            Date       = v.Date.ToString("dd/MM"),
            Visits     = v.Visits,
            Narrations = v.Narrations
        }).ToList();

        return ApiResponse<List<VisitChartDto>>.Ok(data);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<HourlyVisitDto>>> GetVisitsByHourAsync(
        DateTime date, int? vendorPOIId = null)
    {
        var startOfDay = date.Date;
        var endOfDay   = startOfDay.AddDays(1);

        IQueryable<Domain.Entities.VisitHistory> q = _db.VisitHistory
            .Where(v => v.VisitedAt >= startOfDay && v.VisitedAt < endOfDay);

        if (vendorPOIId.HasValue)
            q = q.Where(v => v.POIId == vendorPOIId.Value);

        var hourly = await q
            .GroupBy(v => v.VisitedAt.Hour)
            .Select(g => new HourlyVisitDto
            {
                Hour   = g.Key,
                Visits = g.Count()
            })
            .ToListAsync();

        // Fill in missing hours with 0 so the chart always has 24 data points
        var result = Enumerable.Range(0, 24)
            .Select(h => hourly.FirstOrDefault(x => x.Hour == h)
                        ?? new HourlyVisitDto { Hour = h, Visits = 0 })
            .ToList();

        return ApiResponse<List<HourlyVisitDto>>.Ok(result);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<LanguageStatDto>>> GetLanguageDistributionAsync(
        DateTime from, DateTime to, int? vendorPOIId = null)
    {
        IQueryable<Domain.Entities.VisitHistory> q = _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to);

        if (vendorPOIId.HasValue)
            q = q.Where(v => v.POIId == vendorPOIId.Value);

        var total = await q.CountAsync();

        if (total == 0)
            return ApiResponse<List<LanguageStatDto>>.Ok([]);

        var stats = await q
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

    // ── Helpers ──────────────────────────────────────────────────────────

    /// <summary>Calculate percentage change between two values. Returns 100 if previous is 0 and current > 0.</summary>
    private static double CalcChange(double current, double previous)
    {
        if (previous == 0) return current > 0 ? 100 : 0;
        return Math.Round((current - previous) / previous * 100, 1);
    }
}
