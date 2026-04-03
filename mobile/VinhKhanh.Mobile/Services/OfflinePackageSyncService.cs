using System.IO.Compression;
using System.Text.Json;
using Microsoft.Extensions.Logging;

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

    public const string PrefPackageId = "vk_offline_package_id";
    public const string PrefChecksum = "vk_offline_package_checksum";
    public const string PrefRoot = "vk_offline_extract_root";
    public const string PrefLanguageId = "vk_offline_language_id";

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
}
