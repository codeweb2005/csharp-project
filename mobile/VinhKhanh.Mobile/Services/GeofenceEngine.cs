using VinhKhanh.Mobile.Models;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Represents the geofence state of a single POI.
/// </summary>
internal enum GeofenceState
{
    Unknown,    // Initial state — no reading yet
    Outside,    // User is outside the geofence radius
    Inside      // User is inside the geofence radius
}

/// <summary>
/// Geofence engine that monitors POI proximity and fires enter/exit events.
///
/// Algorithm (v2 — with Hysteresis + PendingQueue):
///   1. On each GPS update, compute Haversine distance to every loaded POI.
///   2. Maintain per-POI state machine (Unknown → Outside ↔ Inside).
///   3. ENTER debounce: fire GeofenceEntered after DebounceCount consecutive in-range
///      readings — prevents false triggers from GPS jitter.
///   4. EXIT hysteresis: a POI must be Outside for HysteresisCount consecutive
///      readings before GeofenceExited fires — prevents flickering at boundaries.
///   5. Priority + Exclusive lock:
///      - Only ONE POI can be "active" at a time (_activePoi).
///      - When a second POI triggers while one is active, it is added to _pendingQueue
///        (sorted by Priority DESC, then DistanceMeters ASC).
///      - After _activePoi exits, the next POI is dequeued and its GeofenceEntered fires.
///   6. Cooldown: prevents replay when the tourist stands still.
///
/// Thread-safety: all state is modified on the thread that calls OnLocationUpdated
/// (the background GPS polling thread). Subscribers dispatch to main/UI thread.
/// </summary>
public class GeofenceEngine
{
    /// <summary>Default consecutive in-range readings before GeofenceEntered fires.</summary>
    public const int DefaultDebounceReadings = 3;

    /// <summary>Default consecutive out-of-range readings before GeofenceExited fires (hysteresis).</summary>
    public const int DefaultHysteresisReadings = 2;

    // ── Dependencies ──────────────────────────────────────────────────────────
    private readonly ILocationService _locationService;

    // ── Configuration ─────────────────────────────────────────────────────────
    /// <summary>
    /// Number of consecutive in-range GPS readings before GeofenceEntered fires.
    /// At 5s poll interval, 3 readings ≈ 15 seconds dwell time.
    /// </summary>
    public int DebounceCount { get; set; } = DefaultDebounceReadings;

    /// <summary>
    /// Number of consecutive out-of-range GPS readings before GeofenceExited fires.
    /// Prevents flickering when user stands at the boundary of two POIs.
    /// Default: 2 readings (10s at 5s interval).
    /// </summary>
    public int HysteresisCount { get; set; } = DefaultHysteresisReadings;

    /// <summary>
    /// Minimum time before the same POI can trigger GeofenceEntered again.
    /// Prevents replaying narration when the tourist stands still inside a geofence.
    /// Default: 10 minutes. Set to TimeSpan.Zero to disable cooldown.
    /// </summary>
    public TimeSpan CooldownDuration { get; set; } = TimeSpan.FromMinutes(10);

    // ── State ─────────────────────────────────────────────────────────────────
    private List<PoiLocal> _pois = [];
    private readonly Dictionary<int, GeofenceState> _states       = []; // POI ID → state
    private readonly Dictionary<int, int>           _debounce     = []; // POI ID → in-range reading count
    private readonly Dictionary<int, int>           _hysteresis   = []; // POI ID → consecutive out-of-range count
    private readonly Dictionary<int, DateTime>      _cooldownUntil = []; // POI ID → cooldown expiry (UTC)

    /// <summary>
    /// Currently-active POI (narration playing or just triggered).
    /// Only ONE can be active at a time — others queue up.
    /// </summary>
    private PoiLocal? _activePoi;

    /// <summary>
    /// POIs waiting to trigger after the currently-active one exits.
    /// Sorted: Priority DESC, Distance ASC. Populated during overlap resolution.
    /// </summary>
    private readonly Queue<PendingPoiEntry> _pendingQueue = new();

