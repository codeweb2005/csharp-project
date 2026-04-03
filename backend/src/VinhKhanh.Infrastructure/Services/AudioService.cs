using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class AudioService : IAudioService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly ITTSService _tts;
    private readonly ILogger<AudioService> _logger;

    public AudioService(AppDbContext db, IFileStorageService storage, ITTSService tts, ILogger<AudioService> logger)
    {
        _db = db;
        _storage = storage;
        _tts = tts;
        _logger = logger;
    }

    public async Task<ApiResponse<List<AudioDto>>> GetByPOIAsync(int poiId, string? lang = null)
    {
        var query = _db.AudioNarrations
            .Include(a => a.Language)
            .Where(a => a.POIId == poiId && a.IsActive)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(lang))
            query = query.Where(a => a.Language.Code == lang);

        var audios = await query.OrderBy(a => a.LanguageId).ThenByDescending(a => a.IsDefault).ToListAsync();

        var dtos = audios.Select(MapToDto).ToList();
        return ApiResponse<List<AudioDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<AudioDto>> UploadAsync(int poiId, int languageId, Stream file, string fileName)
    {
        // Verify POI exists
        if (!await _db.POIs.AnyAsync(p => p.Id == poiId))
            return ApiResponse<AudioDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        // Save file
        var filePath = await _storage.UploadAsync(file, fileName, $"audio/poi-{poiId}");

        // Check if this is the first audio for this lang → make default
        var hasExisting = await _db.AudioNarrations
            .AnyAsync(a => a.POIId == poiId && a.LanguageId == languageId);

        var audio = new AudioNarration
        {
            POIId = poiId,
            LanguageId = languageId,
            FilePath = filePath,
            VoiceType = VoiceType.Recorded,
            Duration = 0, // Would be calculated from file in production
            FileSize = file.Length,
            IsDefault = !hasExisting,
            IsActive = true
        };

        _db.AudioNarrations.Add(audio);
        await _db.SaveChangesAsync();

        // Reload with language
        var created = await _db.AudioNarrations
            .Include(a => a.Language)
            .FirstAsync(a => a.Id == audio.Id);

        _logger.LogInformation("Audio uploaded for POI {PoiId}: {Id}", poiId, audio.Id);
        return ApiResponse<AudioDto>.Ok(MapToDto(created));
    }

    public async Task<ApiResponse<AudioDto>> GenerateTTSAsync(int poiId, GenerateTTSRequest request, List<int>? vendorPOIIds = null)
    {
        // Verify POI exists
        if (!await _db.POIs.AnyAsync(p => p.Id == poiId))
            return ApiResponse<AudioDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        // Vendor ownership check
        if (vendorPOIIds != null && !vendorPOIIds.Contains(poiId))
            return ApiResponse<AudioDto>.Fail("FORBIDDEN", "You do not have permission for this POI");

        // Resolve language TtsCode for SSML xml:lang attribute
        var language = await _db.Languages.FindAsync(request.LanguageId);
        var langCode = language?.TtsCode ?? "vi-VN";

        // Generate audio via Azure TTS
        var ttsResult = await _tts.GenerateAsync(request.Text, langCode, request.VoiceName, request.Speed);

        // Upload generated audio to file storage
        using var audioStream = new MemoryStream(ttsResult.AudioData);
        var fileName = $"tts-{Guid.NewGuid():N}.mp3";
        var filePath = await _storage.UploadAsync(audioStream, fileName, $"audio/poi-{poiId}");

        // Check if this is the first audio for this lang → make default
        var hasExisting = await _db.AudioNarrations
            .AnyAsync(a => a.POIId == poiId && a.LanguageId == request.LanguageId);

        var audio = new AudioNarration
        {
            POIId = poiId,
            LanguageId = request.LanguageId,
            FilePath = filePath,
            VoiceType = VoiceType.TTS,
            VoiceName = request.VoiceName,
            Duration = ttsResult.DurationSeconds,
            FileSize = ttsResult.AudioData.Length,
            IsDefault = !hasExisting,
            IsActive = true
        };

        _db.AudioNarrations.Add(audio);
        await _db.SaveChangesAsync();

        var created = await _db.AudioNarrations
            .Include(a => a.Language)
            .FirstAsync(a => a.Id == audio.Id);

        _logger.LogInformation("TTS generated for POI {PoiId}: {Id}", poiId, audio.Id);
        return ApiResponse<AudioDto>.Ok(MapToDto(created));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id, List<int>? vendorPOIIds = null)
    {
        var audio = await _db.AudioNarrations.FindAsync(id);
        if (audio == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy audio");

        // Vendor ownership check
        if (vendorPOIIds != null && !vendorPOIIds.Contains(audio.POIId))
            return ApiResponse<bool>.Fail("FORBIDDEN", "You do not have permission to delete this audio");

        // Try delete file
        try { await _storage.DeleteAsync(audio.FilePath); } catch { /* log but continue */ }

        _db.AudioNarrations.Remove(audio);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Audio deleted: {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> SetDefaultAsync(int id)
    {
        var audio = await _db.AudioNarrations.FindAsync(id);
        if (audio == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy audio");

        // Unset all defaults for same POI + language
        var siblings = await _db.AudioNarrations
            .Where(a => a.POIId == audio.POIId && a.LanguageId == audio.LanguageId)
            .ToListAsync();

        foreach (var s in siblings)
            s.IsDefault = s.Id == id;

        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<Stream?> GetStreamAsync(int id)
    {
        var audio = await _db.AudioNarrations.FindAsync(id);
        if (audio == null) return null;
        return await _storage.GetFileAsync(audio.FilePath);
    }

    public async Task<string?> GetFileKeyAsync(int id)
    {
        var audio = await _db.AudioNarrations.FindAsync(id);
        return audio?.FilePath;
    }

    private static AudioDto MapToDto(AudioNarration a) => new()
    {
        Id = a.Id,
        POIId = a.POIId,
        LanguageId = a.LanguageId,
        LanguageName = a.Language?.Name ?? "",
        FlagEmoji = a.Language?.FlagEmoji ?? "",
        FilePath = a.FilePath,
        VoiceType = a.VoiceType.ToString(),
        VoiceName = a.VoiceName,
        Duration = a.Duration,
        FileSize = a.FileSize,
        IsDefault = a.IsDefault
    };
}
