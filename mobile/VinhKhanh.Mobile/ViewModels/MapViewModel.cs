using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using Microsoft.Maui.Networking;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

public partial class MapViewModel : ObservableObject
{
    private readonly ILocationService _location;
    private readonly ApiClient _api;
    private readonly MobileAppSettings _settings;
    private readonly OfflineCacheStore _offlineCache;

    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private string _statusText = "…";
    [ObservableProperty] private string _errorMessage = string.Empty;

    public ObservableCollection<PoiLocal> NearbyPois { get; } = [];

    private int _langId = 1;
    private readonly int _radiusMeters;
    private double _lastFetchLat;
    private double _lastFetchLng;
    private const double RefreshDistanceThresholdMeters = 50;

    public MapViewModel(ILocationService location, ApiClient api, MobileAppSettings settings, OfflineCacheStore offlineCache)
    {
        _location = location;
        _api = api;
        _settings = settings;
        _offlineCache = offlineCache;
        _radiusMeters = settings.DefaultRadiusMeters;

        _location.LocationUpdated += OnLocationUpdated;

        WeakReferenceMessenger.Default.Register<ValueChangedMessage<int>>(
            this,
            (_, message) =>
            {
                _langId = message.Value;
                MainThread.BeginInvokeOnMainThread(async () => await RefreshAsync());
            });
    }

    private void OnLocationUpdated(object? sender, LocationUpdate update)
    {
        MainThread.BeginInvokeOnMainThread(() =>
            StatusText = $"📍 {update.Lat:F4}, {update.Lng:F4}");

        double dist = Services.GeofenceEngine.HaversineMeters(
            update.Lat, update.Lng, _lastFetchLat, _lastFetchLng);

        if (dist >= RefreshDistanceThresholdMeters)
            MainThread.BeginInvokeOnMainThread(async () => await RefreshAsync());
    }

    [RelayCommand]
    public async Task InitializeAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        ErrorMessage = string.Empty;
        try
        {
            await _api.RestoreSessionAsync();
            _langId = Preferences.Default.Get("preferred_language_id", 1);
            await _location.StartTrackingAsync();
            StatusText = _location.IsTracking ? "Live location" : "No GPS fix";
            await RefreshAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
            StatusText = "Error";
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    public async Task RefreshAsync()
    {
        var loc = _location.LastKnownLocation;
        double lat = loc?.Latitude ?? 10.7553;
        double lng = loc?.Longitude ?? 106.7017;

        _lastFetchLat = lat;
        _lastFetchLng = lng;

        List<PoiLocal> pois;
        if (Connectivity.Current.NetworkAccess == NetworkAccess.Internet)
        {
            pois = await _api.GetNearbyPoisAsync(lat, lng, _radiusMeters, _langId);
            if (pois.Count > 0)
                await _offlineCache.UpsertFromOnlinePoisAsync(pois, _langId);
        }
        else
            pois = await _offlineCache.GetNearbyPoisAsync(lat, lng, _radiusMeters, _langId);

        MainThread.BeginInvokeOnMainThread(() =>
        {
            NearbyPois.Clear();
            foreach (var p in pois)
                NearbyPois.Add(p);
        });
    }
}
