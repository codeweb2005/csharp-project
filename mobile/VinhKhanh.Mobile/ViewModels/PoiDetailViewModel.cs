using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;
using System.Collections.ObjectModel;

namespace VinhKhanh.Mobile.ViewModels;

/// <summary>
/// ViewModel for PoiDetailPage.
///
/// Receives the selected <see cref="PoiLocal"/> via Shell query parameter and exposes it
/// for display. On load, fetches the full public POI detail from
/// GET /api/v1/pois/{id}/public to show description, highlights, media, and menu items (T-13).
/// </summary>
[QueryProperty(nameof(Poi), "poi")]
public partial class PoiDetailViewModel : ObservableObject
{
    private readonly INarrationPlayer       _player;
    private readonly VisitQueueStore        _visitQueue;
    private readonly ApiClient              _api;
    private DateTime _playStartTime;

    // ── Basic state (from list navigation) ────────────────────────────────────

    /// <summary>The POI to display. Set by Shell navigation query parameter.</summary>
    [ObservableProperty]
    private PoiLocal? _poi;

    /// <summary>True while narration is playing (disables Play button to prevent double-tap).</summary>
    [ObservableProperty]
    private bool _isPlaying;

    /// <summary>Feedback label while loading audio.</summary>
    [ObservableProperty]
    private string _statusMessage = string.Empty;

    // ── T-13: Extended detail loaded from /pois/{id}/public ──────────────────

    /// <summary>True while loading full detail from API.</summary>
    [ObservableProperty]
    private bool _isLoadingDetail;

    /// <summary>Full description text from the API (may be multi-paragraph).</summary>
    [ObservableProperty]
    private string _description = string.Empty;

    /// <summary>Highlights string (bullet-point summary from admin).</summary>
    [ObservableProperty]
    private string _highlights = string.Empty;

    /// <summary>Price range label e.g. "20,000 – 50,000₫".</summary>
    [ObservableProperty]
    private string _priceRange = string.Empty;

    /// <summary>Primary image URL for the hero banner (first image in Media list).</summary>
    [ObservableProperty]
    private string _primaryImageUrl = string.Empty;

    /// <summary>Menu items for the food/drink CollectionView.</summary>
    [ObservableProperty]
    private ObservableCollection<PoiMenuItemDto> _menuItems = [];

    /// <summary>Flag: detail has been successfully loaded.</summary>
    [ObservableProperty]
    private bool _hasDetail;

    public PoiDetailViewModel(INarrationPlayer player, VisitQueueStore visitQueue, ApiClient api)
    {
        _player     = player;
        _visitQueue = visitQueue;
        _api        = api;

        _player.IsPlayingChanged += (_, _) =>
            MainThread.BeginInvokeOnMainThread(() => IsPlaying = _player.IsPlaying);
        _player.PlaybackCompleted += OnPlaybackCompleted;
    }

    // ── Property change hook — load full detail when POI is set ───────────────

    partial void OnPoiChanged(PoiLocal? value)
    {
        if (value is null) return;
        Task.Run(async () => await LoadFullDetailAsync(value.Id));
    }

    // ── Commands ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Play the narration for this POI.
    /// If an audio URL exists → streams from the API (with TTS fallback on failure via T-10).
    /// Otherwise → TTS speaks the narration text in the POI's language.
    /// </summary>
    [RelayCommand(CanExecute = nameof(CanPlay))]
    private async Task PlayNarrationAsync()
    {
        if (Poi is null) return;

        StatusMessage = "▶ Loading…";
        IsPlaying = true;
        _playStartTime = DateTime.UtcNow;

        // Enqueue a manual visit event
        _visitQueue.Enqueue(
            poiId:           Poi.Id,
            languageId:      0,    // language not known at this layer; server accepts 0 gracefully
            triggerType:     "manual",
            narrationPlayed: true);

        await _player.PlayAsync(Poi.AudioUrl, Poi.NarrationText, Poi.LangCode ?? "vi");
        StatusMessage = string.Empty;
    }

    [RelayCommand]
    private async Task LoadFullDetailAsync(int poiId)
    {
        if (IsLoadingDetail) return;
        IsLoadingDetail = true;

        try
        {
            var langId = Preferences.Default.Get("preferred_language_id", 1);
            var detail = await _api.GetPoiPublicDetailAsync(poiId, langId);

            if (detail is null)
            {
                Console.WriteLine($"[PoiDetailViewModel] Full detail not available for POI {poiId}");
                return;
            }

            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                Description     = detail.Description   ?? string.Empty;
                Highlights      = detail.Highlights     ?? string.Empty;
                PriceRange      = detail.PriceRange     ?? string.Empty;
                PrimaryImageUrl = detail.Media.FirstOrDefault(m => m.IsPrimary)?.FileUrl
                                ?? detail.Media.FirstOrDefault()?.FileUrl
                                ?? string.Empty;

                MenuItems.Clear();
                foreach (var item in detail.MenuItems)
                    MenuItems.Add(item);

                HasDetail = true;
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PoiDetailViewModel] LoadFullDetailAsync error: {ex.Message}");
        }
        finally
        {
            IsLoadingDetail = false;
        }
    }

    private void OnPlaybackCompleted(object? sender, EventArgs e)
    {
        if (Poi is null) return;
        var listenSeconds = (int)(DateTime.UtcNow - _playStartTime).TotalSeconds;
        _visitQueue.UpdateListenDuration(Poi.Id, listenSeconds);
    }

    private bool CanPlay() => Poi is not null && !IsPlaying;

    /// <summary>Navigate back to the main POI list.</summary>
    [RelayCommand]
    private static async Task GoBackAsync()
        => await Shell.Current.GoToAsync("..");
}
