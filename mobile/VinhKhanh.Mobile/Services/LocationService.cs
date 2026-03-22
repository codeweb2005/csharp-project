namespace VinhKhanh.Mobile.Services;

/// <summary>
/// GPS location service that polls the device at a configurable interval.
///
/// For the PoC we use the simpler polling approach (GetLocationAsync every N seconds).
/// Phase 3 will upgrade this to a platform foreground service (Android) / background mode (iOS)
/// using Geolocation.StartListeningForegroundAsync() so GPS continues when the screen is off.
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

    /// <inheritdoc/>
    public event EventHandler<LocationUpdate>? LocationUpdated;

    public LocationService(int pollIntervalSeconds = 5)
    {
        _pollInterval = TimeSpan.FromSeconds(pollIntervalSeconds);
    }

    /// <summary>
    /// Request location permission, then start the polling loop.
    /// Safe to call multiple times — subsequent calls are no-ops while already tracking.
    /// </summary>
    public async Task StartTrackingAsync()
    {
        if (IsTracking) return;

        // ── Permission check ─────────────────────────────────────────────────
        var status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
        if (status != PermissionStatus.Granted)
        {
            // TODO: show a user-facing explanation if permission was denied
            Console.WriteLine("[LocationService] Location permission denied.");
            return;
        }

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
