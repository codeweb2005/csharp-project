using SQLite;
using VinhKhanh.Mobile.Models;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// On-device POI cache (SQLite). Populated from offline ZIP manifests and merged from online
/// <see cref="ApiClient.GetNearbyPoisAsync"/> when connected.
/// </summary>
public sealed class OfflineCacheStore
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private SQLiteAsyncConnection? _conn;

    private static string DbPath =>
        Path.Combine(FileSystem.AppDataDirectory, "vk_offline_cache.db3");

    private async Task<SQLiteAsyncConnection> ConnectionAsync()
    {
        if (_conn != null) return _conn;
        _conn = new SQLiteAsyncConnection(DbPath);
        await _conn.CreateTableAsync<OfflinePoiRecord>();
        return _conn;
    }

    public async Task<List<PoiLocal>> GetNearbyPoisAsync(double lat, double lng, int radiusMeters, int languageId)
    {
        await _gate.WaitAsync();
        try
        {
            var db = await ConnectionAsync();
            var rows = await db.Table<OfflinePoiRecord>()
                .Where(r => r.LanguageId == languageId)
                .ToListAsync();

            return rows
                .Select(r => ToPoiLocal(r, lat, lng))
                .Where(p => p.DistanceMeters <= radiusMeters)
                .OrderBy(p => p.DistanceMeters)
                .ToList();
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task UpsertFromOnlinePoisAsync(IReadOnlyList<PoiLocal> pois, int languageId)
    {
        if (pois.Count == 0) return;

        await _gate.WaitAsync();
        try
        {
            var db = await ConnectionAsync();
            foreach (var p in pois)
            {
                var key = MakeKey(p.Id, languageId);
                var existing = await db.FindAsync<OfflinePoiRecord>(key);
                var row = new OfflinePoiRecord
                {
                    Key = key,
                    PoiId = p.Id,
                    LanguageId = languageId,
                    SourcePackageId = existing?.SourcePackageId ?? 0,
                    Name = p.Name,
                    Address = p.Address,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    GeofenceRadiusMeters = p.GeofenceRadiusMeters,
                    Priority = p.Priority,
                    CategoryIcon = p.CategoryIcon,
                    CategoryName = p.CategoryName,
                    NarrationText = p.NarrationText,
                    LangCode = p.LangCode ?? "vi",
                    LocalAudioPath = existing?.LocalAudioPath,
                    CachedStreamUrl = p.AudioUrl
                };
                await db.InsertOrReplaceAsync(row);
            }
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task ImportFromManifestAsync(
        OfflineManifestV1 manifest,
        string extractRootAbsolute,
        int expectedPackageId)
    {
        if (manifest.SchemaVersion != 1)
            throw new InvalidDataException($"Unsupported offline manifest schema {manifest.SchemaVersion}.");

        if (manifest.PackageId != expectedPackageId)
            throw new InvalidDataException("Package id mismatch.");

        await _gate.WaitAsync();
        try
        {
            var db = await ConnectionAsync();
            await db.ExecuteAsync("DELETE FROM offline_pois WHERE LanguageId = ?", manifest.LanguageId);

            var rows = manifest.Pois.Select(poi =>
            {
                string? localPath = null;
                if (!string.IsNullOrEmpty(poi.AudioEntry))
                {
                    var candidate = Path.Combine(extractRootAbsolute,
                        poi.AudioEntry.Replace('/', Path.DirectorySeparatorChar));
                    if (File.Exists(candidate))
                        localPath = candidate;
                }

                return new OfflinePoiRecord
                {
                    Key = MakeKey(poi.Id, manifest.LanguageId),
                    PoiId = poi.Id,
                    LanguageId = manifest.LanguageId,
                    SourcePackageId = manifest.PackageId,
                    Name = poi.Name,
                    Address = poi.Address,
                    Latitude = poi.Latitude,
                    Longitude = poi.Longitude,
                    GeofenceRadiusMeters = poi.GeofenceRadius,
                    Priority = poi.Priority,
                    CategoryIcon = poi.CategoryIcon,
                    CategoryName = poi.CategoryName,
                    NarrationText = poi.NarrationText,
                    LangCode = poi.LanguageCode ?? "vi",
                    LocalAudioPath = localPath,
                    CachedStreamUrl = null
                };
            }).ToList();

            await db.InsertAllAsync(rows);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task ClearLanguageAsync(int languageId)
    {
        await _gate.WaitAsync();
        try
        {
            var db = await ConnectionAsync();
            await db.ExecuteAsync("DELETE FROM offline_pois WHERE LanguageId = ?", languageId);
        }
        finally
        {
            _gate.Release();
        }
    }

    private static string MakeKey(int poiId, int languageId) => $"{poiId}_{languageId}";

    private static PoiLocal ToPoiLocal(OfflinePoiRecord r, double refLat, double refLng)
    {
        var dist = GeofenceEngine.HaversineMeters(refLat, refLng, r.Latitude, r.Longitude);
        string? audioUrl = null;
        if (!string.IsNullOrEmpty(r.LocalAudioPath) && File.Exists(r.LocalAudioPath))
            audioUrl = new Uri(r.LocalAudioPath).AbsoluteUri;
        else if (!string.IsNullOrEmpty(r.CachedStreamUrl))
            audioUrl = r.CachedStreamUrl;

        return new PoiLocal
        {
            Id = r.PoiId,
            Name = r.Name,
            Address = r.Address,
            Latitude = r.Latitude,
            Longitude = r.Longitude,
            GeofenceRadiusMeters = r.GeofenceRadiusMeters,
            Priority = r.Priority,
            CategoryIcon = r.CategoryIcon,
            CategoryName = r.CategoryName,
            DistanceMeters = dist,
            AudioUrl = audioUrl,
            NarrationText = r.NarrationText,
            LangCode = r.LangCode
        };
    }
}
