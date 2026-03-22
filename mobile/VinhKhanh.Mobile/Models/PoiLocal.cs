using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.Models;

/// <summary>
/// Local in-memory model representing a Point of Interest for the PoC.
///
/// In Phase 3 this will become a SQLite-net-pcl model ([Table("POIs")])
/// stored on-device for offline-first operation. For Phase 2 PoC the list
/// is populated directly from the API response on each app launch.
///
/// Maps from: <see cref="NearbyPoiDto"/> returned by GET /pois/nearby.
/// </summary>
public class PoiLocal
{
    /// <summary>POI database ID (matches backend).</summary>
    public int Id { get; set; }

    /// <summary>Display name in the user's current language.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Street address.</summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>Decimal latitude (WGS-84).</summary>
    public double Latitude { get; set; }

    /// <summary>Decimal longitude (WGS-84).</summary>
    public double Longitude { get; set; }

    /// <summary>Geofence trigger radius in metres.</summary>
    public int GeofenceRadiusMeters { get; set; } = 50;

    /// <summary>
    /// Priority value for geofence conflict resolution.
    /// When two POIs overlap, the engine fires GeofenceEntered for the highest Priority.
    /// </summary>
    public int Priority { get; set; }

    /// <summary>Category emoji icon (e.g. "🍜").</summary>
    public string CategoryIcon { get; set; } = string.Empty;

    /// <summary>Human-readable category name.</summary>
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>Distance from the user's current location in metres (set by API).</summary>
    public double DistanceMeters { get; set; }

    /// <summary>
    /// Direct audio stream URL for the narration MP3.
    /// Null if no audio file has been uploaded for this POI + language.
    /// </summary>
    public string? AudioUrl { get; set; }

    /// <summary>
    /// Narration text for TTS fallback when AudioUrl is null.
    /// </summary>
    public string? NarrationText { get; set; }

    /// <summary>BCP-47 language code for TTS (e.g. "vi", "en").</summary>
    public string? LangCode { get; set; }

    // ── Computed display helpers ───────────────────────────────────────────────

    /// <summary>Formatted distance string shown in the POI list row.</summary>
    public string DistanceDisplay => DistanceMeters < 1000
        ? $"{(int)DistanceMeters}m"
        : $"{DistanceMeters / 1000:F1}km";

    /// <summary>Short label shown under the POI name: "{icon} {category}".</summary>
    public string CategoryLabel => $"{CategoryIcon} {CategoryName}".Trim();

    /// <summary>Convert a <see cref="NearbyPoiDto"/> API response to a local model.</summary>
    public static PoiLocal FromDto(NearbyPoiDto dto) => new()
    {
        Id                  = dto.Id,
        Name                = dto.Name,
        Address             = dto.Address,
        Latitude            = dto.Latitude,
        Longitude           = dto.Longitude,
        GeofenceRadiusMeters= dto.GeofenceRadiusMeters,
        Priority            = dto.Priority,
        CategoryIcon        = dto.CategoryIcon,
        CategoryName        = dto.CategoryName,
        DistanceMeters      = dto.DistanceMeters,
        AudioUrl            = dto.AudioUrl,
        NarrationText       = dto.NarrationText,
        LangCode            = dto.LangCode,
    };
}
