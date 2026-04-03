using SQLite;

namespace VinhKhanh.Mobile.Models;

/// <summary>SQLite row for POI data used when offline or merged from online nearby responses.</summary>
[Table("offline_pois")]
public class OfflinePoiRecord
{
    [PrimaryKey]
    public string Key { get; set; } = "";

    public int PoiId { get; set; }
    public int LanguageId { get; set; }
    public int SourcePackageId { get; set; }

    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadiusMeters { get; set; }
    public int Priority { get; set; }
    public string CategoryIcon { get; set; } = "";
    public string CategoryName { get; set; } = "";
    public string? NarrationText { get; set; }
    public string LangCode { get; set; } = "vi";

    /// <summary>Absolute path to extracted MP3 from an offline package, if any.</summary>
    public string? LocalAudioPath { get; set; }

    /// <summary>Last known HTTPS stream URL when merged from online API (works only online).</summary>
    public string? CachedStreamUrl { get; set; }
}
