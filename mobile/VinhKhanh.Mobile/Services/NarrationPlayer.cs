using CommunityToolkit.Maui.Alerts;
using CommunityToolkit.Maui.Core.Primitives;
using CommunityToolkit.Maui.Views;
using CommunityToolkit.Maui.Core;

namespace VinhKhanh.Mobile.Services;

/// <summary>
/// Concrete narration player backed by MediaElement (audio files) with TTS fallback.
///
/// Playback order:
///   1. If audioUrl is non-null → MediaElement.Source = Uri → Play()
///   2. If audioUrl is null but ttsText is non-null → TextToSpeech.SpeakAsync()
///   3. If both null → no-op (logs warning)
///
/// Phase 3 will add a local audio cache check before streaming from the API:
///   var cachePath = Path.Combine(FileSystem.AppDataDirectory, "audio", $"{narrationId}.mp3");
///   if (File.Exists(cachePath)) source = MediaSource.FromFile(cachePath);
///   else source = MediaSource.FromUri(audioUrl);
///
/// Known limitation (PoC): MediaElement must be attached to the visual tree, so
/// NarrationPlayer needs a reference to it from the page's XAML code-behind.
/// Call SetMediaElement() from MainPage.xaml.cs after the page loads.
/// This is resolved in Phase 3 with a service-hosted MediaElement on a floating overlay.
/// </summary>
public class NarrationPlayer : INarrationPlayer
{
    // The MediaElement is owned by MainPage.xaml — we hold a weak reference
    // so we don't prevent GC if the page is destroyed.
    private WeakReference<MediaElement>? _mediaRef;

    // ── State ──────────────────────────────────────────────────────────────────
    private CancellationTokenSource? _ttsCts;   // cancels in-flight TTS
    private bool _isTtsPlaying;

    // T-10: track last TTS text/lang for MediaFailed fallback
    private string? _lastTtsText;
    private string  _lastLangCode = "vi";

    public bool IsPlaying { get; private set; }
    public string? CurrentPoiName { get; private set; }

    // ── Events ─────────────────────────────────────────────────────────────────
    public event EventHandler? PlaybackCompleted;
    public event EventHandler? IsPlayingChanged;

    // ── Setup ──────────────────────────────────────────────────────────────────

    /// <summary>
    /// Call from MainPage.xaml.cs after the MediaElement is in the visual tree.
    /// </summary>
    public void SetMediaElement(MediaElement element)
    {
        _mediaRef = new WeakReference<MediaElement>(element);

        // Subscribe once — wire StateChanged so we can raise PlaybackCompleted
        element.StateChanged += OnMediaStateChanged;
    }

