using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

/// <summary>
/// ViewModel for SettingsPage.
///
/// Responsibilities:
///   - Load settings from Preferences (user overrides) or MobileAppSettings (defaults)
///   - Persist changes to Preferences immediately when sliders/toggles change
///   - Publish WeakReferenceMessenger messages so GeofenceEngine + MainViewModel update live
///   - Load available TTS voices from the device (T-07)
///   - Trigger manual delta sync
///
/// Settings keys (all stored in Microsoft.Maui.Storage.Preferences):
///   "setting_geofence_radius"    → int  (50–500 m)
///   "setting_gps_poll_interval"  → int  (3–15 s)
///   "setting_debounce_readings"  → int  (1–5)
///   "setting_cooldown_minutes"   → int  (1–15 min)
///   "setting_auto_play"          → bool (default true)
///   "setting_preferred_tts_voice"→ string (locale id)
/// </summary>
public partial class SettingsViewModel : ObservableObject
{
    // ── Dependencies ───────────────────────────────────────────────────────────
    private readonly MobileAppSettings _defaults;
    private readonly GeofenceEngine    _geofence;
    private readonly ApiClient         _api;

    // ── Observable state ───────────────────────────────────────────────────────

    [ObservableProperty] private int  _geofenceRadiusMeters;
    [ObservableProperty] private int  _gpsPollIntervalSeconds;
    [ObservableProperty] private int  _debounceReadings;
    [ObservableProperty] private int  _cooldownMinutes;
    [ObservableProperty] private bool _autoPlayNarration;
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private string _statusMessage = string.Empty;
    [ObservableProperty] private string _lastSyncText  = string.Empty;

    // T-07: TTS Voice
    [ObservableProperty] private List<string> _availableVoices = [];
    [ObservableProperty] private string _selectedVoice = string.Empty;

    // ── Keys ───────────────────────────────────────────────────────────────────
    public const string KeyRadius    = "setting_geofence_radius";
    public const string KeyPollSec   = "setting_gps_poll_interval";
    public const string KeyDebounce  = "setting_debounce_readings";
    public const string KeyCooldown  = "setting_cooldown_minutes";
    public const string KeyAutoPlay  = "setting_auto_play";
    public const string KeyTtsVoice  = "setting_preferred_tts_voice";

    // ── Constructor ────────────────────────────────────────────────────────────

    public SettingsViewModel(MobileAppSettings defaults, GeofenceEngine geofence, ApiClient api)
    {
        _defaults = defaults;
        _geofence = geofence;
        _api      = api;

        LoadFromPreferences();
        UpdateLastSyncText();
    }

    // ── Commands ───────────────────────────────────────────────────────────────

    [RelayCommand]
    public void ResetToDefaults()
    {
        GeofenceRadiusMeters  = _defaults.DefaultRadiusMeters;
        GpsPollIntervalSeconds = _defaults.LocationPollIntervalSeconds;
        DebounceReadings      = _defaults.DebounceReadings;
        CooldownMinutes       = _defaults.GeofenceCooldownMinutes;
        AutoPlayNarration     = true;
        SelectedVoice         = string.Empty;

        SaveAll();
        StatusMessage = "✅ Reset to defaults";
        PublishSettingsChanged();
    }

