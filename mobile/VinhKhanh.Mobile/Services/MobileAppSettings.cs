using System.Text.Json;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Settings read once from embedded appsettings.json (same resource as <see cref="ApiClient"/>).
/// </summary>
public sealed class MobileAppSettings
{
    public string ApiBaseUrl { get; }
    public int DefaultRadiusMeters { get; }
    public int DebounceReadings { get; }
    public int LocationPollIntervalSeconds { get; }
    /// <summary>Minutes before the same POI can trigger narration again. Default: 5.</summary>
    public int GeofenceCooldownMinutes { get; }

    public MobileAppSettings(string apiBaseUrl, int defaultRadiusMeters, int debounceReadings,
        int locationPollIntervalSeconds, int geofenceCooldownMinutes = 5)
    {
        ApiBaseUrl = apiBaseUrl.TrimEnd('/');
        DefaultRadiusMeters = defaultRadiusMeters;
        DebounceReadings = debounceReadings;
        LocationPollIntervalSeconds = locationPollIntervalSeconds;
        GeofenceCooldownMinutes = geofenceCooldownMinutes;
    }

    public static MobileAppSettings LoadDefault()
    {
        try
        {
            var asm = typeof(MobileAppSettings).Assembly;
            var resourceName = asm.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith("appsettings.json", StringComparison.Ordinal))
                ?? throw new InvalidOperationException("appsettings.json embedded resource not found.");

            using var stream = asm.GetManifestResourceStream(resourceName)!;
            using var doc = JsonDocument.Parse(stream);
            var root = doc.RootElement;

            var url      = root.GetProperty("ApiBaseUrl").GetString() ?? "http://10.0.2.2:5015/api/v1";
            var radius   = root.TryGetProperty("DefaultRadiusMeters", out var r) ? r.GetInt32() : 500;
            var debounce = root.TryGetProperty("DebounceReadings",    out var d) ? d.GetInt32() : 3;
            var poll     = root.TryGetProperty("LocationPollIntervalSeconds", out var p) ? p.GetInt32() : 5;
            var cooldown = root.TryGetProperty("GeofenceCooldownMinutes", out var c) ? c.GetInt32() : 5;

            return new MobileAppSettings(url, radius, debounce, poll, cooldown);
        }
        catch
        {
            return new MobileAppSettings("http://10.0.2.2:5015/api/v1", 80, 3, 4, 10);
        }
    }
}
