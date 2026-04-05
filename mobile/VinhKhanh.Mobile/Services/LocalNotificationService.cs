namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Cross-platform local notification service.
///
/// Usage pattern:
///   - MainViewModel injects this service.
///   - When GeofenceEntered fires and app is in background → SendGeofenceNotificationAsync()
///   - When app is in foreground → auto-play narration directly (no notification).
///
/// Platform implementations:
///   Android → NotificationManager channel "vk_geo_channel" (sound + vibrate)
///   iOS     → UNUserNotificationCenter trigger (immediate, no time interval required)
///   Other   → no-op (Windows/MacCatalyst don't need this for real-world use)
/// </summary>
public class LocalNotificationService
{
    // ── Constants ──────────────────────────────────────────────────────────────
    private const string GeofenceChannelId   = "vk_geo_channel";
    private const string GeofenceChannelName = "Nearby Food Spots";
    private const int    GeofenceNotifId     = 2001;

    // ── State ──────────────────────────────────────────────────────────────────
    private bool _isInitialized;

    // ── Public API ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Request notification permission (Android 13+ / iOS).
    /// Call once from MauiProgram or App.OnStart.
    /// </summary>
    public async Task RequestPermissionAsync()
    {
        try
        {
#if ANDROID
            if (OperatingSystem.IsAndroidVersionAtLeast(33))
            {
                var status = await Permissions.RequestAsync<Permissions.PostNotifications>();
                _isInitialized = status == PermissionStatus.Granted;
                Console.WriteLine($"[LocalNotification] Android POST_NOTIFICATIONS: {status}");
            }
            else
            {
                _isInitialized = true; // Pre-API-33 doesn't need runtime permission
            }
#elif IOS
            _isInitialized = await RequestIosPermissionAsync();
#else
            _isInitialized = true;
#endif
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LocalNotification] RequestPermissionAsync error: {ex.Message}");
        }
    }

    /// <summary>
    /// Send a "nearby POI" notification when the app is in the background.
    /// </summary>
    /// <param name="poiName">POI name to show in the notification body.</param>
    public async Task SendGeofenceNotificationAsync(string poiName)
    {
        if (!_isInitialized)
        {
            Console.WriteLine("[LocalNotification] Not initialized — skipping notification.");
            return;
        }

        try
        {
#if ANDROID
            SendAndroidGeofenceNotification(poiName);
#elif IOS
            await SendIosGeofenceNotificationAsync(poiName);
#else
            Console.WriteLine($"[LocalNotification] Platform notification skipped for: {poiName}");
            await Task.CompletedTask;
#endif
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LocalNotification] SendGeofenceNotificationAsync error: {ex.Message}");
        }
    }

    // ── Android ────────────────────────────────────────────────────────────────

#if ANDROID
    private void SendAndroidGeofenceNotification(string poiName)
    {
        var context = global::Android.App.Application.Context;
        var manager = (global::Android.App.NotificationManager?)context
            .GetSystemService(global::Android.Content.Context.NotificationService);

        if (manager is null) return;

        EnsureAndroidGeoChannel(manager);

        // Build a tap intent that brings the app to the foreground
        var launchIntent = context.PackageManager
            ?.GetLaunchIntentForPackage(context.PackageName ?? "");

        var pendingFlags = OperatingSystem.IsAndroidVersionAtLeast(31)
            ? global::Android.App.PendingIntentFlags.UpdateCurrent
              | global::Android.App.PendingIntentFlags.Immutable
            : global::Android.App.PendingIntentFlags.UpdateCurrent;

        var pendingIntent = global::Android.App.PendingIntent.GetActivity(
            context, GeofenceNotifId, launchIntent, pendingFlags);

        var notification = new AndroidX.Core.App.NotificationCompat.Builder(context, GeofenceChannelId)
            .SetContentTitle("🍜 Vinh Khanh Food Tour")
            .SetContentText($"📍 {poiName} — Nhấn để nghe thuyết minh")
            .SetSmallIcon(global::VinhKhanh.Mobile.Resource.Drawable.ic_notification)
            .SetPriority(AndroidX.Core.App.NotificationCompat.PriorityHigh)
            .SetAutoCancel(true)
            .SetVibrate([0L, 300L, 100L, 300L])
            .SetContentIntent(pendingIntent)
            .Build();

        manager.Notify(GeofenceNotifId, notification);
        Console.WriteLine($"[LocalNotification] Android notification sent for: {poiName}");
    }

    private static void EnsureAndroidGeoChannel(global::Android.App.NotificationManager manager)
    {
        if (!OperatingSystem.IsAndroidVersionAtLeast(26)) return;
        if (manager.GetNotificationChannel(GeofenceChannelId) is not null) return;

        var channel = new global::Android.App.NotificationChannel(
            GeofenceChannelId,
            GeofenceChannelName,
            global::Android.App.NotificationImportance.High)
        {
            Description = "Notifies you when you are near a food spot on Vinh Khanh street."
        };
        channel.EnableVibration(true);
        manager.CreateNotificationChannel(channel);
    }
#endif

    // ── iOS ────────────────────────────────────────────────────────────────────

#if IOS
    private static async Task<bool> RequestIosPermissionAsync()
    {
        var center = UserNotifications.UNUserNotificationCenter.Current;
        var (granted, error) = await center.RequestAuthorizationAsync(
            UserNotifications.UNAuthorizationOptions.Alert
            | UserNotifications.UNAuthorizationOptions.Sound
            | UserNotifications.UNAuthorizationOptions.Badge);

        if (error is not null)
            Console.WriteLine($"[LocalNotification] iOS auth error: {error.LocalizedDescription}");

        Console.WriteLine($"[LocalNotification] iOS notification granted: {granted}");
        return granted;
    }

    private static async Task SendIosGeofenceNotificationAsync(string poiName)
    {
        var content = new UserNotifications.UNMutableNotificationContent
        {
            Title = "🍜 Vinh Khanh Food Tour",
            Body  = $"📍 {poiName} — Nhấn để nghe thuyết minh",
            Sound = UserNotifications.UNNotificationSound.Default
        };

        var request = UserNotifications.UNNotificationRequest.FromIdentifier(
            $"geofence_{Guid.NewGuid():N}",
            content,
            null); // null trigger = send immediately

        var center = UserNotifications.UNUserNotificationCenter.Current;
        var error = await center.AddNotificationRequestAsync(request);

        if (error is not null)
            Console.WriteLine($"[LocalNotification] iOS send error: {error.LocalizedDescription}");
        else
            Console.WriteLine($"[LocalNotification] iOS notification sent for: {poiName}");
    }
#endif
}
