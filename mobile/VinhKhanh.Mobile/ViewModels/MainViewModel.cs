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
    private readonly ILocationService       _location;
    private readonly GeofenceEngine         _geofence;
    private readonly ApiClient              _api;
    private readonly INarrationPlayer       _player;
    private readonly MobileAppSettings      _settings;
    private readonly OfflineCacheStore      _offlineCache;
    private readonly VisitQueueStore        _visitQueue;
    private readonly LocalNotificationService _notification;

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

    // T-12: NowPlayingBar progress
    /// <summary>Playback progress 0.0–1.0 for ProgressBar binding.</summary>
    [ObservableProperty] private double _playbackProgress;

    /// <summary>Remaining time string e.g. "1:23" for the NowPlayingBar.</summary>
    [ObservableProperty] private string _playbackTimeRemaining = string.Empty;

    // ── Config ─────────────────────────────────────────────────────────────────
    private readonly int _defaultRadius;  // metres
    private          int _langId = 1;     // from Preferences; Profile tab updates via WeakReferenceMessenger
    private PoiLocal?   _activeNarrationPoi; // POI whose narration is currently playing (for cooldown)
    private DateTime    _narrationStartTime; // UTC timestamp when narration started (for listen duration)
    private bool        _autoPlay = true;    // from Preferences (T-06 settings)

    // Track last position used for nearby POI fetch so we only refresh when
    // the user has moved a meaningful distance (avoids spamming the API on
    // every GPS tick while standing still).
    private double _lastFetchLat;
    private double _lastFetchLng;
    private const double RefreshDistanceThresholdMeters = 50;

    public MainViewModel(ILocationService location, GeofenceEngine geofence,
                         ApiClient api, INarrationPlayer player, MobileAppSettings settings,
                         OfflineCacheStore offlineCache, VisitQueueStore visitQueue,
                         LocalNotificationService notification)
    {
        _location     = location;
        _geofence     = geofence;
        _api          = api;
        _player       = player;
        _settings     = settings;
        _offlineCache = offlineCache;
        _visitQueue   = visitQueue;
        _notification = notification;

        _defaultRadius = settings.DefaultRadiusMeters;
        _geofence.DebounceCount    = settings.DebounceReadings;
        _geofence.CooldownDuration = TimeSpan.FromMinutes(settings.GeofenceCooldownMinutes);

        // Wire geofence events
        _geofence.GeofenceEntered += OnGeofenceEntered;
        _geofence.GeofenceExited  += OnGeofenceExited;

        // Wire player events for NowPlayingBar and cooldown tracking
        _player.IsPlayingChanged  += OnPlayerIsPlayingChanged;
        _player.PlaybackCompleted += OnPlaybackCompleted;

        // Refresh nearby list + status when user moves significantly
        _location.LocationUpdated += OnLocationUpdated;

        // Profile tab updates preferred language, so refresh nearby POIs.
        WeakReferenceMessenger.Default.Register<ValueChangedMessage<int>>(
            this,
            (_, message) =>
            {
                _langId = message.Value;
                MainThread.BeginInvokeOnMainThread(async () => await RefreshPoisAsync());
            });

        // SettingsViewModel publishes this when user changes any setting
        WeakReferenceMessenger.Default.Register<ValueChangedMessage<string>>(
            this,
            (_, message) =>
            {
                if (message.Value == "settings_changed")
                {
                    // Geofence engine already updated by SettingsViewModel directly.
                    // Reload auto-play preference.
                    _autoPlay = Preferences.Default.Get("setting_auto_play", true);
                }
                // delta_sync trigger (from SettingsPage SyncNow button)
                else if (message.Value == "delta_sync")
                {
                    if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
                        _ = FlushVisitQueueAsync();
                }
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

            _langId   = Preferences.Default.Get("preferred_language_id", 1);
            _autoPlay = Preferences.Default.Get("setting_auto_play", true);

            // Request notification permission (Android 13+ / iOS)
            await _notification.RequestPermissionAsync();

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

        double lat = loc?.Latitude  ?? 10.7553;
        double lng = loc?.Longitude ?? 106.7017;

        _lastFetchLat = lat;
        _lastFetchLng = lng;

        List<PoiLocal> pois;
        if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
        {
            pois = await _api.GetNearbyPoisAsync(lat, lng, _defaultRadius, _langId);
            if (pois.Count > 0)
                await _offlineCache.UpsertFromOnlinePoisAsync(pois, _langId);

            // Flush pending visit events while we have a connection
            _ = FlushVisitQueueAsync();
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

    // ── Location event handler ──────────────────────────────────────────────────

    private void OnLocationUpdated(object? sender, LocationUpdate update)
    {
        MainThread.BeginInvokeOnMainThread(() =>
            StatusText = $"📍 {update.Lat:F4}, {update.Lng:F4}");

        // Only re-fetch nearby POIs when the user has moved far enough from
        // the last fetch position. This keeps the list fresh during a walking
        // tour while avoiding excessive API calls when standing still.
        double dist = GeofenceEngine.HaversineMeters(
            update.Lat, update.Lng, _lastFetchLat, _lastFetchLng);

        if (dist >= RefreshDistanceThresholdMeters)
        {
            MainThread.BeginInvokeOnMainThread(async () => await RefreshPoisAsync());
        }
    }

    // ── Geofence event handlers ────────────────────────────────────────────────

    private void OnGeofenceEntered(object? sender, PoiLocal poi)
    {
        Console.WriteLine($"[MainViewModel] GeofenceEntered: {poi.Name}");

        // Enqueue a visit event immediately (regardless of foreground/background)
        _visitQueue.Enqueue(
            poiId:           poi.Id,
            languageId:      _langId,
            triggerType:     "geofence",
            narrationPlayed: true,
            lat:             _location.LastKnownLocation?.Latitude,
            lng:             _location.LastKnownLocation?.Longitude);

        // Auto-play must happen on the main thread (MediaElement requirement)
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            _activeNarrationPoi = poi;
            _narrationStartTime = DateTime.UtcNow;

            // T-11: Send background notification if app is not in foreground
            // Check auto-play setting (T-06)
            if (!_autoPlay)
            {
                // Auto-play disabled: notify regardless of foreground/background
                await _notification.SendGeofenceNotificationAsync(poi.Name);
                NowPlayingName = poi.Name;
                return;
            }

            // Auto-play is ON — check if app is in foreground
            // MAUI doesn't expose foreground state directly; Application.Current.MainPage
            // is only null when the app has been backgrounded before initialization completes.
            bool isBackground = Application.Current?.MainPage is null;

            if (isBackground)
            {
                // App in background: send notification, don't auto-play
                await _notification.SendGeofenceNotificationAsync(poi.Name);
            }
            else
            {
                // App in foreground: auto-play narration
                await _player.PlayAsync(poi.AudioUrl, poi.NarrationText, poi.LangCode ?? "vi");
                NowPlayingName = poi.Name;
            }
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

    /// <summary>
    /// Called when narration finishes naturally (not when stopped manually by user).
    /// Applies per-POI cooldown so the same narration doesn't auto-replay immediately
    /// when the tourist remains inside the geofence.
    /// </summary>
    private void OnPlaybackCompleted(object? sender, EventArgs e)
    {
        if (_activeNarrationPoi is not null)
        {
            var listenSeconds = (int)(DateTime.UtcNow - _narrationStartTime).TotalSeconds;
            _visitQueue.UpdateListenDuration(_activeNarrationPoi.Id, listenSeconds);

            _geofence.SetCooldown(_activeNarrationPoi.Id);
            Console.WriteLine($"[MainViewModel] Cooldown set for: {_activeNarrationPoi.Name}");
            _activeNarrationPoi = null;
        }

        // Attempt to flush the queue after each completed narration (low-frequency, opportunistic)
        if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
            _ = FlushVisitQueueAsync();
    }

    /// <summary>
    /// Upload pending visits to the server when connectivity is available.
    /// Fire-and-forget — failures are recoverable (data stays in queue).
    /// </summary>
    private async Task FlushVisitQueueAsync()
    {
        if (_visitQueue.PendingCount == 0) return;

        var batch = _visitQueue.Dequeue();
        var (ok, err) = await _api.UploadVisitsAsync(batch);
        if (!ok)
        {
            Console.WriteLine($"[MainViewModel] Visit upload failed: {err}. Re-queuing {batch.Count} entries.");
            _visitQueue.RestoreToQueue(batch);
        }
        else
        {
            Console.WriteLine($"[MainViewModel] Uploaded {batch.Count} visit(s) successfully.");
        }
    }
}
