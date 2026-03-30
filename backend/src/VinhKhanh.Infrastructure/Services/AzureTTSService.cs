using Microsoft.CognitiveServices.Speech;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VinhKhanh.Domain.Interfaces;

namespace VinhKhanh.Infrastructure.Services;

public class AzureTTSService : ITTSService
{
    private readonly string _subscriptionKey;
    private readonly string _region;
    private readonly ILogger<AzureTTSService> _logger;

    public AzureTTSService(IConfiguration config, ILogger<AzureTTSService> logger)
    {
        _logger = logger;
        _subscriptionKey = config["AzureTTS:SubscriptionKey"]
            ?? throw new InvalidOperationException("AzureTTS:SubscriptionKey is required.");
        _region = config["AzureTTS:Region"] ?? "southeastasia";
    }

    public async Task<TTSResult> GenerateAsync(string text, string language, string voiceName, double speed = 1.0)
    {
        var speechConfig = SpeechConfig.FromSubscription(_subscriptionKey, _region);
        speechConfig.SetSpeechSynthesisOutputFormat(SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3);
        speechConfig.SpeechSynthesisVoiceName = voiceName;

        // prosody rate: convert 1.0 → "+0%", 1.5 → "+50%", 0.8 → "-20%"
        var ratePercent = (int)Math.Round((speed - 1.0) * 100);
        var rateStr = ratePercent >= 0 ? $"+{ratePercent}%" : $"{ratePercent}%";
        var escapedText = System.Security.SecurityElement.Escape(text);

        var ssml = $"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"{language}\">" +
                   $"<voice name=\"{voiceName}\">" +
                   $"<prosody rate=\"{rateStr}\">{escapedText}</prosody>" +
                   $"</voice></speak>";

        using var synthesizer = new SpeechSynthesizer(speechConfig, null);
        var result = await synthesizer.SpeakSsmlAsync(ssml);

        if (result.Reason == ResultReason.Canceled)
        {
            var cancellation = SpeechSynthesisCancellationDetails.FromResult(result);
            _logger.LogError("TTS cancelled: {Reason} — {Detail}", cancellation.Reason, cancellation.ErrorDetails);
            throw new InvalidOperationException($"TTS generation failed: {cancellation.ErrorDetails}");
        }

        var audioData = result.AudioData;
        var durationSeconds = (int)Math.Ceiling(result.AudioDuration.TotalSeconds);

        _logger.LogInformation("TTS generated: voice={Voice} duration={Duration}s size={Size} bytes",
            voiceName, durationSeconds, audioData.Length);

        return new TTSResult
        {
            AudioData = audioData,
            DurationSeconds = durationSeconds,
            ContentType = "audio/mpeg"
        };
    }
}
