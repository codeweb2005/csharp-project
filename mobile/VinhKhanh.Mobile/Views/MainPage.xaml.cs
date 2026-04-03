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

        await _vm.InitializeCommand.ExecuteAsync(null);
    }

    /// <summary>Navigate to PoiDetailPage when the user taps a POI row.</summary>
    private async void OnPoiSelected(object sender, SelectionChangedEventArgs e)
    {
        if (e.CurrentSelection.FirstOrDefault() is not PoiLocal poi) return;

        // Deselect the row immediately so the highlight clears on return
        ((CollectionView)sender).SelectedItem = null;

        // Pass the POI to PoiDetailPage via Shell navigation query parameter
        await Shell.Current.GoToAsync("poiDetail", new Dictionary<string, object>
        {
            { "poi", poi }
        });
    }
}
