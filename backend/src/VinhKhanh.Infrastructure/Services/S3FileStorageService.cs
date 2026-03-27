using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VinhKhanh.Domain.Interfaces;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// AWS S3 file storage service — used in production (ECS/CloudFront deployment).
/// Activated when FileStorage:Provider = "s3" in configuration.
///
/// Config keys required:
///   FileStorage:S3BucketName — the S3 bucket name
///   FileStorage:S3Region     — AWS region, e.g. "ap-southeast-1"
///   FileStorage:S3BaseUrl    — optional CDN/CloudFront URL prefix (falls back to S3 URL)
///
/// AWS credentials are read from the environment (IAM role or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
/// </summary>
public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucket;
    private readonly string _baseUrl;
    private readonly ILogger<S3FileStorageService> _logger;

    public S3FileStorageService(IConfiguration config, ILogger<S3FileStorageService> logger)
    {
        _logger = logger;

        _bucket = config["FileStorage:S3BucketName"]
            ?? throw new InvalidOperationException("FileStorage:S3BucketName is required when using S3 provider.");

        var region = config["FileStorage:S3Region"] ?? "ap-southeast-1";
        var endpoint = RegionEndpoint.GetBySystemName(region);

        _s3 = new AmazonS3Client(endpoint);

        // CDN base URL (CloudFront) preferred; fallback to direct S3 HTTPS
        _baseUrl = config["FileStorage:S3BaseUrl"]?.TrimEnd('/')
            ?? $"https://{_bucket}.s3.{region}.amazonaws.com";
    }

    /// <summary>
    /// Upload a file stream to S3. Returns the S3 key (relative path) that can be stored in the DB.
    /// </summary>
    public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder)
    {
        var extension = Path.GetExtension(fileName);
        var key = $"{folder.Trim('/')}/{Guid.NewGuid():N}{extension}";

        var request = new PutObjectRequest
        {
            BucketName = _bucket,
            Key        = key,
            InputStream = fileStream,
            ContentType = GetContentType(extension),
            // Public-read for audio/media served directly to mobile; adjust as needed
            CannedACL  = S3CannedACL.PublicRead,
            AutoCloseStream = false
        };

        await _s3.PutObjectAsync(request);
        _logger.LogInformation("Uploaded to S3: {Key}", key);
        return key;
    }

    /// <summary>
    /// Delete a file from S3 by its key.
    /// </summary>
    public async Task DeleteAsync(string key)
    {
        try
        {
            await _s3.DeleteObjectAsync(_bucket, key);
            _logger.LogInformation("Deleted from S3: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete S3 object: {Key}", key);
        }
    }

    /// <summary>
    /// Download the file stream from S3. Used when the controller needs to proxy/stream the content.
    /// For audio/media, prefer GetSignedUrlAsync + redirect in the controller instead.
    /// </summary>
    public async Task<Stream?> GetFileAsync(string key)
    {
        try
        {
            var response = await _s3.GetObjectAsync(_bucket, key);
            return response.ResponseStream;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    /// <summary>
    /// Returns the public URL for a given S3 key (using CDN/CloudFront if configured).
    /// For private objects, use GetSignedUrlAsync instead.
    /// </summary>
    public string GetFileUrl(string key)
    {
        return $"{_baseUrl}/{key.TrimStart('/')}";
    }

    /// <summary>
    /// Generate a short-lived presigned URL for private S3 objects (e.g. audio streams).
    /// Mobile client follows this redirect to download directly from S3 without proxying through the API.
    /// </summary>
    public string GetSignedUrl(string key, int expiryMinutes = 60)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key        = key,
            Expires    = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Protocol   = Protocol.HTTPS,
            Verb       = HttpVerb.GET
        };

        return _s3.GetPreSignedURL(request);
    }

    /// <summary>Always true for S3 storage.</summary>
    public bool IsCloudStorage => true;

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static string GetContentType(string extension) =>
        extension.ToLowerInvariant() switch
        {
            ".mp3"  => "audio/mpeg",
            ".m4a"  => "audio/mp4",
            ".ogg"  => "audio/ogg",
            ".wav"  => "audio/wav",
            ".jpg"  => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".png"  => "image/png",
            ".webp" => "image/webp",
            ".zip"  => "application/zip",
            ".json" => "application/json",
            _       => "application/octet-stream"
        };
}