    // ── Events ────────────────────────────────────────────────────────────────
    /// <summary>Fired when the user has dwelt inside a POI's geofence long enough.</summary>
    public event EventHandler<PoiLocal>? GeofenceEntered;

    /// <summary>Fired when the user has been out-of-range for HysteresisCount readings.</summary>
    public event EventHandler<PoiLocal>? GeofenceExited;

    // ── Constructor ───────────────────────────────────────────────────────────
    public GeofenceEngine(ILocationService locationService)
    {
        _locationService = locationService;
        _locationService.LocationUpdated += OnLocationUpdated;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /// <summary>
    /// Replace the POI watch list. Called after fetching nearby POIs from the API.
    /// Resets all debounce/hysteresis counts and states for new/changed POIs.
    /// Cooldown timers are preserved across list refreshes (intentional —
    /// we do not want to replay audio just because the list was refreshed).
    /// </summary>
    public void LoadPOIs(IEnumerable<PoiLocal> pois)
    {
        _pois = [.. pois];

        var newIds = _pois.Select(p => p.Id).ToHashSet();

        // Remove stale state entries for POIs no longer in the list
        foreach (var id in _states.Keys.Where(id => !newIds.Contains(id)).ToList())
        {
            _states.Remove(id);
            _debounce.Remove(id);
            _hysteresis.Remove(id);
            _cooldownUntil.Remove(id);
        }

        // Init state for newly added POIs
        foreach (var poi in _pois)
        {
            _states.TryAdd(poi.Id, GeofenceState.Unknown);
            _debounce.TryAdd(poi.Id, 0);
            _hysteresis.TryAdd(poi.Id, 0);
            // Do NOT reset _cooldownUntil — preserve existing cooldowns
        }
    }

    /// <summary>
    /// Apply cooldown to a POI after its narration finishes.
    /// Called from MainViewModel when PlaybackCompleted fires.
    /// </summary>
    public void SetCooldown(int poiId)
    {
        if (CooldownDuration <= TimeSpan.Zero) return;
        _cooldownUntil[poiId] = DateTime.UtcNow + CooldownDuration;
    }

    /// <summary>Reset cooldown for a POI — e.g. when user taps "Play Again".</summary>
    public void ResetCooldown(int poiId)
    {
        _cooldownUntil.Remove(poiId);
    }

    /// <summary>
    /// Notify the engine that the active POI's narration has finished.
    /// Dequeues and fires the next pending POI (if any).
    /// Call this from MainViewModel after PlaybackCompleted.
    /// </summary>
    public void NotifyNarrationCompleted(int poiId)
    {
        if (_activePoi?.Id != poiId) return;

        _activePoi = null;
        SetCooldown(poiId);

        if (_pendingQueue.TryDequeue(out var next) && _pois.FirstOrDefault(p => p.Id == next.PoiId) is { } poi)
        {
            _activePoi = poi;
            GeofenceEntered?.Invoke(this, poi);
            System.Diagnostics.Debug.WriteLine($"[GeofenceEngine] Dequeued pending POI: {poi.Name}");
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Called on every GPS fix. Runs the full geofence state machine for all loaded POIs.
    /// </summary>
    private void OnLocationUpdated(object? sender, LocationUpdate update)
    {
        List<(PoiLocal poi, double dist)> newEntries = [];

        foreach (var poi in _pois)
        {
            double dist   = HaversineMeters(update.Lat, update.Lng, poi.Latitude, poi.Longitude);
            bool   inRange = dist <= poi.GeofenceRadiusMeters;
            var    prev    = _states.GetValueOrDefault(poi.Id, GeofenceState.Unknown);

            if (inRange)
            {
                // ── Enter debounce ─────────────────────────────────────────────
                _debounce[poi.Id]++;
                _hysteresis[poi.Id] = 0; // reset exit hysteresis while inside

                if (_debounce[poi.Id] >= DebounceCount && prev != GeofenceState.Inside)
                {
                    _states[poi.Id] = GeofenceState.Inside;

                    var now      = DateTime.UtcNow;
                    var cooldown = _cooldownUntil.GetValueOrDefault(poi.Id, DateTime.MinValue);
                    if (now >= cooldown)
                        newEntries.Add((poi, dist));
                    else
                        System.Diagnostics.Debug.WriteLine(
                            $"[GeofenceEngine] {poi.Name} in cooldown for {(cooldown - now).TotalSeconds:F0}s more.");
                }
            }
            else
            {
                // ── Exit hysteresis ────────────────────────────────────────────
                _debounce[poi.Id] = 0;

                if (prev == GeofenceState.Inside)
                {
                    _hysteresis[poi.Id]++;

                    // Only fire GeofenceExited after HysteresisCount consecutive out-of-range readings
                    if (_hysteresis[poi.Id] >= HysteresisCount)
                    {
                        _states[poi.Id]    = GeofenceState.Outside;
                        _hysteresis[poi.Id] = 0;

                        if (_activePoi?.Id == poi.Id)
                        {
                            var exited = _activePoi;
                            _activePoi = null;
                            GeofenceExited?.Invoke(this, exited);

                            // Dequeue next pending POI (if any)
                            DequeueNextPending();
                        }
                        else
                        {
                            // Remove from pending queue if still waiting
                            RemoveFromPending(poi.Id);
                        }
                    }
                }
                else if (prev == GeofenceState.Unknown)
                {
                    _states[poi.Id] = GeofenceState.Outside;
                }
            }
        }

        // ── Priority & Exclusive-lock resolution ──────────────────────────────
        if (newEntries.Count > 0)
        {
            // Sort: Priority DESC (higher wins), then Distance ASC (closer wins)
            var sorted = newEntries.OrderByDescending(e => e.poi.Priority)
                                   .ThenBy(e => e.dist)
                                   .ToList();

            if (_activePoi == null)
            {
                // No active POI — fire the top-priority one immediately
                var winner = sorted[0].poi;
                _activePoi = winner;
                GeofenceEntered?.Invoke(this, winner);
                System.Diagnostics.Debug.WriteLine($"[GeofenceEngine] Entered (immediate): {winner.Name}");

                // Queue the rest
                for (int i = 1; i < sorted.Count; i++)
                    _pendingQueue.Enqueue(new PendingPoiEntry(sorted[i].poi.Id, sorted[i].poi.Priority, sorted[i].dist));
            }
            else
            {
                // Another POI is active — queue all new entries
                foreach (var (poi, dist2) in sorted)
                {
                    _pendingQueue.Enqueue(new PendingPoiEntry(poi.Id, poi.Priority, dist2));
                    System.Diagnostics.Debug.WriteLine($"[GeofenceEngine] Queued (overlap): {poi.Name} (pending count={_pendingQueue.Count})");
                }
            }
        }
    }

    private void DequeueNextPending()
    {
        while (_pendingQueue.TryDequeue(out var next))
        {
            var poi = _pois.FirstOrDefault(p => p.Id == next.PoiId);
            if (poi == null) continue;

            // Ensure it's still inside the geofence
            if (_states.GetValueOrDefault(poi.Id) != GeofenceState.Inside) continue;

            // Check cooldown
            var cooldown = _cooldownUntil.GetValueOrDefault(poi.Id, DateTime.MinValue);
            if (DateTime.UtcNow < cooldown) continue;

            _activePoi = poi;
            GeofenceEntered?.Invoke(this, poi);
            System.Diagnostics.Debug.WriteLine($"[GeofenceEngine] Dequeued next: {poi.Name}");
            return;
        }
    }

    private void RemoveFromPending(int poiId)
    {
        // Queue doesn't support removal — rebuild without that POI
        var items = _pendingQueue.ToArray();
        _pendingQueue.Clear();
        foreach (var item in items.Where(i => i.PoiId != poiId))
            _pendingQueue.Enqueue(item);
    }

    /// <summary>
    /// Haversine formula — great-circle distance between two lat/lng points in metres.
    /// </summary>
    public static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6_371_000; // Earth's radius in metres

        double dLat = ToRad(lat2 - lat1);
        double dLng = ToRad(lng2 - lng1);

        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                 + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                 * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;

    // ── Internal record for pending queue ─────────────────────────────────────
    private readonly record struct PendingPoiEntry(int PoiId, int Priority, double DistanceMeters);
}
