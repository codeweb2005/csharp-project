using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using System.Collections.ObjectModel;
using Microsoft.Maui.Networking;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

/// <summary>
/// ViewModel for MainPage — the nearby POI list with live GPS tracking.
///
/// Responsibilities:
///   - Start GPS on init via ILocationService
///   - Fetch nearby POIs from API via ApiClient
///   - Feed POIs into GeofenceEngine for auto-play detection
///   - Auto-play narration when GeofenceEntered fires
///   - Expose IsPlaying + NowPlayingPoiName for the NowPlayingBar
///   - Expose GPS status string for the status pill
///
/// MVVM pattern (CommunityToolkit.Mvvm):
///   [ObservableProperty] generates the INotifyPropertyChanged boilerplate.
///   [RelayCommand]       generates ICommand implementations.
/// </summary>
public partial class MainViewModel : ObservableObject
{
    // ── Dependencies ───────────────────────────────────────────────────────────
    private readonly ILocationService  _location;
    private readonly GeofenceEngine    _geofence;
    private readonly ApiClient         _api;
    private readonly INarrationPlayer  _player;
    private readonly MobileAppSettings _settings;
    private readonly OfflineCacheStore _offlineCache;

    // ── Observable state ───────────────────────────────────────────────────────

    /// <summary>List of nearby POIs shown in the CollectionView.</summary>
    [ObservableProperty] private ObservableCollection<PoiLocal> _nearbyPois = [];

    /// <summary>True while the API call or GPS init is in progress.</summary>
    [ObservableProperty] private bool _isBusy;

    /// <summary>Text shown in the GPS status pill.</summary>
    [ObservableProperty] private string _statusText = "⟳ Starting GPS…";

    /// <summary>True when a narration is playing (controls NowPlayingBar visibility).</summary>
    [ObservableProperty] private bool _isPlaying;

    /// <summary>POI name shown in the NowPlayingBar.</summary>
    [ObservableProperty] private string _nowPlayingName = string.Empty;

    /// <summary>Error message shown when loading fails.</summary>
    [ObservableProperty] private string _errorMessage = string.Empty;

    // ── Config ─────────────────────────────────────────────────────────────────
    private readonly int _defaultRadius;  // metres
    private          int _langId = 1;     // from Preferences; Profile tab updates via WeakReferenceMessenger

    public MainViewModel(ILocationService location, GeofenceEngine geofence,
                         ApiClient api, INarrationPlayer player, MobileAppSettings settings,
                         OfflineCacheStore offlineCache)
    {
        _location = location;
        _geofence = geofence;
        _api      = api;
        _player   = player;
        _settings = settings;
        _offlineCache = offlineCache;

        _defaultRadius = settings.DefaultRadiusMeters;
        _geofence.DebounceCount = settings.DebounceReadings;

        // Wire geofence events
        _geofence.GeofenceEntered += OnGeofenceEntered;
        _geofence.GeofenceExited  += OnGeofenceExited;

        // Wire player events for NowPlayingBar
        _player.IsPlayingChanged  += OnPlayerIsPlayingChanged;

        // Profile tab updates preferred language, so refresh nearby POIs.
        WeakReferenceMessenger.Default.Register<ValueChangedMessage<int>>(
            this,
            (_, message) =>
            {
                _langId = message.Value;
                MainThread.BeginInvokeOnMainThread(async () => await RefreshPoisAsync());
            });
    }

    // ── Commands ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Called from MainPage.OnAppearing(). Starts GPS, loads initial POI list.
    /// </summary>
    [RelayCommand]
    public async Task InitializeAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        ErrorMessage = string.Empty;

        try
        {
            // Restore JWT session if one exists from a previous run
            await _api.RestoreSessionAsync();

            _langId = Preferences.Default.Get("preferred_language_id", 1);

            // Start GPS
            await _location.StartTrackingAsync();
            StatusText = _location.IsTracking ? "📍 Tracking active" : "⚠️ GPS unavailable";

            // Load nearby POIs using last known location (or a default if none yet)
            await RefreshPoisAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Initialization failed: {ex.Message}";
            StatusText = "⚠️ Error";
        }
        finally
        {
            IsBusy = false;
        }
    }

    /// <summary>Fetch nearby POIs from the API and update the GeofenceEngine watch list.</summary>
    [RelayCommand]
    public async Task RefreshPoisAsync()
    {
        ErrorMessage = string.Empty;
        var loc = _location.LastKnownLocation;

        // While GPS hasn't got a fix yet, use a sensible fallback (Vinh Khanh street, Q4, HCM)
        double lat = loc?.Latitude  ?? 10.7553;
        double lng = loc?.Longitude ?? 106.7017;

        List<PoiLocal> pois;
        if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
        {
            pois = await _api.GetNearbyPoisAsync(lat, lng, _defaultRadius, _langId);
            if (pois.Count > 0)
                await _offlineCache.UpsertFromOnlinePoisAsync(pois, _langId);
        }
        else
        {
            pois = await _offlineCache.GetNearbyPoisAsync(lat, lng, _defaultRadius, _langId);
            if (pois.Count == 0)
                ErrorMessage = "No network. Install an offline package on the Offline tab, or try again when online.";
        }

        // Update observable list on main thread for safe UI binding
        MainThread.BeginInvokeOnMainThread(() =>
        {
            NearbyPois.Clear();
            foreach (var p in pois) NearbyPois.Add(p);
        });

        // Tell geofence engine about the new watch list
        _geofence.LoadPOIs(pois);
    }

    /// <summary>Stop narration (called from NowPlayingBar Stop button).</summary>
    [RelayCommand]
    public void StopNarration() => _player.Stop();

    /// <summary>Pause/resume narration (called from NowPlayingBar Pause button).</summary>
    [RelayCommand]
    public void PauseNarration()
    {
        if (_player.IsPlaying) _player.Pause();
        else _player.Resume();
    }

    // ── Geofence event handlers ────────────────────────────────────────────────

    private void OnGeofenceEntered(object? sender, PoiLocal poi)
    {
        Console.WriteLine($"[MainViewModel] GeofenceEntered: {poi.Name}");

        // Auto-play must happen on the main thread (MediaElement requirement)
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            await _player.PlayAsync(poi.AudioUrl, poi.NarrationText, poi.LangCode ?? "vi");
            NowPlayingName = poi.Name;
        });
    }

    private void OnGeofenceExited(object? sender, PoiLocal poi)
    {
        Console.WriteLine($"[MainViewModel] GeofenceExited: {poi.Name}");

        // Stop audio when the user leaves the POI's geofence
        MainThread.BeginInvokeOnMainThread(() => _player.Stop());
    }

    private void OnPlayerIsPlayingChanged(object? sender, EventArgs e)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            IsPlaying = _player.IsPlaying;
            if (!IsPlaying) NowPlayingName = string.Empty;
        });
    }
}
