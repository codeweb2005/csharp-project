using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QRCoder;
using VinhKhanh.Application.Services;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class AudioQrService(AppDbContext db, ILogger<AudioQrService> logger) : IAudioQrService
{
    public async Task<byte[]?> GetAudioQrPngAsync(int audioId, string streamUrl, int pixels = 512)
    {
        if (string.IsNullOrWhiteSpace(streamUrl))
            return null;

        pixels = Math.Clamp(pixels, 256, 1024);

        var audio = await db.AudioNarrations
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == audioId && a.IsActive);

        if (audio == null)
            return null;

        // QR encodes the absolute URL that will play the audio.
        var qrContent = streamUrl.Trim();

        try
        {
            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q);
            var pngQr = new PngByteQRCode(qrData);
            return pngQr.GetGraphic(pixels);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate QR for audio {AudioId}", audioId);
            throw;
        }
    }
}

