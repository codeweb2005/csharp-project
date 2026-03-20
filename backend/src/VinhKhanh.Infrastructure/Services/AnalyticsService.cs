using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly AppDbContext _db;

    public AnalyticsService(AppDbContext db) => _db = db;

    public async Task<ApiResponse<Dictionary<string, TrendDto>>> GetTrendsAsync(string period)
    {
        // Parse period: "7d", "30d", "90d"
        var days = period switch
        {
            "7d" => 7,
            "90d" => 90,
            _ => 30 // default 30d
        };

        var now = DateTime.UtcNow;
        var from = now.AddDays(-days);
        var prevFrom = from.AddDays(-days);

        // Current period counts
        var currentVisits = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= from);
        var previousVisits = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= prevFrom && v.VisitedAt < from);

        var currentNarrations = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= from && v.NarrationPlayed);
        var previousNarrations = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= prevFrom && v.VisitedAt < from && v.NarrationPlayed);

        var currentUsers = await _db.Users.CountAsync(u => u.CreatedAt >= from);
        var previousUsers = await _db.Users.CountAsync(u => u.CreatedAt >= prevFrom && u.CreatedAt < from);

        // Average listen duration
        var currentAvgDuration = await _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.NarrationPlayed)
            .AverageAsync(v => (double?)v.ListenDuration) ?? 0;
        var previousAvgDuration = await _db.VisitHistory
            .Where(v => v.VisitedAt >= prevFrom && v.VisitedAt < from && v.NarrationPlayed)
            .AverageAsync(v => (double?)v.ListenDuration) ?? 0;

        var trends = new Dictionary<string, TrendDto>
        {
            ["totalVisits"] = new()
            {
                Value = currentVisits,
                ChangePercent = CalcChange(currentVisits, previousVisits)
            },
            ["narrations"] = new()
            {
                Value = currentNarrations,
                ChangePercent = CalcChange(currentNarrations, previousNarrations)
            },
            ["newUsers"] = new()
            {
                Value = currentUsers,
                ChangePercent = CalcChange(currentUsers, previousUsers)
            },
            ["avgListenDuration"] = new()
            {
                Value = (decimal)Math.Round(currentAvgDuration, 1),
                ChangePercent = CalcChange(currentAvgDuration, previousAvgDuration)
            }
        };

        return ApiResponse<Dictionary<string, TrendDto>>.Ok(trends);
    }

    public async Task<ApiResponse<List<VisitChartDto>>> GetVisitsByDayAsync(DateTime from, DateTime to)
    {
        var data = await _db.VisitHistory
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to)
            .GroupBy(v => v.VisitedAt.Date)
            .Select(g => new VisitChartDto
            {
                Date = g.Key.ToString("dd/MM"),
                Visits = g.Count(),
                Narrations = g.Count(v => v.NarrationPlayed)
            })
            .OrderBy(v => v.Date)
            .ToListAsync();

        return ApiResponse<List<VisitChartDto>>.Ok(data);
    }

    public async Task<ApiResponse<List<HourlyVisitDto>>> GetVisitsByHourAsync(DateTime date)
    {
        var startOfDay = date.Date;
        var endOfDay = startOfDay.AddDays(1);

        var hourly = await _db.VisitHistory
            .Where(v => v.VisitedAt >= startOfDay && v.VisitedAt < endOfDay)
            .GroupBy(v => v.VisitedAt.Hour)
            .Select(g => new HourlyVisitDto
            {
                Hour = g.Key,
                Visits = g.Count()
            })
            .ToListAsync();

        // Fill in missing hours with 0
        var result = Enumerable.Range(0, 24)
            .Select(h => hourly.FirstOrDefault(x => x.Hour == h) ?? new HourlyVisitDto { Hour = h, Visits = 0 })
            .ToList();

        return ApiResponse<List<HourlyVisitDto>>.Ok(result);
    }

    public async Task<ApiResponse<List<LanguageStatDto>>> GetLanguageDistributionAsync(DateTime from, DateTime to)
    {
        var total = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= from && v.VisitedAt <= to);

        if (total == 0)
            return ApiResponse<List<LanguageStatDto>>.Ok([]);

        var stats = await _db.VisitHistory
            .Include(v => v.Language)
            .Where(v => v.VisitedAt >= from && v.VisitedAt <= to)
            .GroupBy(v => new { v.Language.NativeName, v.Language.FlagEmoji })
            .Select(g => new LanguageStatDto
            {
                Name = g.Key.NativeName,
                FlagEmoji = g.Key.FlagEmoji,
                Count = g.Count(),
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
