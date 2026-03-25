using VinhKhanh.Mobile.Models;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Represents the geofence state of a single POI.
/// </summary>
internal enum GeofenceState
{
    Unknown,    // Initial state â€” no reading yet
    Outside,    // User is outside the geofence radius
    Inside      // User is inside the geofence radius
}

/// <summary>
/// Geofence engine that monitors POI proximity and fires enter/exit events.
///
/// Algorithm:
///   1. On each GPS update, compute Haversine distance to every loaded POI.
///   2. Maintain a per-POI state machine (Unknown â†’ Outside â†” Inside).
///   3. Debounce: only fire GeofenceEntered after DebounceCount consecutive
///      in-range readings, preventing false triggers from GPS jitter.
///   4. Priority: when multiple POIs trigger simultaneously, only fire the
///      one with the highest Priority value (lower = more important is convention
///      here; adjust per product decision).
///   5. Fire GeofenceExited immediately (no debounce) when the user leaves.
///
/// Thread-safety: all state is modified on the thread that calls OnLocationUpdated,
/// which is the background polling thread from LocationService. GeofenceEntered and
/// GeofenceExited are raised on that same thread â€” subscribers dispatch to UI thread.
/// </summary>
public class GeofenceEngine
{
    /// <summary>Default consecutive in-range readings before <see cref="GeofenceEntered"/> fires.</summary>
    public const int DefaultDebounceReadings = 3;

    // â”€â”€ Dependencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private readonly ILocationService _locationService;

    // â”€â”€ Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    /// <summary>
    /// Number of consecutive in-range GPS readings before GeofenceEntered fires.
    /// At 5s poll interval, 3 readings â‰ˆ 15 seconds dwell time.
    /// </summary>
    public int DebounceCount { get; set; } = DefaultDebounceReadings;

    /// <summary>
    /// Minimum time before the same POI can trigger GeofenceEntered again.
    /// Prevents replaying narration when the tourist stands still inside a geofence.
    /// Default: 10 minutes. Set to TimeSpan.Zero to disable cooldown.
    /// </summary>
    public TimeSpan CooldownDuration { get; set; } = TimeSpan.FromMinutes(10);

    // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private List<PoiLocal> _pois = [];
    private readonly Dictionary<int, GeofenceState> _states    = [];   // POI ID â†’ state
    private readonly Dictionary<int, int>           _debounce  = [];   // POI ID â†’ in-range reading count
    private readonly Dictionary<int, DateTime>      _cooldownUntil = []; // POI ID â†’ cooldown expiry (UTC)

    // Track which POI is currently "active" so we fire GeofenceExited correctly
    private PoiLocal? _activePoi;

    // â”€â”€ Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    /// <summary>Fired when the user has dwelt inside a POI's geofence long enough.</summary>
    public event EventHandler<PoiLocal>? GeofenceEntered;

    /// <summary>Fired immediately when the user leaves a POI's geofence.</summary>
    public event EventHandler<PoiLocal>? GeofenceExited;

    // â”€â”€ Constructor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public GeofenceEngine(ILocationService locationService)
    {
        _locationService = locationService;
        _locationService.LocationUpdated += OnLocationUpdated;
    }

    // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /// <summary>
    /// Replace the POI watch list. Called after fetching nearby POIs from the API.
    /// Resets all debounce counts and states for new/changed POIs.
    /// Cooldown timers are preserved across list refreshes (intentional â€”
    /// we do not want to replay audio just because the list was refreshed).
    /// </summary>
    public void LoadPOIs(IEnumerable<PoiLocal> pois)
    {
        _pois = [.. pois];

        // Remove stale state entries for POIs no longer in the list
        var newIds = _pois.Select(p => p.Id).ToHashSet();
        foreach (var id in _states.Keys.Where(id => !newIds.Contains(id)).ToList())
        {
            _states.Remove(id);
            _debounce.Remove(id);
            _cooldownUntil.Remove(id);
        }

        // Init state for newly added POIs
        foreach (var poi in _pois)
        {
            _states.TryAdd(poi.Id, GeofenceState.Unknown);
            _debounce.TryAdd(poi.Id, 0);
            // Do NOT reset _cooldownUntil â€” preserve existing cooldowns
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

    /// <summary>
    /// Reset cooldown for a POI â€” e.g. when user taps "Play Again" manually.
    /// </summary>
    public void ResetCooldown(int poiId)
    {
        _cooldownUntil.Remove(poiId);
    }

    // â”€â”€ Private â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /// <summary>
    /// Called on every GPS fix. Runs the geofence state machine for all POIs.
    /// </summary>
    private void OnLocationUpdated(object? sender, LocationUpdate update)
    {
        // Collect all POIs that just transitioned to "inside" this tick
        List<PoiLocal> newEntries = [];

        foreach (var poi in _pois)
        {
            double dist = HaversineMeters(update.Lat, update.Lng, poi.Latitude, poi.Longitude);
            bool inRange = dist <= poi.GeofenceRadiusMeters;

            var prev = _states.GetValueOrDefault(poi.Id, GeofenceState.Unknown);

            if (inRange)
            {
                _debounce[poi.Id]++;

                // Only fire GeofenceEntered once per entry (after debounce threshold)
                // AND only when not in cooldown (prevents replay when standing still).
                if (_debounce[poi.Id] == DebounceCount && prev != GeofenceState.Inside)
                {
                    _states[poi.Id] = GeofenceState.Inside;

                    // Check cooldown before queuing as a triggerable entry
                    var now = DateTime.UtcNow;
                    var cooldown = _cooldownUntil.GetValueOrDefault(poi.Id, DateTime.MinValue);
                    if (now >= cooldown)
                        newEntries.Add(poi);
                    else
                        System.Diagnostics.Debug.WriteLine($"[GeofenceEngine] {poi.Name} in cooldown for {(cooldown - now).TotalSeconds:F0}s more.");
                }
            }
            else
            {
                // Reset debounce counter on any out-of-range reading
                _debounce[poi.Id] = 0;

                if (prev == GeofenceState.Inside)
                {
                    _states[poi.Id] = GeofenceState.Outside;

                    // Fire ExitedGeofence immediately (no debounce)
                    if (_activePoi?.Id == poi.Id)
                    {
                        _activePoi = null;
                        GeofenceExited?.Invoke(this, poi);
                    }
                }
                else if (prev == GeofenceState.Unknown)
                {
                    _states[poi.Id] = GeofenceState.Outside;
                }
            }
        }

        // Priority resolution: if multiple POIs trigger simultaneously,
        // emit only the one with the highest Priority (highest int value wins).
        if (newEntries.Count > 0)
        {
            var winner = newEntries.OrderByDescending(p => p.Priority).First();
            _activePoi = winner;
            GeofenceEntered?.Invoke(this, winner);
        }
    }

    /// <summary>
    /// Haversine formula â€” great-circle distance between two lat/lng points in metres.
    /// More accurate than Euclidean for distances across the Earth's curved surface.
    /// </summary>
    /// <param name="lat1">Latitude of point A in decimal degrees.</param>
    /// <param name="lng1">Longitude of point A in decimal degrees.</param>
    /// <param name="lat2">Latitude of point B in decimal degrees.</param>
    /// <param name="lng2">Longitude of point B in decimal degrees.</param>
    /// <returns>Distance in metres.</returns>
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
}
