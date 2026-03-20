using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;
    private readonly ILogger<SettingsService> _logger;

    public SettingsService(AppDbContext db, ILogger<SettingsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ApiResponse<SystemSettingsDto>> GetAllAsync()
    {
        var settings = await _db.SystemSettings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value);

        var dto = new SystemSettingsDto
        {
            Geofence = new GeofenceSettings
            {
                DefaultRadius = GetInt(settings, "geofence.defaultRadius", 30),
                GpsUpdateFrequency = GetInt(settings, "geofence.gpsUpdateFrequency", 5),
                GpsAccuracy = GetString(settings, "geofence.gpsAccuracy", "High"),
            },
            Narration = new NarrationSettings
            {
                DefaultCooldown = GetInt(settings, "narration.defaultCooldown", 30),
                DefaultMode = GetString(settings, "narration.defaultMode", "Auto"),
                TtsSpeed = GetDouble(settings, "narration.ttsSpeed", 1.0),
                AutoGenerateTTS = GetBool(settings, "narration.autoGenerateTTS", true),
            },
            Sync = new SyncSettings
            {
                SyncFrequency = GetInt(settings, "sync.frequency", 15),
                BatchSize = GetInt(settings, "sync.batchSize", 50),
                CompressData = GetBool(settings, "sync.compressData", true),
            },
            Api = new ApiSettings
            {
                ApiKey = GetString(settings, "api.key", ""),
                MaintenanceMode = GetBool(settings, "api.maintenanceMode", false),
            }
        };

        return ApiResponse<SystemSettingsDto>.Ok(dto);
    }

    public async Task<ApiResponse<bool>> UpdateAsync(SystemSettingsDto dto)
    {
        var updates = new Dictionary<string, string>
        {
            ["geofence.defaultRadius"] = dto.Geofence.DefaultRadius.ToString(),
            ["geofence.gpsUpdateFrequency"] = dto.Geofence.GpsUpdateFrequency.ToString(),
            ["geofence.gpsAccuracy"] = dto.Geofence.GpsAccuracy,
            ["narration.defaultCooldown"] = dto.Narration.DefaultCooldown.ToString(),
            ["narration.defaultMode"] = dto.Narration.DefaultMode,
            ["narration.ttsSpeed"] = dto.Narration.TtsSpeed.ToString("F1"),
            ["narration.autoGenerateTTS"] = dto.Narration.AutoGenerateTTS.ToString().ToLower(),
            ["sync.frequency"] = dto.Sync.SyncFrequency.ToString(),
            ["sync.batchSize"] = dto.Sync.BatchSize.ToString(),
            ["sync.compressData"] = dto.Sync.CompressData.ToString().ToLower(),
            ["api.maintenanceMode"] = dto.Api.MaintenanceMode.ToString().ToLower(),
        };

        var existing = await _db.SystemSettings.ToListAsync();

        foreach (var (key, value) in updates)
        {
            var setting = existing.FirstOrDefault(s => s.Key == key);
            if (setting != null)
            {
                setting.Value = value;
                setting.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _db.SystemSettings.Add(new Domain.Entities.SystemSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("System settings updated");
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> SetMaintenanceModeAsync(bool enabled)
    {
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "api.maintenanceMode");
        if (setting != null)
        {
            setting.Value = enabled.ToString().ToLower();
            setting.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.SystemSettings.Add(new Domain.Entities.SystemSetting
            {
                Key = "api.maintenanceMode",
                Value = enabled.ToString().ToLower(),
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Maintenance mode set to {Enabled}", enabled);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<string>> GenerateApiKeyAsync()
    {
        var apiKey = $"vk_{Guid.NewGuid():N}";

        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "api.key");
        if (setting != null)
        {
            setting.Value = apiKey;
            setting.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.SystemSettings.Add(new Domain.Entities.SystemSetting
            {
                Key = "api.key",
                Value = apiKey,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("New API key generated");
        return ApiResponse<string>.Ok(apiKey);
    }

    // ============ Helpers ============

    private static int GetInt(Dictionary<string, string> d, string key, int def)
        => d.TryGetValue(key, out var v) && int.TryParse(v, out var i) ? i : def;

    private static double GetDouble(Dictionary<string, string> d, string key, double def)
        => d.TryGetValue(key, out var v) && double.TryParse(v, System.Globalization.CultureInfo.InvariantCulture, out var dv) ? dv : def;

    private static bool GetBool(Dictionary<string, string> d, string key, bool def)
        => d.TryGetValue(key, out var v) && bool.TryParse(v, out var b) ? b : def;

    private static string GetString(Dictionary<string, string> d, string key, string def)
        => d.TryGetValue(key, out var v) ? v : def;
}
