using System.Net.Http.Json;
using System.Text.Json;

namespace VinhKhanh.Mobile.Services;

// ── DTOs (mirrors the backend API response shapes) ──────────────────────────

/// <summary>Nearby POI returned by GET /pois/nearby.</summary>
public record NearbyPoiDto(
    int    Id,
    string Name,
    string Address,
    double Latitude,
    double Longitude,
    int    GeofenceRadiusMeters,
    int    Priority,
    string CategoryIcon,
    string CategoryName,
    double DistanceMeters,
    string? AudioUrl,       // direct stream URL for the default narration
    string? NarrationText,  // TTS fallback text (from POITranslation.NarrationText)
    string? LangCode        // language code for TTS (e.g. "vi", "en")
);

/// <summary>Language entry from GET /languages.</summary>
public record LanguageDto(int Id, string Code, string NativeName, string FlagEmoji);

/// <summary>Auth response from POST /auth/login.</summary>
public record AuthResponseDto(string AccessToken, string RefreshToken);

/// <summary>
/// HTTP client for the Vinh Khanh backend API.
///
/// Configuration is loaded from the embedded appsettings.json (ApiBaseUrl).
/// JWT is stored / retrieved from SecureStorage (encrypted on-device).
///
/// Endpoints implemented for Phase 2 PoC:
///   GET  /pois/nearby
///   GET  /languages
///   POST /auth/login
///   POST /auth/register
///   POST /sync/visits
/// </summary>
public class ApiClient
{
    // ── HTTP ───────────────────────────────────────────────────────────────────
    private readonly HttpClient _http;

    // ── Config ─────────────────────────────────────────────────────────────────
    private readonly string _baseUrl;

    // ── JWT storage key ────────────────────────────────────────────────────────
    private const string JwtKey = "jwt_token";

    // ── JSON options ───────────────────────────────────────────────────────────
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiClient(IHttpClientFactory factory)
    {
        _http = factory.CreateClient("VinhKhanh");
        _baseUrl = LoadBaseUrl();
    }

    // ── Public methods ─────────────────────────────────────────────────────────

    /// <summary>
    /// Fetch POIs within <paramref name="radiusMeters"/> of the given coordinates.
    /// Returns an empty list on network failure (app continues in degraded mode).
    /// </summary>
    public async Task<List<NearbyPoiDto>> GetNearbyPOIsAsync(
        double lat, double lng, int radiusMeters, int langId)
    {
        try
        {
            var url = $"{_baseUrl}/pois/nearby?lat={lat}&lng={lng}&radius={radiusMeters}&langId={langId}";
            var res = await _http.GetFromJsonAsync<ApiEnvelope<List<NearbyPoiDto>>>(url, _json);
            return res?.Data ?? [];
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ApiClient] GetNearbyPOIsAsync failed: {ex.Message}");
            return [];
        }
    }

    /// <summary>Fetch all active languages from the backend.</summary>
    public async Task<List<LanguageDto>> GetLanguagesAsync()
    {
        try
        {
            var url = $"{_baseUrl}/languages";
            var res = await _http.GetFromJsonAsync<ApiEnvelope<List<LanguageDto>>>(url, _json);
            return res?.Data ?? [];
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ApiClient] GetLanguagesAsync failed: {ex.Message}");
            return [];
        }
    }

    /// <summary>
    /// Authenticate with email + password. Stores the JWT in SecureStorage on success.
    /// Returns true on success, false on failure.
    /// </summary>
    public async Task<bool> LoginAsync(string email, string password)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_baseUrl}/auth/login",
                new { email, password });

            if (!res.IsSuccessStatusCode) return false;

            var body = await res.Content.ReadFromJsonAsync<ApiEnvelope<AuthResponseDto>>(_json);
            if (body?.Data is null) return false;

            await SecureStorage.SetAsync(JwtKey, body.Data.AccessToken);
            SetAuthHeader(body.Data.AccessToken);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ApiClient] LoginAsync failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>Register a new Customer account. Returns true on success.</summary>
    public async Task<bool> RegisterAsync(string email, string password, string fullName)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_baseUrl}/auth/register",
                new { email, password, fullName });
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ApiClient] RegisterAsync failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Upload a batch of pending visit records.
    /// Called by SyncService in Phase 3 when the device comes online.
    /// Already wired here as a stub so the model is defined.
    /// </summary>
    public async Task<bool> UploadVisitsAsync(IEnumerable<object> visits)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_baseUrl}/sync/visits",
                new { visits });
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ApiClient] UploadVisitsAsync failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>Try to restore a previously stored JWT and attach it to the HTTP client.</summary>
    public async Task RestoreSessionAsync()
    {
        try
        {
            var token = await SecureStorage.GetAsync(JwtKey);
            if (token is not null) SetAuthHeader(token);
        }
        catch
        {
            // SecureStorage can throw on first launch on some Android configs
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void SetAuthHeader(string token)
    {
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Load ApiBaseUrl from the embedded appsettings.json resource.
    /// Falls back to the Android emulator localhost address if the resource is missing.
    /// </summary>
    private static string LoadBaseUrl()
    {
        try
        {
            // The embedded resource name is: {RootNamespace}.appsettings.json
            var asm = typeof(ApiClient).Assembly;
            var resourceName = asm.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith("appsettings.json"))
                ?? throw new InvalidOperationException("appsettings.json not found as embedded resource.");

            using var stream = asm.GetManifestResourceStream(resourceName)!;
            using var doc    = JsonDocument.Parse(stream);

            // Use trailing slash stripping for consistency
            var url = doc.RootElement.GetProperty("ApiBaseUrl").GetString()
                      ?? "http://10.0.2.2:5015/api/v1";
            return url.TrimEnd('/');
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ApiClient] Failed to read appsettings.json: {ex.Message}. Falling back.");
            return "http://10.0.2.2:5015/api/v1";
        }
    }
}

/// <summary>
/// Generic wrapper matching the backend's ApiResponse{T} envelope:
/// { "success": true, "data": {...}, "error": null }
/// </summary>
internal record ApiEnvelope<T>(bool Success, T? Data, object? Error);
