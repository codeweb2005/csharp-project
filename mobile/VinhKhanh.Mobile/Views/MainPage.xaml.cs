using CommunityToolkit.Maui.Core;
using CommunityToolkit.Maui.Core.Primitives;
using CommunityToolkit.Maui.Views;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;
using VinhKhanh.Mobile.ViewModels;

namespace VinhKhanh.Mobile.Views;

/// <summary>
/// Code-behind for MainPage.
///
/// Responsibilities here (kept minimal — logic lives in MainViewModel):
///   - Set BindingContext from DI
///   - Call ViewModel.InitializeAsync() on appearing
///   - Wire MediaElement to NarrationPlayer after the page loads
///   - Handle CollectionView SelectionChanged → navigate to detail page
///   - T-12: Update PlaybackProgress + PlaybackTimeRemaining from MediaElement events
/// </summary>
public partial class MainPage : ContentPage
{
    private readonly MainViewModel    _vm;
    private readonly NarrationPlayer  _player; // concrete type needed to call SetMediaElement

    public MainPage(MainViewModel vm, NarrationPlayer player)
    {
        InitializeComponent();
        _vm     = vm;
        _player = player;
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        // Give the MediaElement time to enter the visual tree before wiring it
        // (it's inside the NowPlayingBar Grid which may not have rendered yet)
        await Task.Delay(200);
        _player.SetMediaElement(NarrationMediaElement);

        // T-12: Wire MediaElement events for live progress updates
        NarrationMediaElement.PositionChanged -= OnMediaPositionChanged;
        NarrationMediaElement.PositionChanged += OnMediaPositionChanged;

        await _vm.InitializeCommand.ExecuteAsync(null);
    }

    /// <summary>Navigate to PoiDetailPage when the user taps a POI row.</summary>
    private async void OnPoiSelected(object sender, SelectionChangedEventArgs e)
    {
        if (sender is not CollectionView cv) return;
        if (e.CurrentSelection.FirstOrDefault() is not PoiLocal poi) return;

        // Defer clear + navigation so Android RecyclerView finishes layout (avoids crashes
        // with Shell TabBar / ViewPager2 on some devices).
        await Task.Yield();
        await MainThread.InvokeOnMainThreadAsync(() => cv.SelectedItem = null);
        await Shell.Current.GoToAsync("poiDetail", new Dictionary<string, object>
        {
            { "poi", poi }
        });
    }

    /// <summary>T-12: Update progress properties in MainViewModel from MediaElement position.</summary>
    private void OnMediaPositionChanged(object? sender, MediaPositionChangedEventArgs e)
    {
        var duration = NarrationMediaElement.Duration;
        if (duration <= TimeSpan.Zero) return;

        var position = e.Position;
        var progress = position.TotalSeconds / duration.TotalSeconds;
        var remaining = duration - position;

        _vm.PlaybackProgress = Math.Clamp(progress, 0.0, 1.0);
        _vm.PlaybackTimeRemaining = remaining > TimeSpan.Zero
            ? $"-{(int)remaining.TotalMinutes}:{remaining.Seconds:D2}"
            : "0:00";
    }
}