    [RelayCommand]
    public async Task LoadVoicesAsync()
    {
        try
        {
            var locales = await TextToSpeech.GetLocalesAsync();
            var voices  = locales
                .Where(l => l.Language.StartsWith("vi", StringComparison.OrdinalIgnoreCase)
                         || l.Language.StartsWith("en", StringComparison.OrdinalIgnoreCase))
                .Select(l => $"{l.Name} ({l.Language}-{l.Country})")
                .OrderBy(s => s)
                .ToList();

            voices.Insert(0, "System Default");
            AvailableVoices = voices;

            if (string.IsNullOrEmpty(SelectedVoice))
                SelectedVoice = voices.FirstOrDefault() ?? string.Empty;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SettingsViewModel] LoadVoicesAsync error: {ex.Message}");
            AvailableVoices = ["System Default"];
        }
    }

    [RelayCommand]
    public async Task SyncNowAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        StatusMessage = "⟳ Syncing…";

        try
        {
            if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
            {
                StatusMessage = "⚠️ No internet connection.";
                return;
            }

            // Trigger delta sync via message (MainViewModel listens)
            WeakReferenceMessenger.Default.Send(new ValueChangedMessage<string>("delta_sync"));

            StatusMessage = "✅ Sync requested";
            Preferences.Default.Set("last_sync_time", DateTime.UtcNow.ToString("o"));
            UpdateLastSyncText();
        }
        catch (Exception ex)
        {
            StatusMessage = $"⚠️ {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    // ── Property change hooks (save immediately on slider change) ──────────────

    partial void OnGeofenceRadiusMetersChanged(int value)
    {
        Preferences.Default.Set(KeyRadius, value);
        PublishSettingsChanged();
    }

    partial void OnGpsPollIntervalSecondsChanged(int value)
    {
        Preferences.Default.Set(KeyPollSec, value);
        PublishSettingsChanged();
    }

    partial void OnDebounceReadingsChanged(int value)
    {
        Preferences.Default.Set(KeyDebounce, value);
        PublishSettingsChanged();
    }

    partial void OnCooldownMinutesChanged(int value)
    {
        Preferences.Default.Set(KeyCooldown, value);
        PublishSettingsChanged();
    }

    partial void OnAutoPlayNarrationChanged(bool value)
    {
        Preferences.Default.Set(KeyAutoPlay, value);
        PublishSettingsChanged();
    }

    partial void OnSelectedVoiceChanged(string value)
    {
        Preferences.Default.Set(KeyTtsVoice, value);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void LoadFromPreferences()
    {
        GeofenceRadiusMeters   = Preferences.Default.Get(KeyRadius,   _defaults.DefaultRadiusMeters);
        GpsPollIntervalSeconds = Preferences.Default.Get(KeyPollSec,  _defaults.LocationPollIntervalSeconds);
        DebounceReadings       = Preferences.Default.Get(KeyDebounce, _defaults.DebounceReadings);
        CooldownMinutes        = Preferences.Default.Get(KeyCooldown, _defaults.GeofenceCooldownMinutes);
        AutoPlayNarration      = Preferences.Default.Get(KeyAutoPlay, true);
        SelectedVoice          = Preferences.Default.Get(KeyTtsVoice, string.Empty);
    }

    private void SaveAll()
    {
        Preferences.Default.Set(KeyRadius,   GeofenceRadiusMeters);
        Preferences.Default.Set(KeyPollSec,  GpsPollIntervalSeconds);
        Preferences.Default.Set(KeyDebounce, DebounceReadings);
        Preferences.Default.Set(KeyCooldown, CooldownMinutes);
        Preferences.Default.Set(KeyAutoPlay, AutoPlayNarration);
        Preferences.Default.Set(KeyTtsVoice, SelectedVoice);
    }

    private void PublishSettingsChanged()
    {
        // Apply to geofence engine immediately (live update without restart)
        _geofence.DebounceCount    = DebounceReadings;
        _geofence.CooldownDuration = TimeSpan.FromMinutes(CooldownMinutes);

        // Notify MainViewModel to reload with new radius/poll settings
        WeakReferenceMessenger.Default.Send(new ValueChangedMessage<string>("settings_changed"));
    }

    private void UpdateLastSyncText()
    {
        var raw = Preferences.Default.Get("last_sync_time", string.Empty);
        if (string.IsNullOrEmpty(raw))
        {
            LastSyncText = "Last sync: never";
            return;
        }

        if (DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
        {
            var ago = DateTime.UtcNow - dt;
            if (ago.TotalMinutes < 1)
                LastSyncText = "Last sync: just now";
            else if (ago.TotalHours < 1)
                LastSyncText = $"Last sync: {(int)ago.TotalMinutes}m ago";
            else if (ago.TotalDays < 1)
                LastSyncText = $"Last sync: {(int)ago.TotalHours}h ago";
            else
                LastSyncText = $"Last sync: {dt.ToLocalTime():dd/MM HH:mm}";
        }
        else
        {
            LastSyncText = "Last sync: unknown";
        }
    }
}
