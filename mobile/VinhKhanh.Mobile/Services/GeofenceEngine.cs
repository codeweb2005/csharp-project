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
/// Algorithm:
///   1. On each GPS update, compute Haversine distance to every loaded POI.
///   2. Maintain a per-POI state machine (Unknown → Outside ↔ Inside).
///   3. Debounce: only fire GeofenceEntered after DebounceCount consecutive
///      in-range readings, preventing false triggers from GPS jitter.
///   4. Priority: when multiple POIs trigger simultaneously, only fire the
///      one with the highest Priority value (lower = more important is convention
///      here; adjust per product decision).
///   5. Fire GeofenceExited immediately (no debounce) when the user leaves.
///
/// Thread-safety: all state is modified on the thread that calls OnLocationUpdated,
/// which is the background polling thread from LocationService. GeofenceEntered and
/// GeofenceExited are raised on that same thread — subscribers dispatch to UI thread.
/// </summary>
public class GeofenceEngine
{
    // ── Dependencies ───────────────────────────────────────────────────────────
    private readonly ILocationService _locationService;

    // ── Configuration ──────────────────────────────────────────────────────────
    /// <summary>
    /// Number of consecutive in-range GPS readings before GeofenceEntered fires.
    /// At 5s poll interval, 3 readings ≈ 15 seconds dwell time.
    /// </summary>
    public int DebounceCount { get; set; } = 3;

    // ── State ──────────────────────────────────────────────────────────────────
    private List<PoiLocal> _pois = [];
    private readonly Dictionary<int, GeofenceState> _states  = [];   // POI ID → state
    private readonly Dictionary<int, int>           _debounce = [];  // POI ID → in-range reading count

    // Track which POI is currently "active" so we fire GeofenceExited correctly
    private PoiLocal? _activePoi;

    // ── Events ─────────────────────────────────────────────────────────────────
    /// <summary>Fired when the user has dwelt inside a POI's geofence long enough.</summary>
    public event EventHandler<PoiLocal>? GeofenceEntered;

    /// <summary>Fired immediately when the user leaves a POI's geofence.</summary>
    public event EventHandler<PoiLocal>? GeofenceExited;

    // ── Constructor ────────────────────────────────────────────────────────────
    public GeofenceEngine(ILocationService locationService)
    {
        _locationService = locationService;
        _locationService.LocationUpdated += OnLocationUpdated;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Replace the POI watch list. Called after fetching nearby POIs from the API.
    /// Resets all debounce counts and states for new/changed POIs.
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
        }

        // Init state for newly added POIs
        foreach (var poi in _pois)
        {
            _states.TryAdd(poi.Id, GeofenceState.Unknown);
            _debounce.TryAdd(poi.Id, 0);
        }
    }

    // ── Private ────────────────────────────────────────────────────────────────

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
                if (_debounce[poi.Id] == DebounceCount && prev != GeofenceState.Inside)
                {
                    _states[poi.Id] = GeofenceState.Inside;
                    newEntries.Add(poi);
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
    /// Haversine formula — great-circle distance between two lat/lng points in metres.
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
