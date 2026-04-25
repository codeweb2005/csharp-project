namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Cross-platform GPS polling service — foreground fallback for non-Android platforms.
///
/// Platform routing (registered in MauiProgram.cs):
///   Android → AndroidLocationService (wraps GpsTrackerService ForegroundService)
///             so GPS continues when the screen is off or app is in background.
///   iOS     → IosCLLocationDelegate (T-02) will replace this for iOS background mode.
///   Other   → This polling implementation (Windows, MacCatalyst) — foreground only.
///
/// v2 — Adaptive polling interval:
///   Instead of a fixed 5-second interval, the poll frequency adapts to the tourist's
///   movement speed derived from consecutive GPS readings:
///
///   | Speed              | Poll Interval | Rationale                        |
///   |--------------------|---------------|----------------------------------|
///   | < 0.5 m/s (still) | 15 s          | Standing still — save battery    |
///   | 0.5–2 m/s (walk)  | 5 s           | Normal walking speed             |
///   | > 2 m/s (vehicle) | 3 s           | Moving fast, fast geofence update|
///
/// Thread-safety: LocationUpdated is raised from a background Task. UI subscribers
/// must dispatch to the main thread via MainThread.BeginInvokeOnMainThread().
/// </summary>
public class LocationService : ILocationService
{
    // ── Adaptive interval thresholds ───────────────────────────────────────────
    private static readonly TimeSpan IntervalStationary = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan IntervalWalking    = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan IntervalVehicle    = TimeSpan.FromSeconds(3);

    private const double SpeedThresholdStationary = 0.5; // m/s
    private const double SpeedThresholdVehicle    = 2.0; // m/s

    // ── State ──────────────────────────────────────────────────────────────────
    private CancellationTokenSource? _cts;
    private Location? _prevLocation;       // previous fix for speed calculation
    private TimeSpan  _currentInterval = IntervalWalking; // start with walking speed

    public Location? LastKnownLocation { get; private set; }
    public bool IsTracking { get; private set; }

    /// <summary>
    /// Current GPU poll interval, adapted from last-known speed.
    /// Exposed for diagnostics / UI display.
    /// </summary>
    public TimeSpan CurrentPollInterval => _currentInterval;

    /// <summary>True if the app has LocationAlways permission; false if only WhenInUse.</summary>
    public bool IsUsingAlwaysPermission { get; private set; }

    /// <inheritdoc/>
    public event EventHandler<LocationUpdate>? LocationUpdated;

    public LocationService() { }

    /// <summary>
    /// Request the best available location permission, then start the adaptive polling loop.
    /// Safe to call multiple times — subsequent calls are no-ops while already tracking.
    /// </summary>
    public async Task StartTrackingAsync()
    {
        if (IsTracking) return;

        var permissionLevel = await RequestBestLocationPermissionAsync();
        if (permissionLevel == PermissionLevel.Denied)
        {
            Console.WriteLine("[LocationService] Location permission denied.");
            return;
        }

        IsUsingAlwaysPermission = permissionLevel == PermissionLevel.Always;
        Preferences.Default.Set("location_permission_level", (int)permissionLevel);
        Console.WriteLine($"[LocationService] Permission granted: {permissionLevel}");

        IsTracking = true;
        _cts = new CancellationTokenSource();
        _ = PollLoopAsync(_cts.Token);     // Fire-and-forget on background thread
    }

    /// <summary>Stop the polling loop and release the CancellationTokenSource.</summary>
    public Task StopTrackingAsync()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
        IsTracking = false;
        return Task.CompletedTask;
    }

    // ── Permission helpers ─────────────────────────────────────────────────────

    private enum PermissionLevel { Denied, WhenInUse, Always }

    private static async Task<PermissionLevel> RequestBestLocationPermissionAsync()
    {
#if ANDROID || IOS
        var whenInUse = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
        if (whenInUse != PermissionStatus.Granted)
        {
            await ShowSettingsGuidanceAsync();
            return PermissionLevel.Denied;
        }

        try
        {
            var always = await Permissions.RequestAsync<Permissions.LocationAlways>();
            if (always == PermissionStatus.Granted)
                return PermissionLevel.Always;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LocationService] LocationAlways request error: {ex.Message}");
        }

        await ShowWhenInUseFallbackToastAsync();
        return PermissionLevel.WhenInUse;
#else
        var status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
        return status == PermissionStatus.Granted ? PermissionLevel.WhenInUse : PermissionLevel.Denied;
#endif
    }

    private static Task ShowSettingsGuidanceAsync()
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            bool openSettings = await Shell.Current.DisplayAlert(
                "Location Required",
                "Vinh Khanh Food Tour needs location access to detect nearby street food spots. " +
                "Please enable \"Location\" in Settings → App → Location.",
                "Open Settings",
                "Not Now");

            if (openSettings)
                AppInfo.ShowSettingsUI();
        });
        return Task.CompletedTask;
    }

    private static Task ShowWhenInUseFallbackToastAsync()
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            await Shell.Current.DisplayAlert(
                "Background GPS Limited",
                "GPS tracking will pause when the screen is off. " +
                "For the best experience, set Location to \"Always\" in Settings → App → Location.",
                "OK");
        });
        return Task.CompletedTask;
    }

    // ── Private ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Adaptive polling loop.
    /// After each GPS fix, calculates speed from the previous fix and adjusts
    /// the next sleep interval accordingly — less frequent when stationary (battery),
    /// more frequent when moving fast (accuracy).
    /// </summary>
    private async Task PollLoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try
            {
                var request  = new GeolocationRequest(GeolocationAccuracy.High, TimeSpan.FromSeconds(5));
                var location = await Geolocation.GetLocationAsync(request, token);

                if (location is not null)
                {
                    LastKnownLocation = location;

                    // ── Adaptive interval calculation ──────────────────────────
                    double speedMs = 0;
                    if (_prevLocation is not null)
                    {
                        double distM  = location.CalculateDistance(_prevLocation, DistanceUnits.Kilometers) * 1000.0;
                        double timeSec = (location.Timestamp - _prevLocation.Timestamp).TotalSeconds;
                        speedMs = timeSec > 0 ? distM / timeSec : 0;
                    }
                    _prevLocation    = location;
                    _currentInterval = SpeedToInterval(speedMs);

                    var update = new LocationUpdate(location.Latitude, location.Longitude,
                        location.Accuracy ?? 0, speedMs);

                    Console.WriteLine(
                        $"[LocationService] Fix: {location.Latitude:F6},{location.Longitude:F6} " +
                        $"±{location.Accuracy ?? 0:F0}m speed={speedMs:F1}m/s → next={_currentInterval.TotalSeconds}s");

                    LocationUpdated?.Invoke(this, update);
                }
                else
                {
                    Console.WriteLine("[LocationService] GetLocationAsync returned null.");
                }
            }
            catch (FeatureNotEnabledException)
            {
                Console.WriteLine("[LocationService] GPS is disabled on device.");
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LocationService] Unexpected error: {ex.Message}");
            }

            await Task.Delay(_currentInterval, token).ConfigureAwait(false);
        }

        IsTracking = false;
    }

    /// <summary>Maps speed in m/s to the appropriate poll interval.</summary>
    private static TimeSpan SpeedToInterval(double speedMs) => speedMs switch
    {
        < SpeedThresholdStationary => IntervalStationary,  // standing still → 15s
        < SpeedThresholdVehicle    => IntervalWalking,     // walking       → 5s
        _                          => IntervalVehicle      // vehicle       → 3s
    };
}