    // ── INarrationPlayer ───────────────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task PlayAsync(string? audioUrl, string? ttsText, string langCode,
        string? poiName = null)
    {
        Stop();   // Always stop whatever is playing before starting new narration

        CurrentPoiName = poiName;

        // T-10: cache for MediaFailed fallback
        _lastTtsText  = ttsText;
        _lastLangCode = langCode;

        if (audioUrl is not null)
        {
            await PlayAudioAsync(audioUrl);
        }
        else if (ttsText is not null)
        {
            await PlayTtsAsync(ttsText, langCode);
        }
        else
        {
            Console.WriteLine("[NarrationPlayer] No audioUrl or ttsText — nothing to play.");
        }
    }

    /// <inheritdoc/>
    public void Stop()
    {
        // Cancel any in-flight TTS
        _ttsCts?.Cancel();
        _ttsCts?.Dispose();
        _ttsCts = null;
        _isTtsPlaying = false;

        // Stop MediaElement if it's loaded
        if (_mediaRef?.TryGetTarget(out var element) == true)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                element.Stop();
                element.Source = null;
            });
        }

        SetIsPlaying(false);
    }

    /// <inheritdoc/>
    public void Pause()
    {
        if (_isTtsPlaying) return; // TTS cannot be paused

        if (_mediaRef?.TryGetTarget(out var element) == true)
            MainThread.BeginInvokeOnMainThread(element.Pause);
    }

    /// <inheritdoc/>
    public void Resume()
    {
        if (_isTtsPlaying) return;

        if (_mediaRef?.TryGetTarget(out var element) == true)
            MainThread.BeginInvokeOnMainThread(element.Play);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private Task PlayAudioAsync(string url)
    {
        if (_mediaRef?.TryGetTarget(out var element) != true)
        {
            Console.WriteLine("[NarrationPlayer] MediaElement not set — cannot play audio.");
            // T-10: fallback to TTS when MediaElement not available
            if (_lastTtsText is not null)
                return PlayTtsAsync(_lastTtsText, _lastLangCode);
            return Task.CompletedTask;
        }

        MainThread.BeginInvokeOnMainThread(() =>
        {
            // T-10: subscribe to MediaFailed before setting source
            element.MediaFailed -= OnMediaFailed;  // remove old subscription first
            element.MediaFailed += OnMediaFailed;

            if (TryGetLocalFilePath(url, out var localPath))
                element.Source = MediaSource.FromFile(localPath);
            else
                element.Source = MediaSource.FromUri(new Uri(url, UriKind.Absolute));
            element.Play();
        });

        SetIsPlaying(true);
        return Task.CompletedTask;
    }

    /// <summary>T-10: MediaElement failed to load/play — auto-fallback to TTS.</summary>
    private void OnMediaFailed(object? sender, MediaFailedEventArgs e)
    {
        Console.WriteLine($"[NarrationPlayer] Media failed: {e.ErrorMessage}. Falling back to TTS.");

        // Unsubscribe to prevent repeat callbacks
        if (sender is MediaElement el)
            el.MediaFailed -= OnMediaFailed;

        SetIsPlaying(false);

        // Show toast and fallback asynchronously
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            try
            {
                await Toast.Make("Audio unavailable, using TTS").Show();
            }
            catch { /* Toast may fail on some platforms */ }

            if (_lastTtsText is not null)
                await PlayTtsAsync(_lastTtsText, _lastLangCode);
        });
    }

    private static bool TryGetLocalFilePath(string url, out string path)
    {
        path = "";
        if (string.IsNullOrWhiteSpace(url)) return false;

        if (url.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                path = Uri.UnescapeDataString(new Uri(url).LocalPath);
                return File.Exists(path);
            }
            catch
            {
                return false;
            }
        }

        if (!url.Contains("://", StringComparison.Ordinal) && File.Exists(url))
        {
            path = url;
            return true;
        }

        return false;
    }

    private async Task PlayTtsAsync(string text, string langCode)
    {
        _ttsCts = new CancellationTokenSource();
        _isTtsPlaying = true;
        SetIsPlaying(true);

        try
        {
            // SpeechOptions in MAUI uses Locale (not Language).
            // Locale is optional — when null the device default voice is used.
            var locales = await TextToSpeech.GetLocalesAsync();

            // T-10.2: Try preferred locale first, then system default
            var locale  = locales.FirstOrDefault(l =>
                l.Language.StartsWith(langCode, StringComparison.OrdinalIgnoreCase));

            if (locale is null)
            {
                Console.WriteLine($"[NarrationPlayer] TTS locale '{langCode}' not found — using system default.");
                // locale = null → MAUI uses system default automatically
            }

            await TextToSpeech.SpeakAsync(text, new SpeechOptions
            {
                // Locale may be null — MAUI handles null gracefully with system default
                Locale = locale,
                Volume = 1.0f,
                Pitch  = 1.0f
            }, _ttsCts.Token);

            // SpeakAsync returns when TTS finishes naturally
            _isTtsPlaying = false;
            SetIsPlaying(false);
            PlaybackCompleted?.Invoke(this, EventArgs.Empty);
        }
        catch (OperationCanceledException)
        {
            // Stopped manually — no event fired
            _isTtsPlaying = false;
        }
        catch (Exception ex)
        {
            // T-10.2: TTS also failed — log and clean up gracefully
            Console.WriteLine($"[NarrationPlayer] TTS error: {ex.Message}");
            _isTtsPlaying = false;
            SetIsPlaying(false);
        }
    }


    private void OnMediaStateChanged(object? sender, MediaStateChangedEventArgs e)
    {
        // MediaElementState.Stopped fires both on manual stop AND natural end.
        // We only raise PlaybackCompleted on natural end (when Source was set before stopping).
        // Note: MediaElementState enum values differ by CT.Maui version:
        //   CT.Maui 7.x: Stopped, Playing, Paused, Buffering, Failed
        //   CT.Maui 8.x: Same enum, compatible
        if (e.NewState == MediaElementState.Stopped || e.NewState == MediaElementState.None)
        {
            bool wasPlaying = IsPlaying;
            SetIsPlaying(false);

            // Only fire PlaybackCompleted if we were playing (not a manual Stop call)
            if (wasPlaying)
                PlaybackCompleted?.Invoke(this, EventArgs.Empty);
        }
    }

    private void SetIsPlaying(bool value)
    {
        if (IsPlaying == value) return;
        IsPlaying = value;
        IsPlayingChanged?.Invoke(this, EventArgs.Empty);
    }

    // Explicit interface implementation to forward poiName
    Task INarrationPlayer.PlayAsync(string? audioUrl, string? ttsText, string langCode)
        => PlayAsync(audioUrl, ttsText, langCode, null);
}
