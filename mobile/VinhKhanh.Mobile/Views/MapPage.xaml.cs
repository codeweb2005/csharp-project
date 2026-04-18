using Mapsui;
using Mapsui.Extensions;
using Mapsui.Layers;
using Mapsui.Projections;
using Mapsui.Styles;
using Mapsui.Tiling;
using Mapsui.UI.Maui;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;
using VinhKhanh.Mobile.ViewModels;
using Color = Mapsui.Styles.Color;
using MBrush = Mapsui.Styles.Brush;
using MFont = Mapsui.Styles.Font;
using MPoint = Mapsui.MPoint;

namespace VinhKhanh.Mobile.Views;

/// <summary>
/// Tour map using Mapsui + OpenStreetMap — fully native, no WebView or JS bridge.
/// Layers:
///   0 — OSM tile layer (base map)
///   1 — Geofence circles (semi-transparent indigo fill per POI radius)
///   2 — POI pins (indigo filled circle with white border)
///   3 — User location dot (blue)
/// </summary>
public partial class MapPage : ContentPage
{
    private readonly MapViewModel _vm;
    private readonly ILocationService _location;

    // Separate writable layers so we can update each independently
    private readonly WritableLayer _geofenceLayer = new() { Name = "Geofences", Style = null };
    private readonly WritableLayer _poisLayer     = new() { Name = "POIs",      Style = null };
    private readonly WritableLayer _userLayer     = new() { Name = "User",      Style = null };

    // Vinh Khanh default centre (Ho Chi Minh City, Vinh Khanh Street area)
    private const double DefaultLat = 10.7553;
    private const double DefaultLng = 106.7017;
    private const double DefaultZoom = 15;

    public MapPage(MapViewModel vm, ILocationService location)
    {
        InitializeComponent();
        _vm = vm;
        _location = location;
        BindingContext = vm;

        InitMap();

        // Refresh pins whenever the nearby POI list changes
        vm.NearbyPois.CollectionChanged += (_, _) => MainThread.BeginInvokeOnMainThread(RefreshMapLayers);

        // Navigate to detail page when user taps a POI pin
        TourMapControl.Map.Info += OnMapInfo;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await _vm.InitializeCommand.ExecuteAsync(null);
        RefreshMapLayers();
    }

    // ── Map initialisation ────────────────────────────────────────────────────

    private void InitMap()
    {
        var map = new Mapsui.Map();

        // Layer 0: OSM base tiles
        map.Layers.Add(OpenStreetMap.CreateTileLayer("VinhKhanhFoodTour/1.0"));

        // Layers 1-3: dynamic data
        map.Layers.Add(_geofenceLayer);
        map.Layers.Add(_poisLayer);
        map.Layers.Add(_userLayer);

        // Centre on Vinh Khanh Street (v5: Navigator defers until viewport is ready; Home was removed)
        var (cx, cy) = SphericalMercator.FromLonLat(DefaultLng, DefaultLat);
        var center = new MPoint(cx, cy);
        var zoomIdx = Math.Min((int)DefaultZoom, map.Navigator.Resolutions.Count - 1);
        map.Navigator.CenterOnAndZoomTo(center, map.Navigator.Resolutions[zoomIdx]);

        TourMapControl.Map = map;
    }

    // ── Layer refresh ─────────────────────────────────────────────────────────

    private void RefreshMapLayers()
    {
        UpdatePoisLayer();
        UpdateGeofenceLayer();
        UpdateUserLayer();
        TourMapControl.Map.Refresh();
    }

    private void UpdatePoisLayer()
    {
        var features = _vm.NearbyPois.Select(MakePinFeature).ToList();
        _poisLayer.Clear();
        _poisLayer.AddRange(features);
    }

    private void UpdateGeofenceLayer()
    {
        var features = _vm.NearbyPois
            .Where(p => p.GeofenceRadiusMeters > 0)
            .Select(MakeCircleFeature)
            .ToList();
        _geofenceLayer.Clear();
        _geofenceLayer.AddRange(features);
    }

    private void UpdateUserLayer()
    {
        _userLayer.Clear();
        var loc = _location.LastKnownLocation;
        if (loc is null) return;

        var (x, y) = SphericalMercator.FromLonLat(loc.Longitude, loc.Latitude);
        var f = new PointFeature(new MPoint(x, y));
        f.Styles.Add(new SymbolStyle
        {
            Fill            = new MBrush(new Color(99, 102, 241)),   // indigo-500
            Outline         = new Pen(Color.White, 2.5),
            SymbolType      = SymbolType.Ellipse,
            SymbolScale     = 0.5
        });
        _userLayer.Add(f);
    }

    // ── Feature builders ──────────────────────────────────────────────────────

    private static PointFeature MakePinFeature(PoiLocal poi)
    {
        var (x, y) = SphericalMercator.FromLonLat(poi.Longitude, poi.Latitude);
        var f = new PointFeature(new MPoint(x, y));
        f["PoiId"] = poi.Id;
        f["Name"]  = poi.Name ?? string.Empty;

        f.Styles.Add(new SymbolStyle
        {
            Fill        = new MBrush(new Color(99, 102, 241)),   // indigo-500
            Outline     = new Pen(Color.White, 2),
            SymbolType  = SymbolType.Ellipse,
            SymbolScale = 0.6
        });

        // Label below pin
        if (!string.IsNullOrWhiteSpace(poi.Name))
        {
            f.Styles.Add(new LabelStyle
            {
                Text            = poi.Name,
                ForeColor       = Color.White,
                BackColor       = new MBrush(new Color(30, 41, 59, 200)), // slate-800 semi-transparent
                Font            = new MFont { Size = 11 },
                Offset          = new Offset(0, 18),
                HorizontalAlignment = LabelStyle.HorizontalAlignmentEnum.Center
            });
        }

        return f;
    }

    private static PointFeature MakeCircleFeature(PoiLocal poi)
    {
        var (x, y) = SphericalMercator.FromLonLat(poi.Longitude, poi.Latitude);
        var f = new PointFeature(new MPoint(x, y));

        // Convert geofence radius (metres) to Mercator pixels at zoom 15
        // 1 metre ≈ 0.298 Mapsui units at the equator; close enough for HCM City latitude
        var radiusPx = poi.GeofenceRadiusMeters * 0.298;

        f.Styles.Add(new SymbolStyle
        {
            Fill            = new MBrush(new Color(99, 102, 241, 30)),   // very transparent indigo
            Outline         = new Pen(new Color(99, 102, 241, 140), 1.5),
            SymbolType      = SymbolType.Ellipse,
            SymbolScale     = radiusPx / 32.0   // SymbolStyle default bitmap size is 32px
        });

        return f;
    }

    // ── Pin tap → POI detail ──────────────────────────────────────────────────

    private async void OnMapInfo(object? sender, MapInfoEventArgs e)
    {
        // v5: pass layers to query (replaces ILayer.IsMapInfoLayer)
        var mapInfo = e.GetMapInfo(new[] { _poisLayer });
        var feature = mapInfo.Feature;
        if (feature is null || !feature.Fields.Contains("PoiId")) return;

        var id  = (int)feature["PoiId"]!;
        var poi = _vm.NearbyPois.FirstOrDefault(p => p.Id == id);
        if (poi is null) return;

        await Shell.Current.GoToAsync("poiDetail", new Dictionary<string, object> { { "poi", poi } });
    }
}
