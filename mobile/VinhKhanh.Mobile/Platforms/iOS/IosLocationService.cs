using CoreLocation;
using Foundation;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.Platforms.iOS;

/// <summary>
/// iOS-native location delegate using CoreLocation for background GPS.
///
/// Architecture:
///   - Wraps <c>CLLocationManager</c> (native iOS GPS API) which supports background
///     location updates via the "location" UIBackgroundMode.
///   - <see cref="IosCLLocationDelegate"/> is set as CLLocationManager.Delegate.
///   - Location fixes are forwarded to <see cref="IosLocationService"/> which raises
///     <see cref="ILocationService.LocationUpdated"/> consumed by GeofenceEngine.
///
/// Background requirements (must be set in Info.plist):
///   - UIBackgroundModes → location
///   - NSLocationAlwaysAndWhenInUseUsageDescription
///   - NSLocationAlwaysUsageDescription
///   - allowsBackgroundLocationUpdates = true (set in IosLocationService)
///
/// Battery optimisation:
///   - desiredAccuracy = kCLLocationAccuracyNearestTenMeters (10m — sufficient for 25m geofences)
///   - distanceFilter = 5.0  (only fire if user moved ≥ 5m — reduces idle callbacks)
///   - pausesLocationUpdatesAutomatically = false (prevents iOS pausing GPS in static environments)
/// </summary>
public sealed class IosCLLocationDelegate : CLLocationManagerDelegate
{
    private readonly Action<CLLocation> _onLocation;
    private readonly Action<NSError>    _onError;

    public IosCLLocationDelegate(Action<CLLocation> onLocation, Action<NSError> onError)
    {
        _onLocation = onLocation;
        _onError    = onError;
    }

    /// <summary>Called by CLLocationManager on each GPS fix (or batch of fixes).</summary>
    public override void LocationsUpdated(CLLocationManager manager, CLLocation[] locations)
    {
        // Use the most recent fix in the batch
        var latest = locations.LastOrDefault();
        if (latest is not null)
            _onLocation(latest);
    }

    /// <summary>Called when CLLocationManager fails (e.g. kCLErrorLocationUnknown).</summary>
    public override void Failed(CLLocationManager manager, NSError error)
    {
        // kCLErrorLocationUnknown (code 0) is transient — GPS will retry automatically
        if (error.Code != (nint)CLError.LocationUnknown)
            _onError(error);
    }

    /// <summary>
    /// Called when authorization changes (e.g. user goes to Settings and changes permission).
    /// iOS 14+ uses this delegate method; earlier versions use DidChangeAuthorizationStatus.
    /// </summary>
    public override void AuthorizationChanged(CLLocationManager manager, CLAuthorizationStatus status)
    {
        System.Diagnostics.Debug.WriteLine($"[IosCLLocationDelegate] Authorization changed: {status}");
    }
}

/// <summary>
/// iOS-specific implementation of <see cref="ILocationService"/> using CLLocationManager.
///
/// Provides background GPS (when screen is locked) via:
///   manager.AllowsBackgroundLocationUpdates = true
///   manager.PausesLocationUpdatesAutomatically = false
///
/// Registered in MauiProgram.cs via #if IOS conditional.
/// </summary>
public sealed class IosLocationService : ILocationService
{
    // ── CLLocationManager ─────────────────────────────────────────────────────
    private CLLocationManager? _manager;
    private IosCLLocationDelegate? _delegate;

    // ── ILocationService state ────────────────────────────────────────────────
    public Location? LastKnownLocation { get; private set; }
    public bool IsTracking { get; private set; }
    public event EventHandler<LocationUpdate>? LocationUpdated;

    // ── ILocationService API ──────────────────────────────────────────────────

    public async Task StartTrackingAsync()
    {
        if (IsTracking) return;

        // Request permission (WhenInUse first, then Always for background)
        var status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
        if (status != PermissionStatus.Granted)
        {
            System.Diagnostics.Debug.WriteLine("[IosLocationService] WhenInUse permission denied.");
            return;
        }

        // Request Always permission for background tracking
        var alwaysStatus = await Permissions.RequestAsync<Permissions.LocationAlways>();
        if (alwaysStatus != PermissionStatus.Granted)
        {
            System.Diagnostics.Debug.WriteLine("[IosLocationService] Always permission denied — background GPS unavailable.");
            // Continue with WhenInUse only (GPS stops when app is backgrounded)
        }

        // CLLocationManager must be created and configured on the main thread (UI thread).
        await MainThread.InvokeOnMainThreadAsync(() =>
        {
            _delegate = new IosCLLocationDelegate(
                onLocation: OnLocationReceived,
                onError: err => System.Diagnostics.Debug.WriteLine($"[IosLocationService] CLError: {err.LocalizedDescription}"));

            _manager = new CLLocationManager
            {
                Delegate                          = _delegate,
                DesiredAccuracy                   = CLLocation.AccuracyNearestTenMeters,
                DistanceFilter                    = 5.0,  // metres — avoid noise
                PausesLocationUpdatesAutomatically = false,
                AllowsBackgroundLocationUpdates   = alwaysStatus == PermissionStatus.Granted,
                ShowsBackgroundLocationIndicator  = true  // blue status bar pill on iOS
            };

            _manager.StartUpdatingLocation();
            IsTracking = true;
        });
    }

    public Task StopTrackingAsync()
    {
        if (!IsTracking) return Task.CompletedTask;

        MainThread.BeginInvokeOnMainThread(() =>
        {
            _manager?.StopUpdatingLocation();
            _manager = null;
            _delegate = null;
        });

        IsTracking = false;
        return Task.CompletedTask;
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private void OnLocationReceived(CLLocation loc)
    {
        var accuracy = loc.HorizontalAccuracy >= 0 ? loc.HorizontalAccuracy : 0;

        LastKnownLocation = new Location
        {
            Latitude  = loc.Coordinate.Latitude,
            Longitude = loc.Coordinate.Longitude,
            Accuracy  = accuracy
        };

        LocationUpdated?.Invoke(this,
            new LocationUpdate(loc.Coordinate.Latitude, loc.Coordinate.Longitude, accuracy));
    }
}
