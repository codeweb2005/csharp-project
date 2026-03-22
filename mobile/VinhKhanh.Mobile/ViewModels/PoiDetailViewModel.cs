using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VinhKhanh.Mobile.Models;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

/// <summary>
/// ViewModel for PoiDetailPage.
///
/// Receives the selected <see cref="PoiLocal"/> via Shell query parameter
/// and exposes it for display. Provides the "Play Narration" command.
/// </summary>
[QueryProperty(nameof(Poi), "poi")]
public partial class PoiDetailViewModel : ObservableObject
{
    private readonly INarrationPlayer _player;

    // ── Observable state ───────────────────────────────────────────────────────

    /// <summary>The POI to display. Set by Shell navigation query parameter.</summary>
    [ObservableProperty]
    private PoiLocal? _poi;

    /// <summary>True while narration is playing (disables Play button to prevent double-tap).</summary>
    [ObservableProperty]
    private bool _isPlaying;

    /// <summary>Feedback label while loading audio.</summary>
    [ObservableProperty]
    private string _statusMessage = string.Empty;

    public PoiDetailViewModel(INarrationPlayer player)
    {
        _player = player;
        _player.IsPlayingChanged += (_, _) =>
            MainThread.BeginInvokeOnMainThread(() => IsPlaying = _player.IsPlaying);
    }

    // ── Commands ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Play the narration for this POI.
    /// If an audio URL exists → streams from the API.
    /// Otherwise → TTS speaks the narration text in the POI's language.
    /// </summary>
    [RelayCommand(CanExecute = nameof(CanPlay))]
    private async Task PlayNarrationAsync()
    {
        if (Poi is null) return;

        StatusMessage = "▶ Loading…";
        IsPlaying = true;

        await _player.PlayAsync(Poi.AudioUrl, Poi.NarrationText, Poi.LangCode ?? "vi");
        StatusMessage = string.Empty;
    }

    private bool CanPlay() => Poi is not null && !IsPlaying;

    /// <summary>Navigate back to the main POI list.</summary>
    [RelayCommand]
    private static async Task GoBackAsync()
        => await Shell.Current.GoToAsync("..");
}
