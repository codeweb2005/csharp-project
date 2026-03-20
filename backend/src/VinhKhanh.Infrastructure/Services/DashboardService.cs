using Microsoft.EntityFrameworkCore;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    public async Task<ApiResponse<DashboardStatsDto>> GetStatsAsync()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sixtyDaysAgo = now.AddDays(-60);

        var activePOIs = await _db.POIs.CountAsync(p => p.IsActive);
        var totalVisits = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= thirtyDaysAgo);
        var prevVisits = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= sixtyDaysAgo && v.VisitedAt < thirtyDaysAgo);
        var languages = await _db.Languages.CountAsync(l => l.IsActive);
        var audioFiles = await _db.AudioNarrations.CountAsync(a => a.IsActive);
        var totalUsers = await _db.Users.CountAsync();
        var totalVendors = await _db.Users.CountAsync(u => u.Role == Domain.Enums.UserRole.Vendor);

        double visitChange = prevVisits > 0
            ? Math.Round((double)(totalVisits - prevVisits) / prevVisits * 100, 1)
            : 0;

        return ApiResponse<DashboardStatsDto>.Ok(new DashboardStatsDto
        {
            ActivePOIs = activePOIs,
            TotalVisits = totalVisits,
            TotalVisitsChange = visitChange,
            Languages = languages,
            AudioFiles = audioFiles,
            TotalUsers = totalUsers,
            TotalVendors = totalVendors
        });
    }

    public async Task<ApiResponse<List<TopPOIDto>>> GetTopPOIsAsync(int count = 5)
    {
        var pois = await _db.POIs
            .Include(p => p.Translations)
            .Include(p => p.Category)
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.TotalVisits)
            .Take(count)
            .AsNoTracking()
            .Select(p => new TopPOIDto
            {
                Id = p.Id,
                Name = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
                Icon = p.Category.Icon,
                Visits = p.TotalVisits
            })
            .ToListAsync();

        return ApiResponse<List<TopPOIDto>>.Ok(pois);
    }

    public async Task<ApiResponse<List<VisitChartDto>>> GetVisitsChartAsync(DateTime from, DateTime to)
    {
        var visits = await _db.VisitHistory
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

        return ApiResponse<List<VisitChartDto>>.Ok(visits);
    }

    public async Task<ApiResponse<List<LanguageStatDto>>> GetLanguageStatsAsync()
    {
        var total = await _db.VisitHistory.CountAsync();
        if (total == 0)
        {
            // Return languages with 0 visits
            var langs = await _db.Languages
                .Where(l => l.IsActive)
                .Select(l => new LanguageStatDto
                {
                    Name = l.NativeName,
                    FlagEmoji = l.FlagEmoji,
                    Count = 0,
                    Percentage = 0
                }).ToListAsync();
            return ApiResponse<List<LanguageStatDto>>.Ok(langs);
        }

        var stats = await _db.VisitHistory
            .Include(v => v.Language)
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

    public async Task<ApiResponse<List<RecentActivityDto>>> GetRecentActivityAsync(int count = 10)
    {
        var activities = await _db.VisitHistory
            .Include(v => v.User)
            .Include(v => v.POI).ThenInclude(p => p.Translations)
            .Include(v => v.Language)
            .OrderByDescending(v => v.VisitedAt)
            .Take(count)
            .AsNoTracking()
            .ToListAsync();

        var dtos = activities.Select(v => new RecentActivityDto
        {
            UserName = v.User?.FullName ?? $"Tourist #{v.UserId ?? 0}",
            POIName = v.POI.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
            TriggerType = v.TriggerType.ToString(),
            FlagEmoji = v.Language.FlagEmoji,
            VisitedAt = v.VisitedAt
        }).ToList();

        return ApiResponse<List<RecentActivityDto>>.Ok(dtos);
    }
}
