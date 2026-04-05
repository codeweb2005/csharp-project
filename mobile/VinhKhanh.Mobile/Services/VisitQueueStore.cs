using System.Text.Json;
using System.Text.Json.Serialization;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Represents a single visit event to be uploaded to the backend.
/// Mirrors the VisitBatchRequest DTO expected by POST /api/v1/sync/visits.
/// </summary>
public sealed class VisitEntry
{
    public int      PoiId           { get; init; }
    public int      LanguageId      { get; init; }
    /// <summary>"geofence" or "manual"</summary>
    public string   TriggerType     { get; init; } = "geofence";
    public bool     NarrationPlayed { get; init; }
    /// <summary>Seconds the user listened before stopping. Updated when PlaybackCompleted fires.</summary>
    public int      ListenDuration  { get; set;  }
    public DateTime VisitedAt       { get; init; } = DateTime.UtcNow;
    public double?  Latitude        { get; init; }
    public double?  Longitude       { get; init; }
}

/// <summary>
/// Local queue for visit tracking events that haven't been uploaded yet.
///
/// Strategy:
///   1. Events are queued in-memory immediately (low latency, no disk write on the hot path).
///   2. On app resume / connectivity restored / explicit flush call, all pending entries are
///      serialised to JSON and POSTed to the server via <see cref="ApiClient.UploadVisitsAsync"/>.
///   3. A Preferences key stores a JSON backup of pending entries so they survive app crashes.
///      The backup is cleared after a successful upload.
///
/// Thread-safety: All mutations are performed inside lock(_pendingLock).
/// </summary>
public sealed class VisitQueueStore
{
    private const string PrefKey = "vk_pending_visits";
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly List<VisitEntry> _pending = [];
    private readonly object           _pendingLock = new();

    // ── Constructor ────────────────────────────────────────────────────────────

    public VisitQueueStore()
    {
        // Restore any visits that were persisted before a previous app crash / kill
        RestoreFromPreferences();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Enqueue a visit event.
    /// If a visit for this POI was started in the same session (ListenDuration update path),
    /// the caller should use <see cref="UpdateListenDuration"/> instead of enqueuing a duplicate.
    /// </summary>
    public VisitEntry Enqueue(int poiId, int languageId, string triggerType,
        bool narrationPlayed, double? lat = null, double? lng = null)
    {
        var entry = new VisitEntry
        {
            PoiId           = poiId,
            LanguageId      = languageId,
            TriggerType     = triggerType,
            NarrationPlayed = narrationPlayed,
            VisitedAt       = DateTime.UtcNow,
            Latitude        = lat,
            Longitude       = lng
        };

        lock (_pendingLock)
        {
            _pending.Add(entry);
            PersistToPreferences();
        }

        return entry;
    }

    /// <summary>
    /// Update the ListenDuration of the most recent pending visit for a POI.
    /// Called when <see cref="INarrationPlayer.PlaybackCompleted"/> fires with the elapsed time.
    /// </summary>
    public void UpdateListenDuration(int poiId, int durationSeconds)
    {
        lock (_pendingLock)
        {
            // Find the most recent unfinished visit for this POI
            var entry = _pending
                .Where(e => e.PoiId == poiId && e.ListenDuration == 0)
                .LastOrDefault();

            if (entry is not null)
            {
                entry.ListenDuration = durationSeconds;
                PersistToPreferences();
            }
        }
    }

    /// <summary>
    /// Dequeue all pending visits and return them for upload.
    /// The returned list is a snapshot — the internal list is cleared after this call.
    /// Call <see cref="RestoreToQueue"/> if the upload fails.
    /// </summary>
    public List<VisitEntry> Dequeue()
    {
        lock (_pendingLock)
        {
            var snapshot = new List<VisitEntry>(_pending);
            _pending.Clear();
            PersistToPreferences(); // Write empty list
            return snapshot;
        }
    }

    /// <summary>
    /// Returns the number of pending visits waiting for upload.
    /// </summary>
    public int PendingCount
    {
        get { lock (_pendingLock) return _pending.Count; }
    }

    /// <summary>
    /// Restore a batch back to the queue after a failed upload.
    /// </summary>
    public void RestoreToQueue(IReadOnlyList<VisitEntry> entries)
    {
        lock (_pendingLock)
        {
            _pending.InsertRange(0, entries);
            PersistToPreferences();
        }
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private void PersistToPreferences()
    {
        try
        {
            var json = JsonSerializer.Serialize(_pending, JsonOpts);
            Preferences.Default.Set(PrefKey, json);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[VisitQueueStore] Persist failed: {ex.Message}");
        }
    }

    private void RestoreFromPreferences()
    {
        try
        {
            var json = Preferences.Default.Get(PrefKey, string.Empty);
            if (string.IsNullOrWhiteSpace(json)) return;

            var entries = JsonSerializer.Deserialize<List<VisitEntry>>(json, JsonOpts);
            if (entries is { Count: > 0 })
            {
                lock (_pendingLock)
                    _pending.AddRange(entries);

                System.Diagnostics.Debug.WriteLine(
                    $"[VisitQueueStore] Restored {entries.Count} pending visits from crash backup.");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[VisitQueueStore] Restore failed: {ex.Message}");
        }
    }
}
