using System.Globalization;
using System.Text;
using System.Text.Json;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;
using VinhKhanh.Mobile.ViewModels;

namespace VinhKhanh.Mobile.Views;

/// <summary>
/// Tour map using Leaflet + OpenStreetMap inside a WebView — same map stack as admin
/// (<c>MapPicker.jsx</c> / <c>POIMiniMap.jsx</c>): Leaflet 1.9.4 CDN and OSM tile URL.
/// </summary>
public partial class MapPage : ContentPage
{
    private readonly MapViewModel _vm;
    private readonly ILocationService _location;

    private bool _htmlSourceAssigned;
    private bool _mapDomReady;

    public MapPage(MapViewModel vm, ILocationService location)
    {
        InitializeComponent();
        _vm = vm;
        _location = location;
        BindingContext = vm;

        vm.NearbyPois.CollectionChanged += (_, _) => _ = PushPoisToWebAsync();

        TourMapWebView.Navigating += OnWebViewNavigating;
        TourMapWebView.Navigated += OnWebViewNavigated;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await EnsureWebSourceAsync();
        await _vm.InitializeCommand.ExecuteAsync(null);
    }

    private async Task EnsureWebSourceAsync()
    {
        if (_htmlSourceAssigned) return;
        _htmlSourceAssigned = true;

        await using var stream = await FileSystem.OpenAppPackageFileAsync("leaflet_tour_map.html");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var html = await reader.ReadToEndAsync();

        TourMapWebView.Source = new HtmlWebViewSource
        {
            Html = html,
            BaseUrl = "https://unpkg.com/"
        };
    }

    private void OnWebViewNavigated(object? sender, WebNavigatedEventArgs e)
    {
        if (e.Result != WebNavigationResult.Success) return;
        _mapDomReady = true;
        MainThread.BeginInvokeOnMainThread(() => _ = PushPoisToWebAsync());
    }

    private async void OnWebViewNavigating(object? sender, WebNavigatingEventArgs e)
    {
        if (!e.Url.StartsWith("poi://", StringComparison.OrdinalIgnoreCase)) return;

        e.Cancel = true;
        var raw = e.Url.AsSpan("poi://".Length).Trim('/');
        if (!int.TryParse(raw.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var id))
            return;

        var poi = _vm.NearbyPois.FirstOrDefault(p => p.Id == id);
        if (poi is null) return;

        await Shell.Current.GoToAsync("poiDetail", new Dictionary<string, object> { { "poi", poi } });
    }

    private async Task PushPoisToWebAsync()
    {
        if (!_mapDomReady) return;

        var items = _vm.NearbyPois
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                latitude = p.Latitude,
                longitude = p.Longitude
            })
            .ToList();

        var json = JsonSerializer.Serialize(items);
        var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));

        var loc = _location.LastKnownLocation;
        var uLat = loc is null ? "null" : loc.Latitude.ToString(CultureInfo.InvariantCulture);
        var uLng = loc is null ? "null" : loc.Longitude.ToString(CultureInfo.InvariantCulture);

        var js = $"vkTourMap.setDataFromBase64('{b64}', {uLat}, {uLng});";

        try
        {
            await MainThread.InvokeOnMainThreadAsync(async () => await TourMapWebView.EvaluateJavaScriptAsync(js));
        }
        catch
        {
            /* WebView may not be ready on some transitions */
        }
    }
}
