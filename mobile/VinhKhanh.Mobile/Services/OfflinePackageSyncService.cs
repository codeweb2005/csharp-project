using System.IO.Compression;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using System.Globalization;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Downloads admin-built offline ZIPs, extracts them, and imports <c>manifest.json</c> into <see cref="OfflineCacheStore"/>.
/// </summary>
public sealed class OfflinePackageSyncService(ApiClient api, OfflineCacheStore cache, ILogger<OfflinePackageSyncService>? logger = null)
{
    private static readonly JsonSerializerOptions JsonRead = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public const string PrefPackageId  = "vk_offline_package_id";
    public const string PrefChecksum   = "vk_offline_package_checksum";
    public const string PrefRoot       = "vk_offline_extract_root";
    public const string PrefLanguageId = "vk_offline_language_id";
    public const string PrefLastSync   = "last_sync_time";  // T-09

    public int? GetInstalledPackageId()
    {
        var v = Preferences.Default.Get(PrefPackageId, -1);
        return v < 0 ? null : v;
    }

    public string? GetInstalledChecksum()
    {
        var s = Preferences.Default.Get(PrefChecksum, string.Empty);
        return string.IsNullOrEmpty(s) ? null : s;
    }

    /// <summary>T-09: Get the UTC time of the last successful delta sync.</summary>
    public DateTime? GetLastSyncTime()
    {
        var raw = Preferences.Default.Get(PrefLastSync, string.Empty);
        if (string.IsNullOrEmpty(raw)) return null;
        return DateTime.TryParse(raw, null, DateTimeStyles.RoundtripKind, out var dt) ? dt : null;
    }

