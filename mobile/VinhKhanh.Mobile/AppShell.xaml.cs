using VinhKhanh.Mobile.Views;

namespace VinhKhanh.Mobile;

/// <summary>
/// Application Shell — registers navigation routes.
///
/// Routes:
///   "poiDetail" → PoiDetailPage  (navigated from MainPage via GoToAsync)
///
/// Phase 3 will register additional routes:
///   "language"  → LanguagePage
///   "map"       → MapPage
/// </summary>
public partial class AppShell : Shell
{
    public AppShell()
    {
        InitializeComponent();

        // Register detail page route for programmatic navigation.
        // This allows: await Shell.Current.GoToAsync("poiDetail", new { poi = selectedPoi })
        Routing.RegisterRoute("poiDetail", typeof(PoiDetailPage));
        Routing.RegisterRoute("login", typeof(LoginPage));
        Routing.RegisterRoute("register", typeof(RegisterPage));
        Routing.RegisterRoute("resetPassword", typeof(ResetPasswordPage));
    }
}

