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
///   FileStorage:S3BucketName  — the S3 bucket name
///   FileStorage:S3Region      — AWS region, e.g. "ap-southeast-1" (or "us-east-1")
///   FileStorage:S3BaseUrl     — optional CDN/CloudFront URL prefix (falls back to S3 URL)
///   FileStorage:AwsAccessKey  — AWS access key ID (or use AWS_ACCESS_KEY_ID env var)
///   FileStorage:AwsSecretKey  — AWS secret key   (or use AWS_SECRET_ACCESS_KEY env var)
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

        var region = config["FileStorage:S3Region"] ?? "us-east-1";
        var endpoint = RegionEndpoint.GetBySystemName(region);

        // Support explicit credentials (dev/CI) or fall back to IAM role (ECS production)
        var accessKey = config["FileStorage:AwsAccessKey"] ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");
        var secretKey = config["FileStorage:AwsSecretKey"] ?? Environment.GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY");

        // AmazonS3Config with ForcePathStyle=false (virtual-hosted, required for non-us-east-1)
        // and follow-redirect disabled because we specify the correct region up front.
        var s3Config = new AmazonS3Config
        {
            RegionEndpoint = endpoint,
            // ForcePathStyle = false is the default; virtual-hosted style is required for all regions
            // UseAccelerateEndpoint = false is the default
            // Disable the 301 redirect loop by targeting the correct region directly
        };

        _s3 = (!string.IsNullOrWhiteSpace(accessKey) && !string.IsNullOrWhiteSpace(secretKey))
            ? new AmazonS3Client(accessKey, secretKey, s3Config)
            : new AmazonS3Client(s3Config); // default credential chain (IAM role)

        // CDN base URL (CloudFront) preferred; fallback to direct S3 HTTPS (virtual-hosted style)
        _baseUrl = config["FileStorage:S3BaseUrl"]?.TrimEnd('/')
            ?? $"https://{_bucket}.s3.{region}.amazonaws.com";

        _logger.LogInformation("S3FileStorageService initialized: bucket={Bucket} region={Region}", _bucket, region);
    }

    /// <summary>
    /// Upload a file stream to S3. Returns the S3 key (relative path) that can be stored in the DB.
    /// </summary>
    public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder)
    {
        // Ensure stream is at the beginning — callers may have read it or ASP.NET buffering
        // may have advanced the position, which would cause S3 to receive 0 bytes.
        if (fileStream.CanSeek)
            fileStream.Position = 0;

        var extension = Path.GetExtension(fileName);
        var key = $"{folder.Trim('/')}/{Guid.NewGuid():N}{extension}";

        var request = new PutObjectRequest
        {
            BucketName      = _bucket,
            Key             = key,
            InputStream     = fileStream,
            ContentType     = GetContentType(extension),
            // Do NOT set CannedACL — modern S3 buckets have ACLs disabled by default
            // (Object Ownership = "Bucket owner enforced"). Public access is managed
            // via a Bucket Policy (s3:GetObject Allow *) on the bucket itself.
            AutoCloseStream = false
        };

        await _s3.PutObjectAsync(request);
        _logger.LogInformation("Uploaded to S3: {Key}", key);
        return key;
    }

    /// <summary>Delete a file from S3 by its key.</summary>
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
    /// Download the file stream from S3.
    /// For audio/media, prefer GetSignedUrl + redirect in the controller instead.
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
    /// For private objects, use GetSignedUrl instead.
    /// </summary>
    public string GetFileUrl(string key)
    {
        return $"{_baseUrl}/{key.TrimStart('/')}";
    }

    /// <summary>
    /// Generate a short-lived presigned URL for private S3 objects (e.g. audio streams).
    /// Mobile client follows this redirect and downloads directly from S3 — no proxying.
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