    /// <summary>T-09.1: Fetch delta changes from the server and upsert into local cache.</summary>
    /// <param name="langId">Preferred language for translations.</param>
    /// <param name="ct">Cancellation token.</param>
    public async Task<(bool Ok, string? Error)> SyncDeltaAsync(int langId, CancellationToken ct = default)
    {
        try
        {
            var since    = GetLastSyncTime();
            var sinceStr = since?.ToString("o") ?? DateTime.UtcNow.AddDays(-30).ToString("o"); // default: last 30 days

            var result = await api.GetDeltaAsync(sinceStr, langId, ct);
            if (result is null)
                return (false, "Delta sync returned no data.");

            // Upsert POI changes into local cache
            if (result.Pois?.Count > 0)
            {
                var poisLocal = result.Pois.Select(d => new VinhKhanh.Mobile.Models.PoiLocal
                {
                    Id                  = d.Id,
                    Name                = d.Name,
                    Address             = d.Address ?? string.Empty,
                    Latitude            = d.Latitude,
                    Longitude           = d.Longitude,
                    GeofenceRadiusMeters = d.GeofenceRadius,
                    Priority            = d.Priority,
                    CategoryIcon        = d.CategoryIcon ?? "🍜",
                    CategoryName        = d.CategoryName ?? string.Empty,
                    AudioUrl            = d.AudioUrl,
                    NarrationText       = d.NarrationText,
                    LangCode            = d.LangCode ?? "vi"
                }).ToList();

                await cache.UpsertFromOnlinePoisAsync(poisLocal, langId);
                logger?.LogInformation("Delta sync: upserted {Count} POI(s)", poisLocal.Count);
            }

            // Record sync time
            Preferences.Default.Set(PrefLastSync, DateTime.UtcNow.ToString("o"));
            return (true, null);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "SyncDeltaAsync failed");
            return (false, ex.Message);
        }
    }

    public static void ClearInstallPreferences()
    {
        Preferences.Remove(PrefPackageId);
        Preferences.Remove(PrefChecksum);
        Preferences.Remove(PrefRoot);
        Preferences.Remove(PrefLanguageId);
    }

    /// <summary>Download ZIP to cache, extract, import SQLite. Expects <paramref name="catalogChecksum"/> from public catalog.</summary>
    public async Task<(bool Ok, string? Error)> DownloadAndInstallAsync(
        int packageId,
        string catalogChecksum,
        int languageId,
        IProgress<double>? progress = null,
        CancellationToken ct = default)
    {
        var zipPath = Path.Combine(FileSystem.CacheDirectory, $"vk_offline_{packageId}.zip");
        try
        {
            if (File.Exists(zipPath))
                File.Delete(zipPath);

            var (ok, err) = await api.DownloadOfflinePackageToFileAsync(packageId, zipPath, progress, ct);
            if (!ok)
                return (false, err ?? "Download failed.");

            var root = Path.Combine(FileSystem.AppDataDirectory, "offline", $"pkg_{packageId}");
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
            Directory.CreateDirectory(root);

            ZipFile.ExtractToDirectory(zipPath, root, overwriteFiles: true);

            var manifestPath = Path.Combine(root, "manifest.json");
            if (!File.Exists(manifestPath))
                return (false, "Invalid package: missing manifest.json");

            var json = await File.ReadAllTextAsync(manifestPath, ct);
            var manifest = JsonSerializer.Deserialize<OfflineManifestV1>(json, JsonRead);
            if (manifest is null)
                return (false, "Invalid manifest.");

            if (!string.Equals(manifest.ContentChecksum, catalogChecksum, StringComparison.OrdinalIgnoreCase))
                logger?.LogWarning("Checksum mismatch: catalog {Cat} vs manifest {Man}", catalogChecksum, manifest.ContentChecksum);

            await cache.ImportFromManifestAsync(manifest, root, packageId);

            Preferences.Default.Set(PrefPackageId, packageId);
            Preferences.Default.Set(PrefChecksum, catalogChecksum);
            Preferences.Default.Set(PrefRoot, root);
            Preferences.Default.Set(PrefLanguageId, languageId);

            return (true, null);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Install offline package failed");
            return (false, ex.Message);
        }
        finally
        {
            try { if (File.Exists(zipPath)) File.Delete(zipPath); } catch { /* ignore */ }
        }
    }

    public async Task<(bool Ok, string? Error)> RemoveInstalledPackageAsync()
    {
        try
        {
            var lang = Preferences.Default.Get(PrefLanguageId, -1);
            var root = Preferences.Default.Get(PrefRoot, string.Empty);

            if (lang >= 0)
                await cache.ClearLanguageAsync(lang);

            if (!string.IsNullOrEmpty(root) && Directory.Exists(root))
            {
                try { Directory.Delete(root, recursive: true); }
                catch (Exception ex) { logger?.LogWarning(ex, "Could not delete extract folder"); }
            }

            ClearInstallPreferences();
            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// T-15: Compare the installed package checksum against the server catalog.
    /// Returns an <see cref="UpdateAvailableInfo"/> when a newer version is available,
    /// null when the package is current or no package is installed.
    /// </summary>
    public async Task<UpdateAvailableInfo?> CheckForUpdateAsync()
    {
        var installedId  = GetInstalledPackageId();
        var installedSum = GetInstalledChecksum();
        if (installedId is null) return null;  // nothing installed, nothing to update

        try
        {
            var catalog = await api.GetOfflineCatalogAsync();
            var remote  = catalog.FirstOrDefault(p => p.Id == installedId.Value);
            if (remote is null || string.IsNullOrEmpty(remote.Checksum)) return null;

            if (string.Equals(remote.Checksum, installedSum, StringComparison.OrdinalIgnoreCase))
                return null;  // checksums match → up to date

            return new UpdateAvailableInfo
            {
                PackageId      = remote.Id,
                PackageName    = remote.Name,
                NewChecksum    = remote.Checksum,
                LanguageId     = remote.LanguageId,
                NewVersionLabel = remote.Version,
                SizeLabel      = remote.SizeLabel
            };
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "CheckForUpdateAsync failed");
            return null;
        }
    }
}

/// <summary>T-15: Describes an available update for an installed offline package.</summary>
public sealed class UpdateAvailableInfo
{
    public int    PackageId       { get; init; }
    public string PackageName     { get; init; } = string.Empty;
    public string NewChecksum     { get; init; } = string.Empty;
    public int    LanguageId      { get; init; }
    public string NewVersionLabel { get; init; } = string.Empty;
    public string SizeLabel       { get; init; } = string.Empty;
}
