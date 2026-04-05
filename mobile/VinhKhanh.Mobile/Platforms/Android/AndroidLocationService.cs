using Android.Content;
using CommunityToolkit.Mvvm.Messaging;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.Platforms.Android;

/// <summary>
/// Android-specific implementation of <see cref="ILocationService"/>.
///
/// On Android, GPS tracking is managed by <see cref="GpsTrackerService"/> (a Foreground Service)
/// so the OS keeps the GPS active even when the screen is off. This class:
///   1. Acts as the DI-registered <c>ILocationService</c> singleton on Android.
///   2. Starts/stops the GpsTrackerService via Intent.
///   3. Subscribes to <see cref="LocationUpdateMessage"/> (via WeakReferenceMessenger)
///      to re-raise the <see cref="LocationUpdated"/> event consumed by GeofenceEngine.
///
/// Contrast with the cross-platform <see cref="LocationService"/> which uses polling
/// (foreground only). This class replaces it entirely on Android.
/// </summary>
public sealed class AndroidLocationService : ILocationService
{
    // ── Configuration ──────────────────────────────────────────────────────────
    private readonly int _pollIntervalSeconds;

    // ── State ──────────────────────────────────────────────────────────────────
    public Location? LastKnownLocation { get; private set; }
    public bool IsTracking { get; private set; }

    // ── Events ─────────────────────────────────────────────────────────────────
    public event EventHandler<LocationUpdate>? LocationUpdated;

    // ── Constructor ────────────────────────────────────────────────────────────
    public AndroidLocationService(int pollIntervalSeconds = 5)
    {
        _pollIntervalSeconds = pollIntervalSeconds;

        // Subscribe to location fixes broadcast from GpsTrackerService
        WeakReferenceMessenger.Default.Register<LocationUpdateMessage>(
            this,
            (_, msg) =>
            {
                var (lat, lng, accuracy) = msg.Value;
                LastKnownLocation = new Location { Latitude = lat, Longitude = lng, Accuracy = accuracy };
                LocationUpdated?.Invoke(this, new LocationUpdate(lat, lng, accuracy));
            });
    }

    // ── ILocationService ──────────────────────────────────────────────────────

    /// <summary>
    /// Requests location permission then starts the GPS Foreground Service.
    /// Safe to call multiple times — no-op when already tracking.
    /// </summary>
    public async Task StartTrackingAsync()
    {
        if (IsTracking) return;

        // Request fine location permission first. For background tracking on Android 10+
        // ACCESS_BACKGROUND_LOCATION must be separately requested (T-03).
        var status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
        if (status != PermissionStatus.Granted)
        {
            Console.WriteLine("[AndroidLocationService] Location permission denied.");
            return;
        }

        // Attempt to upgrade to background location (Android 10+, API 29+)
        // This may show a second OS dialog directing the user to Settings > Always.
        if (OperatingSystem.IsAndroidVersionAtLeast(29))
        {
            var bgStatus = await Permissions.RequestAsync<Permissions.LocationAlways>();
            if (bgStatus != PermissionStatus.Granted)
            {
                Console.WriteLine("[AndroidLocationService] Background location denied — foreground-only tracking.");
                // Continue with foreground-only; GPS stops when screen is off but service stays alive.
            }
        }

        IsTracking = true;

        var context = global::Android.App.Application.Context;
        var intent  = new Intent(context, typeof(GpsTrackerService));
        intent.SetAction(GpsTrackerService.ActionStart);
        intent.PutExtra(GpsTrackerService.ExtraPollMs, _pollIntervalSeconds * 1000);

        // StartForegroundService is required on Android 8+ (API 26+)
        context.StartForegroundService(intent);
    }

    /// <summary>
    /// Stops the GPS Foreground Service and cleans up resources.
    /// </summary>
    public Task StopTrackingAsync()
    {
        if (!IsTracking) return Task.CompletedTask;

        IsTracking = false;

        var context = global::Android.App.Application.Context;
        var intent  = new Intent(context, typeof(GpsTrackerService));
        intent.SetAction(GpsTrackerService.ActionStop);
        context.StartService(intent);

        WeakReferenceMessenger.Default.Unregister<LocationUpdateMessage>(this);
        return Task.CompletedTask;
    }
}
