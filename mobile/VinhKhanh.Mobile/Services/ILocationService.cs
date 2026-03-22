namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Represents a single GPS position fix from the device.
/// </summary>
/// <param name="Lat">Latitude in decimal degrees.</param>
/// <param name="Lng">Longitude in decimal degrees.</param>
/// <param name="AccuracyMeters">Horizontal accuracy in metres (lower = better).</param>
public record LocationUpdate(double Lat, double Lng, double AccuracyMeters);

/// <summary>
/// Abstracts GPS location tracking.
/// Implementations poll or subscribe to the device GPS and fire
/// <see cref="LocationUpdated"/> on each new position fix.
///
/// Usage:
///   await locationService.StartTrackingAsync();
///   locationService.LocationUpdated += (_, update) => { ... };
///   await locationService.StopTrackingAsync();
/// </summary>
public interface ILocationService
{
    /// <summary>Start continuous GPS tracking.</summary>
    Task StartTrackingAsync();

    /// <summary>Stop GPS tracking and release resources.</summary>
    Task StopTrackingAsync();

    /// <summary>Fired on each GPS position fix while tracking is active.</summary>
    event EventHandler<LocationUpdate> LocationUpdated;

    /// <summary>The last successfully obtained location, or null if not yet acquired.</summary>
    Location? LastKnownLocation { get; }

    /// <summary>True while tracking is running.</summary>
    bool IsTracking { get; }
}
