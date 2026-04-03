namespace VinhKhanh.Mobile.Services;

/// <summary>GET /pois/nearby item — matches backend <c>NearbyPOIDto</c> JSON shape.</summary>
public sealed class NearbyPoiResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadius { get; set; }
    public int Priority { get; set; }
    public string CategoryIcon { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public double DistanceMeters { get; set; }
    public List<NearbyAudioItem> Audio { get; set; } = [];
    public List<NearbyTranslationItem> Translations { get; set; } = [];
}

public sealed class NearbyAudioItem
{
    public int Id { get; set; }
    public int LanguageId { get; set; }
    public bool IsDefault { get; set; }
}

public sealed class NearbyTranslationItem
{
    public int LanguageId { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string? NarrationText { get; set; }
}

public sealed class LanguageResponse
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NativeName { get; set; } = string.Empty;
    public string? FlagEmoji { get; set; }

    public string DisplayLabel => $"{FlagEmoji} {NativeName} ({Code})".Trim();
}

public sealed class LoginEnvelopeUser
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public sealed class LoginEnvelopeData
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public LoginEnvelopeUser? User { get; set; }
}

public sealed class ApiEnvelope<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public ApiErrorInfo? Error { get; set; }
}

public sealed class ApiErrorInfo
{
    public string? Code { get; set; }
    public string? Message { get; set; }
}

public sealed class ForgotPasswordEnvelopeData
{
    public string? Message { get; set; }
    public string? ResetToken { get; set; }
}

// ---- Offline packages (GET /offlinepackages/catalog + manifest.json in ZIP) ----

public sealed class OfflinePackageCatalogItemDto
{
    public int Id { get; set; }
    public int LanguageId { get; set; }
    public string LanguageName { get; set; } = string.Empty;
    public string FlagEmoji { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public long? FileSize { get; set; }
    public string? Checksum { get; set; }
    public int POICount { get; set; }
    public int AudioCount { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public string SizeLabel => FileSize is long n ? $"{n / 1024 / 1024.0:0.#} MB" : "—";
}

public sealed class OfflineManifestV1
{
    public int SchemaVersion { get; set; }
    public int PackageId { get; set; }
    public int LanguageId { get; set; }
    public string LanguageCode { get; set; } = "vi";
    public string Version { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; }
    public string ContentChecksum { get; set; } = string.Empty;
    public List<OfflineManifestPoiV1> Pois { get; set; } = [];
}

public sealed class OfflineManifestPoiV1
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadius { get; set; }
    public int Priority { get; set; }
    public string CategoryIcon { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string? NarrationText { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public int? AudioNarrationId { get; set; }
    public string? AudioEntry { get; set; }
}
