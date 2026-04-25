using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Provides detailed analytics data for the analytics page.
///
/// Vendor scoping:
///   All public methods accept an optional <c>vendorPOIIds</c>.
///   When provided, all VisitHistory queries are additionally filtered to
///   <c>WHERE POIId IN (vendorPOIIds)</c> so a Vendor only ever sees their
///   own shops' analytics data. Admins call with <c>null</c> for global data.
/// </summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly AppDbContext _db;

    public AnalyticsService(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<ApiResponse<Dictionary<string, TrendDto>>> GetTrendsAsync(
        string period, List<int>? vendorPOIIds = null)
    {
        var days = period switch
        {
            "7d"  => 7,
            "90d" => 90,
            _     => 30
        };

        var now      = DateTime.UtcNow;
        var from     = now.AddDays(-days);
        var prevFrom = from.AddDays(-days);

        IQueryable<Domain.Entities.VisitHistory> h = _db.VisitHistory;
        if (vendorPOIIds != null)
            h = h.Where(v => vendorPOIIds.Contains(v.POIId));

        var currentVisits    = await h.CountAsync(v => v.VisitedAt >= from);
        var previousVisits   = await h.CountAsync(v => v.VisitedAt >= prevFrom && v.VisitedAt < from);

        var currentNarrations  = await h.CountAsync(v => v.VisitedAt >= from && v.NarrationPlayed);
        var previousNarrations = await h.CountAsync(v => v.VisitedAt >= prevFrom && v.VisitedAt < from && v.NarrationPlayed);

        var currentUsers  = vendorPOIIds != null ? 0
            : await _db.Users.CountAsync(u => u.CreatedAt >= from);
        var previousUsers = vendorPOIIds != null ? 0
            : await _db.Users.CountAsync(u => u.CreatedAt >= prevFrom && u.CreatedAt < from);

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
        DateTime from, DateTime to, List<int>? vendorPOIIds = null)
    {
        IQueryable<Domain.Entities.VisitHistory> q = _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to);

        if (vendorPOIIds != null)
            q = q.Where(v => vendorPOIIds.Contains(v.POIId));

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
    /// <param name="date">The local date string (YYYY-MM-DD) to query.</param>
    /// <param name="tzOffsetMinutes">
    /// Client timezone offset in minutes east of UTC (e.g. GMT+7 → 420).
    /// Used to convert UTC <c>VisitedAt</c> to the local hour for the chart.
    /// Defaults to 420 (Vietnam Standard Time, UTC+7) when not provided.
    /// </param>
    public async Task<ApiResponse<List<HourlyVisitDto>>> GetVisitsByHourAsync(
        DateTime date, List<int>? vendorPOIIds = null, int tzOffsetMinutes = 420)
    {
        // Build local-day window in UTC:
        //   localMidnight = date at 00:00 local = date in UTC minus the offset
        var localMidnightUtc = date.Date.AddMinutes(-tzOffsetMinutes);
        var localEndOfDayUtc = localMidnightUtc.AddDays(1);

        IQueryable<Domain.Entities.VisitHistory> q = _db.VisitHistory
            .Where(v => v.VisitedAt >= localMidnightUtc && v.VisitedAt < localEndOfDayUtc);

        if (vendorPOIIds != null)
            q = q.Where(v => vendorPOIIds.Contains(v.POIId));

        // Load raw VisitedAt values then convert to local hour in .NET
        // (EF Core / MySQL translate DateTime arithmetic but not TimeSpan offsets reliably)
        var rawDates = await q.Select(v => v.VisitedAt).ToListAsync();

        var hourly = rawDates
            .Select(utc => utc.AddMinutes(tzOffsetMinutes).Hour)   // → local hour
            .GroupBy(h => h)
            .Select(g => new HourlyVisitDto { Hour = g.Key, Visits = g.Count() })
            .ToList();

        var result = Enumerable.Range(0, 24)
            .Select(h => hourly.FirstOrDefault(x => x.Hour == h)
                        ?? new HourlyVisitDto { Hour = h, Visits = 0 })
            .ToList();

        return ApiResponse<List<HourlyVisitDto>>.Ok(result);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<LanguageStatDto>>> GetLanguageDistributionAsync(
        DateTime from, DateTime to, List<int>? vendorPOIIds = null)
    {
        IQueryable<Domain.Entities.VisitHistory> q = _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to);

        if (vendorPOIIds != null)
            q = q.Where(v => vendorPOIIds.Contains(v.POIId));

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

    private static double CalcChange(double current, double previous)
    {
        if (previous == 0) return current > 0 ? 100 : 0;
        return Math.Round((current - previous) / previous * 100, 1);
    }
}
