using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using VinhKhanh.Domain.Interfaces;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Local file storage service — saves files to wwwroot/uploads.
/// Returns absolute URLs using FileStorage:BaseUrl so the admin frontend
/// (running on a different port) can load images without a proxy.
/// In production, replace with S3FileStorageService.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly string _baseUrl;

    public LocalFileStorageService(IWebHostEnvironment env, IConfiguration config)
    {
        _basePath = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads");

        // Use configured absolute base URL (e.g. http://localhost:5015) so the
        // frontend on a different port can load the image URLs directly.
        var configuredBase = config["FileStorage:BaseUrl"]?.TrimEnd('/');
        _baseUrl = string.IsNullOrWhiteSpace(configuredBase)
            ? "/uploads"   // fallback: relative (same origin)
            : $"{configuredBase}/uploads";

        if (!Directory.Exists(_basePath))
            Directory.CreateDirectory(_basePath);
    }

    public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder)
    {
        if (fileStream.CanSeek)
            fileStream.Position = 0;

        // Sanitize filename
        var safeName = $"{Guid.NewGuid():N}{Path.GetExtension(fileName)}";
        var folderPath = Path.Combine(_basePath, folder.Replace('/', Path.DirectorySeparatorChar));

        if (!Directory.Exists(folderPath))
            Directory.CreateDirectory(folderPath);

        var fullPath = Path.Combine(folderPath, safeName);

        using var fs = new FileStream(fullPath, FileMode.Create);
        await fileStream.CopyToAsync(fs);

        // Return relative path for DB storage
        var relativePath = Path.Combine(folder, safeName).Replace('\\', '/');
        return relativePath;
    }

    public Task DeleteAsync(string filePath)
    {
        var fullPath = Path.Combine(_basePath, filePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public Task<Stream?> GetFileAsync(string filePath)
    {
        var fullPath = Path.Combine(_basePath, filePath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(fullPath))
            return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public string GetFileUrl(string filePath)
    {
        return $"{_baseUrl}/{filePath.TrimStart('/').Replace('\\', '/')}";
    }

    /// <summary>
    /// Local storage has no signed URLs — returns a plain absolute URL.
    /// This is fine because local uploads are served as static files.
    /// </summary>
    public string GetSignedUrl(string key, int expiryMinutes = 60)
        => GetFileUrl(key);

    /// <summary>Always false for local storage.</summary>
    public bool IsCloudStorage => false;
}
