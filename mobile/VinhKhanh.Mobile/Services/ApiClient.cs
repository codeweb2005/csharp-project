using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using VinhKhanh.Mobile.Models;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// HTTP client for the Vinh Khanh Customer API. Tokens live in <see cref="SecureStorage"/>.
/// </summary>
public class ApiClient
{
    private const string AccessTokenKey = "vk_access_token";
    private const string RefreshTokenKey = "vk_refresh_token";

    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly ILogger<ApiClient>? _logger;

    private static readonly JsonSerializerOptions JsonRead = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly JsonSerializerOptions JsonWrite = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ApiClient(IHttpClientFactory factory, MobileAppSettings settings, ILogger<ApiClient>? logger = null)
    {
        _http = factory.CreateClient("VinhKhanh");
        _baseUrl = settings.ApiBaseUrl.TrimEnd('/');
        _logger = logger;
    }

    public string BaseUrl => _baseUrl;

    public async Task<List<PoiLocal>> GetNearbyPoisAsync(double lat, double lng, int radiusMeters, int langId)
    {
        try
        {
            var latS = Uri.EscapeDataString(lat.ToString(CultureInfo.InvariantCulture));
            var lngS = Uri.EscapeDataString(lng.ToString(CultureInfo.InvariantCulture));
            var url = $"{_baseUrl}/pois/nearby?lat={latS}&lng={lngS}&radiusMeters={radiusMeters}&langId={langId}";

            var res = await _http.GetFromJsonAsync<ApiEnvelope<List<NearbyPoiResponse>>>(url, JsonRead);
            if (res?.Data is null) return [];

            return res.Data.Select(d => MapNearby(d, langId)).ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "GetNearbyPoisAsync failed");
            return [];
        }
    }

    private PoiLocal MapNearby(NearbyPoiResponse d, int langId)
    {
        var audio = d.Audio.FirstOrDefault(a => a.IsDefault) ?? d.Audio.FirstOrDefault();
        var tr = d.Translations.FirstOrDefault(t => t.LanguageId == langId)
                 ?? d.Translations.FirstOrDefault();

        var streamUrl = audio != null ? $"{_baseUrl}/audio/{audio.Id}/stream" : null;

        return new PoiLocal
        {
            Id = d.Id,
            Name = d.Name,
            Address = d.Address,
            Latitude = d.Latitude,
            Longitude = d.Longitude,
            GeofenceRadiusMeters = d.GeofenceRadius,
            Priority = d.Priority,
            CategoryIcon = d.CategoryIcon,
            CategoryName = d.CategoryName,
            DistanceMeters = d.DistanceMeters,
            AudioUrl = streamUrl,
            NarrationText = tr?.NarrationText,
            LangCode = string.IsNullOrEmpty(tr?.LanguageCode) ? "vi" : tr.LanguageCode
        };
    }

    public async Task<List<LanguageResponse>> GetLanguagesAsync()
    {
        try
        {
            var res = await _http.GetFromJsonAsync<ApiEnvelope<List<LanguageResponse>>>(
                $"{_baseUrl}/languages", JsonRead);
            return res?.Data ?? [];
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "GetLanguagesAsync failed");
            return [];
        }
    }

    public async Task<(bool Ok, string? ErrorMessage)> LoginAsync(string email, string password)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_baseUrl}/auth/login",
                new { email, password }, JsonWrite);

            var body = await res.Content.ReadFromJsonAsync<ApiEnvelope<LoginEnvelopeData>>(JsonRead);
            if (!res.IsSuccessStatusCode || body?.Success != true || body.Data is null)
                return (false, body?.Error?.Message ?? "Login failed.");

            await PersistTokensAsync(body.Data.AccessToken, body.Data.RefreshToken);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "LoginAsync failed");
            return (false, ex.Message);
        }
    }

    public async Task<(bool Ok, string? ErrorMessage)> RegisterAsync(
        string username, string email, string password, string? fullName, int? preferredLanguageId)
    {
        try
        {
            object payload = preferredLanguageId is int lid
                ? new { username, email, password, fullName = fullName ?? username, preferredLanguageId = lid }
                : new { username, email, password, fullName = fullName ?? username };

            var res = await _http.PostAsJsonAsync($"{_baseUrl}/auth/register", payload, JsonWrite);
            var body = await res.Content.ReadFromJsonAsync<ApiEnvelope<LoginEnvelopeData>>(JsonRead);
            if (!res.IsSuccessStatusCode || body?.Success != true || body.Data is null)
                return (false, body?.Error?.Message ?? "Registration failed.");

            await PersistTokensAsync(body.Data.AccessToken, body.Data.RefreshToken);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "RegisterAsync failed");
            return (false, ex.Message);
        }
    }

    public async Task<(bool Ok, string? ErrorMessage, string? DevResetToken)> ForgotPasswordAsync(string email)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_baseUrl}/auth/forgot-password",
                new { email }, JsonWrite);
            var body = await res.Content.ReadFromJsonAsync<ApiEnvelope<ForgotPasswordEnvelopeData>>(JsonRead);
            if (!res.IsSuccessStatusCode || body?.Success != true)
                return (false, body?.Error?.Message ?? "Request failed.", null);
            return (true, body.Data?.Message, body.Data?.ResetToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "ForgotPasswordAsync failed");
            return (false, ex.Message, null);
        }
    }

    public async Task<(bool Ok, string? ErrorMessage)> ResetPasswordAsync(string email, string token, string newPassword)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_baseUrl}/auth/reset-password",
                new { email, token, newPassword }, JsonWrite);
            var body = await res.Content.ReadFromJsonAsync<ApiEnvelope<bool>>(JsonRead);
            if (!res.IsSuccessStatusCode || body?.Success != true)
                return (false, body?.Error?.Message ?? "Reset failed.");
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "ResetPasswordAsync failed");
            return (false, ex.Message);
        }
    }

    public async Task<(bool Ok, string? ErrorMessage)> UpdateProfileAsync(
        string? fullName, string? phone, int? preferredLanguageId)
    {
        try
        {
            await EnsureAuthHeaderAsync();
            var res = await _http.PutAsJsonAsync($"{_baseUrl}/auth/profile",
                new { fullName, phone, preferredLanguageId }, JsonWrite);
            var body = await res.Content.ReadFromJsonAsync<ApiEnvelope<LoginEnvelopeUser>>(JsonRead);
            if (!res.IsSuccessStatusCode || body?.Success != true)
                return (false, body?.Error?.Message ?? "Update failed.");
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "UpdateProfileAsync failed");
            return (false, ex.Message);
        }
    }

    public async Task<LoginEnvelopeUser?> GetMeAsync()
    {
        try
        {
            await EnsureAuthHeaderAsync();
            var res = await _http.GetFromJsonAsync<ApiEnvelope<LoginEnvelopeUser>>($"{_baseUrl}/auth/me", JsonRead);
            return res?.Data;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "GetMeAsync failed");
            return null;
        }
    }

    public async Task LogoutAsync()
    {
        try
        {
            SecureStorage.Remove(AccessTokenKey);
            SecureStorage.Remove(RefreshTokenKey);
        }
        catch { /* ignored */ }

        _http.DefaultRequestHeaders.Authorization = null;
        await Task.CompletedTask;
    }

    public async Task RestoreSessionAsync()
    {
        try
        {
            var access = await SecureStorage.GetAsync(AccessTokenKey);
            if (!string.IsNullOrEmpty(access))
                _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", access);
        }
        catch
        {
            // SecureStorage may throw on some Android setups
        }
    }

    public async Task<bool> HasStoredSessionAsync()
    {
        try
        {
            var t = await SecureStorage.GetAsync(AccessTokenKey);
            return !string.IsNullOrEmpty(t);
        }
        catch
        {
            return false;
        }
    }

    private async Task PersistTokensAsync(string access, string refresh)
    {
        await SecureStorage.SetAsync(AccessTokenKey, access);
        await SecureStorage.SetAsync(RefreshTokenKey, refresh);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", access);
    }

    private async Task EnsureAuthHeaderAsync()
    {
        if (_http.DefaultRequestHeaders.Authorization is not null) return;
        await RestoreSessionAsync();
    }

    public async Task<List<OfflinePackageCatalogItemDto>> GetOfflineCatalogAsync()
    {
        try
        {
            var res = await _http.GetFromJsonAsync<ApiEnvelope<List<OfflinePackageCatalogItemDto>>>(
                $"{_baseUrl}/offlinepackages/catalog", JsonRead);
            return res?.Data ?? [];
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "GetOfflineCatalogAsync failed");
            return [];
        }
    }

    public async Task<(bool Ok, string? Error)> DownloadOfflinePackageToFileAsync(
        int packageId,
        string destinationPath,
        IProgress<double>? progress = null,
        CancellationToken ct = default)
    {
        try
        {
            var url = $"{_baseUrl}/offlinepackages/{packageId}/download";
            using var response = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
                return (false, $"Download failed ({(int)response.StatusCode}).");

            var total = response.Content.Headers.ContentLength;
            await using var input = await response.Content.ReadAsStreamAsync(ct);
            await using (var output = File.Create(destinationPath))
            {
                var buffer = new byte[81920];
                long read = 0;
                int n;
                while ((n = await input.ReadAsync(buffer.AsMemory(0, buffer.Length), ct)) > 0)
                {
                    await output.WriteAsync(buffer.AsMemory(0, n), ct);
                    read += n;
                    if (total is > 0 and var t && progress is not null)
                        progress.Report((double)read / t);
                }
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "DownloadOfflinePackageToFileAsync failed");
            return (false, ex.Message);
        }
    }
}
