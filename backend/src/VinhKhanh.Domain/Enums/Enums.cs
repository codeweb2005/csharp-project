namespace VinhKhanh.Domain.Enums;

public enum UserRole
{
    Customer = 0,
    Vendor = 1,
    Admin = 2,
    /// <summary>
    /// Anonymous walk-in tourist authenticated via QR session token.
    /// Short-lived JWT (24h), no email/password required.
    /// </summary>
    Tourist = 3
}

public enum MediaType
{
    Image = 0,
    Video = 1,
    Thumbnail360 = 2
}

public enum VoiceType
{
    Recorded = 0,
    TTS = 1
}

public enum TriggerType
{
    GeofenceEnter = 0,
    GeofenceExit = 1,
    Manual = 2,
    List = 3
}

public enum NarrationMode
{
    Auto = 0,
    RecordedOnly = 1,
    TTSOnly = 2,
    TextOnly = 3
}

public enum PackageStatus
{
    Draft = 0,
    Building = 1,
    Active = 2,
    Failed = 3
}
