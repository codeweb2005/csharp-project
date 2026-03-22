namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Abstraction for audio narration playback.
///
/// Two playback modes are supported:
///   1. Audio file  — streams an MP3 from the API (or local cache in Phase 3)
///                    using CommunityToolkit.Maui.MediaElement.
///   2. TTS fallback — if no audio URL is provided, speaks the narration text
///                     using the built-in device TextToSpeech engine.
///
/// Usage:
///   await player.PlayAsync(audioUrl: "http://...", ttsText: "...", langCode: "vi");
///   player.Stop();
/// </summary>
public interface INarrationPlayer
{
    /// <summary>
    /// Start playback of a narration.
    /// If <paramref name="audioUrl"/> is not null, streams from that URL.
    /// If <paramref name="audioUrl"/> is null and <paramref name="ttsText"/> is not null,
    /// falls back to device TTS in <paramref name="langCode"/>.
    /// Calling this while already playing stops the current track first.
    /// </summary>
    Task PlayAsync(string? audioUrl, string? ttsText, string langCode);

    /// <summary>Stop playback immediately.</summary>
    void Stop();

    /// <summary>Pause playback (audio only; TTS cannot be paused).</summary>
    void Pause();

    /// <summary>Resume paused audio playback.</summary>
    void Resume();

    /// <summary>True while audio or TTS is actively playing.</summary>
    bool IsPlaying { get; }

    /// <summary>The name/title of the currently playing POI (for NowPlayingBar).</summary>
    string? CurrentPoiName { get; }

    /// <summary>Raised when playback finishes naturally (not when stopped manually).</summary>
    event EventHandler PlaybackCompleted;

    /// <summary>Raised when IsPlaying changes (for UI binding).</summary>
    event EventHandler IsPlayingChanged;
}
