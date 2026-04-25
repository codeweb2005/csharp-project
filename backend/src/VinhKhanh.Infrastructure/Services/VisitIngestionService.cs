using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Background service that drains a bounded Channel of visit batch messages
/// and persists them to the database in bulk.
///
/// Design goals:
///   1. HTTP endpoint (POST /sync/visits) returns immediately — no DB wait.
///   2. Visits are written to the Channel (in-memory queue, max 10,000 items).
///   3. This service drains the channel every 500ms OR when 50 items accumulate.
///   4. Bulk inserts via EF AddRange + SaveChangesAsync — one round-trip per batch.
///   5. If the channel is full (10,000 items), WriteAsync back-pressures the caller.
///
/// Failure handling:
///   - If the service crashes mid-batch, at most one batch (≤50 items) is lost.
///   - The mobile app's VisitQueueStore persists items locally, so they'll be
///     re-uploaded on next app resume.
/// </summary>
public class VisitIngestionService(
    Channel<VisitBatchMessage> channel,
    IServiceScopeFactory scopeFactory,
    ILogger<VisitIngestionService> logger) : BackgroundService
{
    private const int BatchSize          = 50;
    private static readonly TimeSpan DrainInterval = TimeSpan.FromMilliseconds(500);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("[VisitIngestion] Background service started. BatchSize={B}, DrainInterval={I}ms",
            BatchSize, DrainInterval.TotalMilliseconds);

        var buffer = new List<VisitBatchMessage>(BatchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            buffer.Clear();

            // Drain up to BatchSize items with a 500ms timeout
            var deadline = DateTime.UtcNow + DrainInterval;

            while (buffer.Count < BatchSize && DateTime.UtcNow < deadline)
            {
                if (channel.Reader.TryRead(out var msg))
                    buffer.Add(msg);
                else
                    await Task.Delay(10, stoppingToken); // short sleep before next TryRead
            }

            if (buffer.Count == 0) continue;

            await PersistBatchAsync(buffer, stoppingToken);
        }

        logger.LogInformation("[VisitIngestion] Service stopping — draining remaining items.");

        // Flush remaining items on graceful shutdown
        while (channel.Reader.TryRead(out var msg))
            buffer.Add(msg);

        if (buffer.Count > 0)
            await PersistBatchAsync(buffer, CancellationToken.None);
    }

    private async Task PersistBatchAsync(List<VisitBatchMessage> messages, CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var visitEntities = new List<VisitHistory>();

            foreach (var msg in messages)
            {
                foreach (var v in msg.Visits)
                {
                    if (!Enum.TryParse<TriggerType>(v.TriggerType, ignoreCase: true, out var trigger))
                        trigger = TriggerType.GeofenceEnter;

                    visitEntities.Add(new VisitHistory
                    {
                        POIId           = v.POIId,
                        UserId          = msg.UserId,
                        LanguageId      = v.LanguageId,
                        TriggerType     = trigger,
                        NarrationPlayed = v.NarrationPlayed,
                        ListenDuration  = v.ListenDuration,
                        VisitedAt       = v.VisitedAt == default ? DateTime.UtcNow : v.VisitedAt,
                        Latitude        = v.Latitude,
                        Longitude       = v.Longitude,
                        DeviceId        = msg.SessionId // use sessionId as device identifier for tourists
                    });
                }
            }

            if (visitEntities.Count == 0) return;

            db.VisitHistory.AddRange(visitEntities);
            await db.SaveChangesAsync(ct);

            // Increment TotalVisits counters in bulk
            var poiIds = visitEntities.Select(v => v.POIId).Distinct().ToList();
            foreach (var poiId in poiIds)
            {
                var count = visitEntities.Count(v => v.POIId == poiId);
                await db.POIs
                    .Where(p => p.Id == poiId)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.TotalVisits, p => p.TotalVisits + count), ct);
            }

            logger.LogDebug("[VisitIngestion] Persisted {Count} visits from {Msgs} messages.",
                visitEntities.Count, messages.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[VisitIngestion] Failed to persist batch of {N} messages.", messages.Count);
            // Items are lost on failure — acceptable since mobile re-uploads on next sync.
            // For zero-loss, implement a dead-letter queue or persistent journal here.
        }
    }
}
