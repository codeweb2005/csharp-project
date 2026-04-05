namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Cross-platform GPS polling service — foreground fallback for non-Android platforms.
///
/// Platform routing (registered in MauiProgram.cs):
///   Android → AndroidLocationService (wraps GpsTrackerService ForegroundService)
///             so GPS continues when the screen is off or app is in background.
///   iOS     → IosCLLocationDelegate (T-02) will replace this for iOS background mode.
///   Other   → This polling implementation (Windows, MacCatalyst) — foreground only is acceptable.
///
/// This class is retained for:
///   1. Windows/MacCatalyst targets where background GPS is not required.
///   2. Simulator testing where platform services are unavailable.
///
/// Thread-safety: LocationUpdated is raised from a background Task. UI subscribers
/// must dispatch to the main thread via MainThread.BeginInvokeOnMainThread().
/// </summary>
public class LocationService : ILocationService
{
    // ── Configuration ──────────────────────────────────────────────────────────
    private readonly TimeSpan _pollInterval;

    // ── State ──────────────────────────────────────────────────────────────────
    private CancellationTokenSource? _cts;

    public Location? LastKnownLocation { get; private set; }
    public bool IsTracking { get; private set; }

    /// <summary>True if the app has LocationAlways permission; false if only WhenInUse.</summary>
    public bool IsUsingAlwaysPermission { get; private set; }

    /// <inheritdoc/>
    public event EventHandler<LocationUpdate>? LocationUpdated;

    public LocationService(int pollIntervalSeconds = 5)
    {
        _pollInterval = TimeSpan.FromSeconds(pollIntervalSeconds);
    }

    /// <summary>
    /// Request the best available location permission, then start the polling loop.
    /// Upgrade order: LocationAlways → LocationWhenInUse → denied (abort).
    /// Safe to call multiple times — subsequent calls are no-ops while already tracking.
    /// </summary>
    public async Task StartTrackingAsync()
    {
        if (IsTracking) return;

        // ── Permission check — try for Always first ────────────────────────
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
        // First ensure WhenInUse is granted (required before requesting Always)
        var whenInUse = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
        if (whenInUse != PermissionStatus.Granted)
        {
            await ShowSettingsGuidanceAsync();
            return PermissionLevel.Denied;
        }

        // Attempt LocationAlways upgrade (Android 10+ / iOS — goes through system settings)
        try
        {
            var always = await Permissions.RequestAsync<Permissions.LocationAlways>();
            if (always == PermissionStatus.Granted)
                return PermissionLevel.Always;
        }
        catch (Exception ex)
        {
            // Some platforms throw if the permission type is not available
            Console.WriteLine($"[LocationService] LocationAlways request error: {ex.Message}");
        }

        // Fallback: WhenInUse granted but Always denied
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
    /// Background loop: wakes every <see cref="_pollInterval"/>, gets a GPS fix,
    /// stores it, and fires <see cref="LocationUpdated"/>.
    /// </summary>
    private async Task PollLoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try
            {
                // DesiredAccuracy: Medium balances battery vs precision.
                // For geofences of 50m radius, this is accurate enough.
                var request = new GeolocationRequest(GeolocationAccuracy.Medium, TimeSpan.FromSeconds(3));
                var location = await Geolocation.GetLocationAsync(request, token);

                if (location is not null)
                {
                    LastKnownLocation = location;
                    var update = new LocationUpdate(location.Latitude, location.Longitude,
                        location.Accuracy ?? 0);

                    // Raise event (subscribers must marshal to UI thread if needed)
                    LocationUpdated?.Invoke(this, update);
                }
            }
            catch (FeatureNotEnabledException)
            {
                // GPS is disabled on the device — notify once, keep looping so we recover
                // when the user re-enables GPS without restarting the app.
                Console.WriteLine("[LocationService] GPS is disabled on device.");
            }
            catch (OperationCanceledException)
            {
                // Normal stop — exit the loop
                break;
            }
            catch (Exception ex)
            {
                // Log unexpected errors but continue polling
                Console.WriteLine($"[LocationService] Unexpected error: {ex.Message}");
            }

            await Task.Delay(_pollInterval, token).ConfigureAwait(false);
        }

        IsTracking = false;
    }
}
