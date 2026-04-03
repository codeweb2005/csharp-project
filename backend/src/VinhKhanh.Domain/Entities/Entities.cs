using VinhKhanh.Domain.Enums;

namespace VinhKhanh.Domain.Entities;

public class Language : BaseEntity
{
    public string Code { get; set; } = string.Empty;          // ISO 639-1: "vi", "en", "zh"
    public string Name { get; set; } = string.Empty;          // English name: "Vietnamese"
    public string NativeName { get; set; } = string.Empty;    // Native: "Tiếng Việt"
    public string FlagEmoji { get; set; } = string.Empty;     // "🇻🇳"
    /// <summary>Azure TTS locale code, e.g. "vi-VN", "en-US". Null if TTS not supported.</summary>
    public string? TtsCode { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;       // Unique, used for login
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Customer;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public int? PreferredLanguageId { get; set; }
    public bool IsActive { get; set; } = true;
    public bool EmailConfirmed { get; set; } = false;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    /// <summary>SHA-256 hex of the plain reset token (never store the raw token).</summary>
    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Language? PreferredLanguage { get; set; }
    public ICollection<POI> VendorPOIs { get; set; } = [];  // All POIs owned by this vendor
}

public class Category : BaseEntity
{
    public string Icon { get; set; } = string.Empty;          // "🦪"
    public string Color { get; set; } = "#3b82f6";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<CategoryTranslation> Translations { get; set; } = [];
    public ICollection<POI> POIs { get; set; } = [];
}

public class CategoryTranslation
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation
    public Category Category { get; set; } = null!;
    public Language Language { get; set; } = null!;
}

public class POI : BaseEntity
{
    public int CategoryId { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadius { get; set; } = 25;
    /// <summary>
    /// Geofence conflict priority. When two POI geofences overlap, the mobile app
    /// plays the narration for the POI with the highest Priority value.
    /// Default 0 = normal priority.
    /// </summary>
    public int Priority { get; set; } = 0;
    public decimal? PriceRangeMin { get; set; }
    public decimal? PriceRangeMax { get; set; }
    public string? OpeningHours { get; set; }             // JSON
    public double Rating { get; set; }
    public int TotalVisits { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int? VendorUserId { get; set; }

    // Navigation
    public Category Category { get; set; } = null!;
    public User? VendorUser { get; set; }
    public ICollection<POITranslation> Translations { get; set; } = [];
    public ICollection<POIMedia> Media { get; set; } = [];
    public ICollection<AudioNarration> AudioNarrations { get; set; } = [];
    public ICollection<POIMenuItem> MenuItems { get; set; } = [];
    public ICollection<VisitHistory> Visits { get; set; } = [];
}

public class POITranslation
{
    public int Id { get; set; }
    public int POIId { get; set; }
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string? FullDescription { get; set; }
    public string? NarrationText { get; set; }
    public string? Highlights { get; set; }               // JSON array

    // Navigation
    public POI POI { get; set; } = null!;
    public Language Language { get; set; } = null!;
}

public class POIMedia : BaseEntity
{
    public int POIId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public MediaType MediaType { get; set; } = MediaType.Image;
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public long FileSize { get; set; }

    // Navigation
    public POI POI { get; set; } = null!;
}

public class AudioNarration : BaseEntity
{
    public int POIId { get; set; }
    public int LanguageId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public VoiceType VoiceType { get; set; }
    public string? VoiceName { get; set; }                // "vi-VN-HoaiMyNeural"
    public int Duration { get; set; }                     // seconds
    public long FileSize { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public POI POI { get; set; } = null!;
    public Language Language { get; set; } = null!;
}

public class POIMenuItem : BaseEntity
{
    public int POIId { get; set; }
    public decimal Price { get; set; }
    public string? ImagePath { get; set; }
    public bool IsSignature { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int SortOrder { get; set; }

    // Navigation
    public POI POI { get; set; } = null!;
    public ICollection<MenuItemTranslation> Translations { get; set; } = [];
}

public class MenuItemTranslation
{
    public int Id { get; set; }
    public int MenuItemId { get; set; }
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Navigation
    public POIMenuItem MenuItem { get; set; } = null!;
    public Language Language { get; set; } = null!;
}

public class VisitHistory : BaseEntity
{
    public int POIId { get; set; }
    public int? UserId { get; set; }
    public int LanguageId { get; set; }
    public TriggerType TriggerType { get; set; }
    public bool NarrationPlayed { get; set; }
    public int ListenDuration { get; set; }
    public DateTime VisitedAt { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? DeviceId { get; set; }

    // Navigation
    public POI POI { get; set; } = null!;
    public User? User { get; set; }
    public Language Language { get; set; } = null!;
}

public class OfflinePackage : BaseEntity
{
    public int LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
    public PackageStatus Status { get; set; } = PackageStatus.Draft;
    public int Progress { get; set; }
    public string? CurrentStep { get; set; }
    public string? FilePath { get; set; }
    public long? FileSize { get; set; }
    public string? Checksum { get; set; }
    public int DownloadCount { get; set; }
    public int POICount { get; set; }
    public int AudioCount { get; set; }
    public int ImageCount { get; set; }

    // Navigation
    public Language Language { get; set; } = null!;
}

public class SystemSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Projection class used for the raw SQL nearby query in POIService.GetNearbyAsync.
/// Maps the Id and calculated DistanceMeters columns from ST_Distance_Sphere.
/// Not a persisted entity — only used for the raw SQL result projection.
/// </summary>
public class PoiDistanceResult
{
    public int Id { get; set; }
    public double DistanceMeters { get; set; }
}
