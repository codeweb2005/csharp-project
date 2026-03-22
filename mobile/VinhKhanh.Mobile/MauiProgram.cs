using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
using VinhKhanh.Mobile.Services;
using VinhKhanh.Mobile.ViewModels;
using VinhKhanh.Mobile.Views;

namespace VinhKhanh.Mobile;

/// <summary>
/// Application entry point and dependency injection configuration.
///
/// DI registrations:
///   Singleton  — services that hold state across the app lifetime (GPS, Geofence, Player)
///   Transient  — pages and ViewModels (new instance per navigation)
///
/// CommunityToolkit setup:
///   UseMauiCommunityToolkit()         — converters, behaviours
///   UseMauiCommunityToolkitMediaElement() — audio playback
/// </summary>
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();

        builder
            .UseMauiApp<App>()
            // CommunityToolkit.Maui — converters, InvertedBoolConverter etc.
            .UseMauiCommunityToolkit()
            // CommunityToolkit.Maui.MediaElement 8.x requires:
            //   isAndroidForegroundServiceEnabled — false for PoC (no background service yet).
            //   Phase 3: set to true when implementing the Android foreground service
            //   so audio continues when the screen is off.
            .UseMauiCommunityToolkitMediaElement(isAndroidForegroundServiceEnabled: false)
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf",    "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf",   "OpenSansSemiBold");
            });

        // ── Services (Singleton — shared for app lifetime) ─────────────────────

        // GPS service: read poll interval from appsettings if needed
        builder.Services.AddSingleton<ILocationService>(_ => new LocationService(pollIntervalSeconds: 5));

        // GeofenceEngine depends on ILocationService — resolved automatically
        builder.Services.AddSingleton<GeofenceEngine>();

        // NarrationPlayer — registered as both interface and concrete type
        // so MainPage can call SetMediaElement() without casting
        builder.Services.AddSingleton<NarrationPlayer>();
        builder.Services.AddSingleton<INarrationPlayer>(sp => sp.GetRequiredService<NarrationPlayer>());

        // ApiClient needs IHttpClientFactory
        builder.Services.AddHttpClient("VinhKhanh");
        builder.Services.AddSingleton<ApiClient>();

        // ── Pages & ViewModels (Transient — new instance per navigation) ────────
        builder.Services.AddTransient<MainPage>();
        builder.Services.AddTransient<MainViewModel>();
        builder.Services.AddTransient<PoiDetailPage>();
        builder.Services.AddTransient<PoiDetailViewModel>();

        // ── Logging (debug builds only) ────────────────────────────────────────
#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
