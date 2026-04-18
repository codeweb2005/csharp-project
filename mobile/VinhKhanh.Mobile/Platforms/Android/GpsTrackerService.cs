using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.OS;
using AndroidX.Core.App;
using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;

namespace VinhKhanh.Mobile.Platforms.Android;

/// <summary>
/// Android Foreground Service for continuous GPS tracking.
///
/// Architecture:
///   MauiProgram registers <see cref="AndroidLocationService"/> (which wraps this service)
///   as <c>ILocationService</c> on Android. When StartTrackingAsync() is called:
///     1. AndroidLocationService starts this ForegroundService via Intent.
///     2. This service acquires a persistent notification so Android OS keeps it alive.
///     3. Location fixes are received via FusedLocationProviderClient (preferred)
///        or MAUI Essentials Geolocation as fallback.
///     4. Each fix is broadcast via WeakReferenceMessenger (LocationUpdateMessage)
///        so AndroidLocationService can raise its LocationUpdated event.
///
/// Notification channel: "vk_gps_channel" (created once in MainApplication or here).
/// The notification is required by Android 8+ for ForegroundService to survive.
///
/// Thread-safety:
///   OnStartCommand and location callbacks run on the main Looper.
///   StopSelf is called when the cancellation token is cancelled.
/// </summary>
// ForegroundServiceType is declared in AndroidManifest.xml (API 29+). Min SDK is 26.
[Service(Enabled = true)]
public class GpsTrackerService : Service
{
    // ── Constants ──────────────────────────────────────────────────────────────
    internal const string ChannelId    = "vk_gps_channel";
    internal const string ChannelName  = "GPS Location Tracking";
    internal const int    NotificationId = 1001;

    internal const string ActionStart  = "VK_GPS_START";
    internal const string ActionStop   = "VK_GPS_STOP";

    // Extra keys passed in the start Intent
    internal const string ExtraPollMs  = "poll_interval_ms";

    // ── State ──────────────────────────────────────────────────────────────────
    private CancellationTokenSource? _cts;
    private bool _isRunning;

    // ── Service lifecycle ──────────────────────────────────────────────────────

    public override IBinder? OnBind(Intent? intent) => null; // Not a bound service

    public override StartCommandResult OnStartCommand(Intent? intent, StartCommandFlags flags, int startId)
    {
        if (intent?.Action == ActionStop)
        {
            StopTracking();
            return StartCommandResult.NotSticky;
        }

        if (_isRunning) return StartCommandResult.Sticky;

        // Retrieve poll interval from the calling intent (ms)
        var pollMs = intent?.GetIntExtra(ExtraPollMs, 5000) ?? 5000;

        EnsureNotificationChannel();
        if (OperatingSystem.IsAndroidVersionAtLeast(29))
            StartForeground(NotificationId, BuildNotification(), ForegroundService.TypeLocation);
        else
            StartForeground(NotificationId, BuildNotification());

        _cts = new CancellationTokenSource();
        _isRunning = true;

        _ = PollLoopAsync(TimeSpan.FromMilliseconds(pollMs), _cts.Token);

        return StartCommandResult.Sticky; // Restart if killed by OS
    }

    public override void OnDestroy()
    {
        StopTracking();
        base.OnDestroy();
    }

    // ── Polling loop ──────────────────────────────────────────────────────────

    private async Task PollLoopAsync(TimeSpan interval, CancellationToken token)
    {
        // Use High accuracy so Android reads fresh GPS fixes instead of returning
        // stale cached locations. This is critical for emulator mock locations
        // (adb emu geo fix) and third-party GPS simulation apps on physical devices.
        // PRIORITY_HIGH_ACCURACY forces the fused location provider to use the GPS
        // hardware provider, which is the only one that receives mock coordinates.
        const GeolocationAccuracy accuracy = GeolocationAccuracy.High;

        while (!token.IsCancellationRequested)
        {
            try
            {
                var request  = new GeolocationRequest(accuracy, TimeSpan.FromSeconds(5));
                var location = await Geolocation.GetLocationAsync(request, token).ConfigureAwait(false);

                if (location is not null)
                {
                    System.Diagnostics.Debug.WriteLine(
                        $"[GpsTrackerService] Fix: {location.Latitude:F6}, {location.Longitude:F6} " +
                        $"± {location.Accuracy ?? 0:F0}m (isFromMockProvider={location.IsFromMockProvider})");

                    WeakReferenceMessenger.Default.Send(
                        new LocationUpdateMessage(location.Latitude, location.Longitude,
                            location.Accuracy ?? 0));
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine(
                        "[GpsTrackerService] GetLocationAsync returned null — no GPS provider available.");
                }
            }
            catch (FeatureNotEnabledException)
            {
                UpdateNotificationText("⚠️ GPS disabled on device");
                System.Diagnostics.Debug.WriteLine("[GpsTrackerService] GPS is disabled on device.");
            }
            catch (System.OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[GpsTrackerService] Error: {ex.Message}");
            }

            try
            {
                await Task.Delay(interval, token).ConfigureAwait(false);
            }
            catch (System.OperationCanceledException)
            {
                break;
            }
        }

        _isRunning = false;
        StopSelf();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void StopTracking()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
        _isRunning = false;
        StopForeground(StopForegroundFlags.Remove);
    }

    private void EnsureNotificationChannel()
    {
        if (Build.VERSION.SdkInt < BuildVersionCodes.O) return;

        var manager = (NotificationManager?)GetSystemService(NotificationService);
        if (manager?.GetNotificationChannel(ChannelId) is not null) return;

        var channel = new NotificationChannel(ChannelId, ChannelName, NotificationImportance.Low)
        {
            Description = "Used to keep GPS active while touring Vinh Khanh food street."
        };
        manager?.CreateNotificationChannel(channel);
    }

    private Notification BuildNotification(string message = "📍 Tracking your location...")
    {
        // Tap notification → bring app to foreground
        var intent = global::Android.App.Application.Context
            .PackageManager
            ?.GetLaunchIntentForPackage(global::Android.App.Application.Context.PackageName ?? "");

        var pendingFlags = Build.VERSION.SdkInt >= BuildVersionCodes.S
            ? PendingIntentFlags.UpdateCurrent | PendingIntentFlags.Immutable
            : PendingIntentFlags.UpdateCurrent;

        var pendingIntent = PendingIntent.GetActivity(
            global::Android.App.Application.Context, 0, intent, pendingFlags);

        return new NotificationCompat.Builder(this, ChannelId)
            .SetContentTitle("🍜 Vinh Khanh Food Tour")
            .SetContentText(message)
            .SetSmallIcon(Resource.Drawable.ic_notification)
            .SetOngoing(true)
            .SetPriority(NotificationCompat.PriorityLow)
            .SetContentIntent(pendingIntent)
            .Build()!;
    }

    private void UpdateNotificationText(string message)
    {
        var manager = (NotificationManager?)GetSystemService(NotificationService);
        manager?.Notify(NotificationId, BuildNotification(message));
    }
}

/// <summary>
/// MVVM Toolkit messenger message carrying a GPS fix from GpsTrackerService
/// to AndroidLocationService (decoupled, cross-service communication).
/// </summary>
public sealed class LocationUpdateMessage : ValueChangedMessage<(double Lat, double Lng, double AccuracyMeters)>
{
    public LocationUpdateMessage(double lat, double lng, double accuracy)
        : base((lat, lng, accuracy)) { }
}
