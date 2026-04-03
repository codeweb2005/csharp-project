using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
using SQLitePCL;
using VinhKhanh.Mobile.Services;
using VinhKhanh.Mobile.ViewModels;
using VinhKhanh.Mobile.Views;

namespace VinhKhanh.Mobile;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        Batteries_V2.Init();

        var builder = MauiApp.CreateBuilder();

        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .UseMauiCommunityToolkitMediaElement(isAndroidForegroundServiceEnabled: false)
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemiBold");
            });

        builder.Services.AddSingleton(_ => MobileAppSettings.LoadDefault());
        builder.Services.AddSingleton<ILocationService>(sp =>
            new LocationService(sp.GetRequiredService<MobileAppSettings>().LocationPollIntervalSeconds));

        builder.Services.AddSingleton<GeofenceEngine>();

        builder.Services.AddSingleton<NarrationPlayer>();
        builder.Services.AddSingleton<INarrationPlayer>(sp => sp.GetRequiredService<NarrationPlayer>());

        builder.Services.AddHttpClient("VinhKhanh");
        builder.Services.AddSingleton<ApiClient>();
        builder.Services.AddSingleton<OfflineCacheStore>();
        builder.Services.AddSingleton<OfflinePackageSyncService>();

        builder.Services.AddTransient<MainPage>();
        builder.Services.AddTransient<MainViewModel>();
        builder.Services.AddTransient<PoiDetailPage>();
        builder.Services.AddTransient<PoiDetailViewModel>();
        builder.Services.AddTransient<ProfilePage>();
        builder.Services.AddTransient<ProfileViewModel>();
        builder.Services.AddTransient<LoginPage>();
        builder.Services.AddTransient<LoginViewModel>();
        builder.Services.AddTransient<RegisterPage>();
        builder.Services.AddTransient<RegisterViewModel>();
        builder.Services.AddTransient<MapPage>();
        builder.Services.AddTransient<MapViewModel>();
        builder.Services.AddTransient<ResetPasswordPage>();
        builder.Services.AddTransient<ResetPasswordViewModel>();
        builder.Services.AddTransient<OfflinePage>();
        builder.Services.AddTransient<OfflineViewModel>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
