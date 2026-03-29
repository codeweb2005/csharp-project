using System.Linq.Expressions;
using VinhKhanh.Domain.Entities;

namespace VinhKhanh.Domain.Interfaces;

/// <summary>Generic repository interface</summary>
public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(int id);
    Task<IReadOnlyList<T>> GetAllAsync();
    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
}

/// <summary>POI-specific repository</summary>
public interface IPOIRepository : IRepository<POI>
{
    Task<(IReadOnlyList<POI> Items, int TotalCount)> GetPagedAsync(
        int page, int size, string? search = null,
        int? categoryId = null, bool? isActive = null,
        string sortBy = "name", string order = "asc",
        List<int>? vendorPOIIds = null);
    Task<POI?> GetDetailAsync(int id);
    Task<IReadOnlyList<POI>> GetNearbyAsync(double lat, double lng, double radiusKm);
}

/// <summary>File storage service</summary>
public interface IFileStorageService
{
    Task<string> UploadAsync(Stream fileStream, string fileName, string folder);
    Task DeleteAsync(string filePath);
    Task<Stream?> GetFileAsync(string filePath);
    string GetFileUrl(string filePath);
    /// <summary>
    /// Returns a short-lived presigned URL for private files (S3 only).
    /// For local storage, returns the same value as GetFileUrl.
    /// </summary>
    string GetSignedUrl(string key, int expiryMinutes = 60);
    /// <summary>Returns true if the backend is using S3 (cloud) storage.</summary>
    bool IsCloudStorage { get; }
}

/// <summary>TTS service</summary>
public interface ITTSService
{
    Task<TTSResult> GenerateAsync(string text, string language, string voiceName, double speed = 1.0);
}

public class TTSResult
{
    public byte[] AudioData { get; set; } = [];
    public int DurationSeconds { get; set; }
    public string ContentType { get; set; } = "audio/mpeg";
}
