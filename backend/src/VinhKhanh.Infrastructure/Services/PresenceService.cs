using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Tracks real-time GPS positions of active tourists and broadcasts presence events
/// to admin monitors via SignalR.
///
/// Architecture:
///   - Mobile app calls POST /presence/update on every GPS update or geofence event.
///   - Service upserts the ActivePresence row (one per live tourist session).
///   - On enter/exit events, broadcasts to the admin "Monitor" SignalR group.
///   - GET /presence/snapshot returns a point-in-time snapshot for admin heatmap.
///
/// Stale rows (LastSeenAt older than 15 minutes) are purged periodically by
/// <see cref="PresenceCleanupService"/> (IHostedService, also in this file).
/// </summary>
public class PresenceService(
    AppDbContext db,
    IHubContext<TourMonitorHub> hub,
    ILogger<PresenceService> logger) : IPresenceService
{
    private static readonly ConcurrentDictionary<string, DateTime> WebVisitorLastSeen = new();
    private static readonly TimeSpan WebVisitorStaleThreshold = TimeSpan.FromMinutes(2);

    // In-memory GPS locations for web visitors (visitor site with geolocation)
    private record WebVisitorLocation(double Lat, double Lng, DateTime UpdatedAt);
    private static readonly ConcurrentDictionary<string, WebVisitorLocation> WebVisitorLocations = new();

    /// <inheritdoc/>
    public async Task TrackEnterAsync(string sessionId, int poiId, double? lat, double? lng)
    {
        await UpsertPresenceAsync(sessionId, poiId, lat, lng);

        // ── Record a VisitHistory entry so analytics (Visits by Hour etc.) reflect this POI visit ──
        // Guard: skip if this session already has a visit for the same POI in the last 5 minutes
        // to avoid duplicates when presence pings fire multiple "enter" events in quick succession.
        var recentCutoff = DateTime.UtcNow.AddMinutes(-5);
        var alreadyRecorded = await db.VisitHistory.AnyAsync(v =>
            v.DeviceId == sessionId &&
            v.POIId == poiId &&
            v.VisitedAt >= recentCutoff);

        if (!alreadyRecorded)
        {
            // Look up the tourist's preferred language from their session
            var session = await db.TouristSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionToken == sessionId);

            db.VisitHistory.Add(new Domain.Entities.VisitHistory
            {
                POIId           = poiId,
                UserId          = null,           // anonymous tourist — no registered account
                LanguageId      = session?.LanguageId ?? 1, // fallback to Vietnamese (id=1)
                TriggerType     = Domain.Enums.TriggerType.GeofenceEnter,
                NarrationPlayed = false,          // unknown at enter time; updated later by sync
                ListenDuration  = 0,
                VisitedAt       = DateTime.UtcNow,
                Latitude        = lat,
                Longitude       = lng,
                DeviceId        = sessionId       // used as duplicate-check key above
            });
            await db.SaveChangesAsync();

            // Bump denormalized TotalVisits counter on the POI
            await db.POIs
                .Where(p => p.Id == poiId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.TotalVisits, p => p.TotalVisits + 1));

            logger.LogDebug("[Presence] Recorded VisitHistory for session {S} → POI {P}", sessionId[..8], poiId);
        }

        // Broadcast to admin monitor group
        var poiName = await db.POIs
            .Where(p => p.Id == poiId)
            .SelectMany(p => p.Translations)
            .OrderBy(t => t.LanguageId)
            .Select(t => t.Name)
            .FirstOrDefaultAsync() ?? $"POI #{poiId}";

        var msg = new
        {
            eventType = "enter",
            sessionId = sessionId[..Math.Min(8, sessionId.Length)] + "…",
            poiId,
            poiName,
            lat,
            lng,
            timestamp = DateTime.UtcNow
        };

        await hub.Clients.Group("Admins").SendAsync("TouristEnteredPOI", msg);
        logger.LogDebug("[Presence] Session {S} entered POI {P}", sessionId[..8], poiId);
    }

    /// <inheritdoc/>
    public async Task TrackExitAsync(string sessionId, int? poiId)
    {
        // Set PoiId = null — tourist is between POIs
        var presence = await db.ActivePresence.FindAsync(sessionId);
        if (presence != null)
        {
            presence.PoiId     = null;
            presence.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        if (poiId.HasValue)
        {
            await hub.Clients.Group("Admins").SendAsync("TouristExitedPOI", new
            {
                eventType = "exit",
                sessionId = sessionId[..Math.Min(8, sessionId.Length)] + "…",
                poiId     = poiId.Value,
                timestamp = DateTime.UtcNow
            });
        }

        logger.LogDebug("[Presence] Session {S} exited POI {P}", sessionId[..8], poiId);
    }

    /// <inheritdoc/>
    public async Task UpdateLocationAsync(string sessionId, double lat, double lng)
    {
        var presence = await db.ActivePresence.FindAsync(sessionId);
        if (presence == null) return;

        presence.Latitude  = lat;
        presence.Longitude = lng;
        presence.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Broadcast lightweight location update to admin monitor
        await hub.Clients.Group("Admins").SendAsync("TouristLocationUpdate", new
        {
            sessionId = sessionId[..Math.Min(8, sessionId.Length)] + "…",
            lat,
            lng,
            poiId   = presence.PoiId,
            timestamp = DateTime.UtcNow
        });
    }

    /// <inheritdoc/>
    public async Task TrackWebVisitorHeartbeatAsync(string visitorId)
    {
        if (string.IsNullOrWhiteSpace(visitorId)) return;

        var id = visitorId.Trim();
        var isNew = !WebVisitorLastSeen.ContainsKey(id);

        WebVisitorLastSeen[id] = DateTime.UtcNow;
        await BroadcastWebVisitorCountAsync();

        if (isNew)
        {
            // ── Persist to DB so Dashboard polling can count it ───────────────
            // Dedup: only insert once per 2-hour window per visitor ID.
            var cutoff = DateTime.UtcNow.AddHours(-2);
            var alreadyLogged = await db.WebSiteVisits
                .AnyAsync(v => v.VisitorId == id && v.VisitedAt >= cutoff);

            if (!alreadyLogged)
            {
                db.WebSiteVisits.Add(new Domain.Entities.WebSiteVisit
                {
                    VisitorId = id,
                    VisitedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
                logger.LogInformation("[Presence] WebSiteVisit recorded for visitor {V}", id[..Math.Min(8, id.Length)]);
            }
        }
    }

    /// <inheritdoc/>
    public async Task TrackWebVisitorExitAsync(string visitorId)
    {
        if (string.IsNullOrWhiteSpace(visitorId)) return;

        WebVisitorLastSeen.TryRemove(visitorId.Trim(), out _);
        WebVisitorLocations.TryRemove(visitorId.Trim(), out _);
        await BroadcastWebVisitorCountAsync();
    }

    /// <inheritdoc/>
    public async Task TrackWebNarrationAsync(string visitorId)
    {
        if (string.IsNullOrWhiteSpace(visitorId)) return;

        var id      = visitorId.Trim();
        var cutoff  = DateTime.UtcNow.AddHours(-2);

        // Find the most recent WebSiteVisit for this visitor (within the 2h dedup window)
        var visit = await db.WebSiteVisits
            .Where(v => v.VisitorId == id && v.VisitedAt >= cutoff)
            .OrderByDescending(v => v.VisitedAt)
            .FirstOrDefaultAsync();

        if (visit != null)
        {
            visit.NarrationCount++;
            await db.SaveChangesAsync();
            logger.LogDebug("[Presence] NarrationCount++ for visitor {V} → {N}", id[..Math.Min(8, id.Length)], visit.NarrationCount);
        }
        else
        {
            // Visitor played audio before their first heartbeat was recorded; create a session now
            db.WebSiteVisits.Add(new Domain.Entities.WebSiteVisit
            {
                VisitorId      = id,
                VisitedAt      = DateTime.UtcNow,
                NarrationCount = 1
            });
            await db.SaveChangesAsync();
        }
    }

    /// <inheritdoc/>
    public Task TrackWebVisitorLocationAsync(string visitorId, double lat, double lng)
    {
        if (string.IsNullOrWhiteSpace(visitorId)) return Task.CompletedTask;

        var id = visitorId.Trim();
        // Also refresh heartbeat so location reporters stay counted as online
        WebVisitorLastSeen[id] = DateTime.UtcNow;
        WebVisitorLocations[id] = new WebVisitorLocation(lat, lng, DateTime.UtcNow);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task<ApiResponse<PresenceSnapshot>> GetSnapshotAsync()
    {
        var staleThreshold = DateTime.UtcNow.AddMinutes(-15);

        var rows = await db.ActivePresence
            .Where(p => p.UpdatedAt >= staleThreshold)
            .Include(p => p.Poi)
                .ThenInclude(poi => poi!.Translations)
            .AsNoTracking()
            .ToListAsync();

        // Web visitor GPS positions (in-memory)
        PurgeStaleWebVisitors();
        var webPositions = WebVisitorLocations
            .Where(kv => WebVisitorLastSeen.ContainsKey(kv.Key)) // only still-online visitors
            .Select(kv => new WebVisitorPositionDto
            {
                VisitorId  = kv.Key[..Math.Min(8, kv.Key.Length)] + "…",
                Latitude   = kv.Value.Lat,
                Longitude  = kv.Value.Lng,
                UpdatedAt  = kv.Value.UpdatedAt,
            }).ToList();

        var positions = rows.Select(p => new TouristPositionDto
        {
            SessionId = p.SessionId[..Math.Min(8, p.SessionId.Length)] + "…",
            Latitude  = p.Latitude,
            Longitude = p.Longitude,
            PoiId     = p.PoiId,
            PoiName   = p.Poi?.Translations
                .OrderBy(t => t.LanguageId)
                .Select(t => t.Name)
                .FirstOrDefault(),
            UpdatedAt = p.UpdatedAt
        }).ToList();

        // Group by active POI
        var perPoi = rows
            .Where(p => p.PoiId.HasValue)
            .GroupBy(p => p.PoiId!.Value)
            .Select(g => new PoiPresenceCount
            {
                PoiId   = g.Key,
                PoiName = g.First().Poi?.Translations
                    .OrderBy(t => t.LanguageId)
                    .Select(t => t.Name)
                    .FirstOrDefault() ?? $"POI #{g.Key}",
                Count   = g.Count()
            })
            .OrderByDescending(p => p.Count)
            .ToList();

        var webVisitors = CountActiveWebVisitors();
        var activeTourists = rows.Count;

        return ApiResponse<PresenceSnapshot>.Ok(new PresenceSnapshot
        {
            ActiveTourists      = activeTourists,
            WebVisitors         = webVisitors,
            TotalOnlineVisitors = activeTourists + webVisitors,
            PerPOI              = perPoi,
            Positions           = positions,
            WebVisitorPositions = webPositions,
            SnapshotAt          = DateTime.UtcNow
        });
    }

    /// <inheritdoc/>
    public async Task<ApiResponse<PresenceDashboardStats>> GetDashboardStatsAsync()
    {
        var now         = DateTime.UtcNow;
        var stale15     = now.AddMinutes(-15);
        var todayStart  = now.Date;                                      // UTC midnight
        var weekStart   = todayStart.AddDays(-(int)now.DayOfWeek);      // Mon of this week
        var yesterday   = now.AddHours(-24);

        // ── Realtime: ActivePresence ──────────────────────────────────────────
        var presenceRows = await db.ActivePresence
            .Where(p => p.UpdatedAt >= stale15)
            .ToListAsync();

        var touristsAtPOI = presenceRows.Count(p => p.PoiId.HasValue);
        var activePOIs    = presenceRows.Where(p => p.PoiId.HasValue)
                                        .Select(p => p.PoiId!.Value)
                                        .Distinct().Count();

        var perPoi = presenceRows
            .Where(p => p.PoiId.HasValue)
            .GroupBy(p => p.PoiId!.Value)
            .Select(g => new PoiPresenceCount { PoiId = g.Key, Count = g.Count() })
            .ToList();

        // Load POI names for the per-POI list
        if (perPoi.Count > 0)
        {
            var poiIds = perPoi.Select(p => p.PoiId).ToList();
            var names  = await db.POIs
                .Where(p => poiIds.Contains(p.Id))
                .Select(p => new { p.Id, Name = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() })
                .ToListAsync();
            foreach (var item in perPoi)
                item.PoiName = names.FirstOrDefault(n => n.Id == item.PoiId)?.Name ?? $"POI #{item.PoiId}";
        }

        // ── TouristSessions ───────────────────────────────────────────────────
        var activeLast24h = await db.TouristSessions
            .CountAsync(s => s.IsActive && s.StartedAt >= yesterday);

        var activeNow = presenceRows.Count;  // any presence row = "now" tourist

        // ── VisitHistory (historical fallbacks) ───────────────────────────────
        var visitsToday    = await db.VisitHistory.CountAsync(v => v.VisitedAt >= todayStart);
        var visitsThisWeek = await db.VisitHistory.CountAsync(v => v.VisitedAt >= weekStart);

        // Distinct POIs visited today
        var visitedPOIsToday = await db.VisitHistory
            .Where(v => v.VisitedAt >= todayStart)
            .Select(v => v.POIId)
            .Distinct()
            .CountAsync();

        // Distinct visitors today (userId when logged in, else sessionId)
        var uniqueVisitorsToday = await db.VisitHistory
            .Where(v => v.VisitedAt >= todayStart && v.UserId != null)
            .Select(v => v.UserId)
            .Distinct()
            .CountAsync();

        // Per-POI visit counts today (for sidebar fallback)
        var perPoiTodayRaw = await db.VisitHistory
            .Where(v => v.VisitedAt >= todayStart)
            .GroupBy(v => v.POIId)
            .Select(g => new { PoiId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync();

        List<PoiPresenceCount> perPoiToday = [];
        if (perPoiTodayRaw.Count > 0)
        {
            var poiTodayIds = perPoiTodayRaw.Select(x => x.PoiId).ToList();
            var poiTodayNames = await db.POIs
                .Where(p => poiTodayIds.Contains(p.Id))
                .Select(p => new
                {
                    p.Id,
                    Name = p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault()
                })
                .ToListAsync();

            perPoiToday = perPoiTodayRaw.Select(x => new PoiPresenceCount
            {
                PoiId   = x.PoiId,
                PoiName = poiTodayNames.FirstOrDefault(n => n.Id == x.PoiId)?.Name ?? $"POI #{x.PoiId}",
                Count   = x.Count,
            }).ToList();
        }

        // ── TourQRCodes ───────────────────────────────────────────────────────
        var activeQRCodes = await db.TourQRCodes
            .CountAsync(q => q.IsActive && (q.ExpiresAt == null || q.ExpiresAt > now));

        // ── Web Visitors (in-memory) ──────────────────────────────────────────
        var webVisitors = CountActiveWebVisitors();

        var stats = new PresenceDashboardStats
        {
            ActiveSessionsLast24h = activeLast24h,
            ActiveSessionsNow     = activeNow,
            TouristsAtPOI         = touristsAtPOI,
            ActivePOIs            = activePOIs,
            TotalVisitsToday      = visitsToday,
            TotalVisitsThisWeek   = visitsThisWeek,
            ActiveQRCodes         = activeQRCodes,
            WebVisitors           = webVisitors,
            TotalOnline           = activeNow + webVisitors,
            PerPOI                = perPoi,
            PerPOIToday           = perPoiToday,
            VisitedPOIsToday      = visitedPOIsToday,
            UniqueVisitorsToday   = uniqueVisitorsToday,
            GeneratedAt           = now,
        };

        return ApiResponse<PresenceDashboardStats>.Ok(stats);
    }

    /// <inheritdoc/>
    public async Task PurgeStaleAsync(TimeSpan staleThreshold)
    {
        var cutoff = DateTime.UtcNow - staleThreshold;
        var stale = await db.ActivePresence
            .Where(p => p.UpdatedAt < cutoff)
            .ToListAsync();

        if (stale.Count == 0)
        {
            PurgeStaleWebVisitors();
            return;
        }

        db.ActivePresence.RemoveRange(stale);
        await db.SaveChangesAsync();
        logger.LogInformation("[Presence] Purged {N} stale presence rows (older than {T})", stale.Count, staleThreshold);

        PurgeStaleWebVisitors();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private async Task UpsertPresenceAsync(string sessionId, int? poiId, double? lat, double? lng)
    {
        var existing = await db.ActivePresence.FindAsync(sessionId);
        if (existing != null)
        {
            existing.PoiId     = poiId;
            existing.Latitude  = lat;
            existing.Longitude = lng;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.ActivePresence.Add(new ActivePresence
            {
                SessionId = sessionId,
                PoiId     = poiId,
                Latitude  = lat,
                Longitude = lng,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }

    private int CountActiveWebVisitors()
    {
        PurgeStaleWebVisitors();
        return WebVisitorLastSeen.Count;
    }

    private static void PurgeStaleWebVisitors()
    {
        var cutoff = DateTime.UtcNow - WebVisitorStaleThreshold;
        foreach (var entry in WebVisitorLastSeen)
        {
            if (entry.Value < cutoff)
            {
                WebVisitorLastSeen.TryRemove(entry.Key, out _);
                WebVisitorLocations.TryRemove(entry.Key, out _);
            }
        }
    }

    private async Task BroadcastWebVisitorCountAsync()
    {
        var webVisitors = CountActiveWebVisitors();
        await hub.Clients.Group("Admins").SendAsync("WebVisitorPresenceUpdated", new
        {
            webVisitors,
            timestamp = DateTime.UtcNow
        });
    }
}

// ── Cleanup Background Service ───────────────────────────────────────────────

/// <summary>
/// Periodic background service that purges stale ActivePresence rows (tourist gone for > 15 min).
/// Runs every 5 minutes. Keeps the presence table small and the heatmap accurate.
/// </summary>
public class PresenceCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<PresenceCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("[PresenceCleanup] Service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

                using var scope    = scopeFactory.CreateScope();
                var presenceSvc = scope.ServiceProvider.GetRequiredService<IPresenceService>();
                await presenceSvc.PurgeStaleAsync(TimeSpan.FromMinutes(15));
            }
            catch (OperationCanceledException) { /* graceful shutdown */ }
            catch (Exception ex)
            {
                logger.LogError(ex, "[PresenceCleanup] Error during stale presence purge.");
            }
        }
    }
}
