using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using QRCoder;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Manages QR-based anonymous tourist sessions.
///
/// Flow:
///   1. Admin generates a TourQRCode (UUID v4) → printed / displayed at tour entry.
///   2. Tourist scans QR → app sends POST /tourist/session with { qrToken, deviceId, languageId }.
///   3. Service validates QR (active, not expired, quota not exceeded).
///   4. Creates / updates TouristSession row.
///   5. Returns a 24-hour JWT with role = Tourist and sessionId claim.
///
/// No email, no password, no full account creation required.
/// </summary>
public class TouristSessionService(
    AppDbContext db,
    IConfiguration config,
    ILogger<TouristSessionService> logger) : ITouristSessionService
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    private string GenerateTouristJwt(TouristSession session)
    {
        var key = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not configured");
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));

        var claims = new[]
        {
            new Claim("sub",       session.Id.ToString()),
            new Claim("role",      "Tourist"),
            new Claim("sessionId", session.SessionToken),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64)
        };

        var expiry = session.ExpiresAt;
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ── ITouristSessionService ───────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<ApiResponse<TouristTokenResponse>> StartSessionAsync(StartSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.QRToken))
            return ApiResponse<TouristTokenResponse>.Fail("VALIDATION_ERROR", "QR token is required.");

        var qrToken = request.QRToken.Trim();

        // 1. Validate QR code
        var qr = await db.TourQRCodes
            .FirstOrDefaultAsync(q => q.QRToken == qrToken && q.IsActive);

        if (qr == null)
            return ApiResponse<TouristTokenResponse>.Fail("INVALID_QR", "QR code is invalid or has been deactivated.");

        if (qr.ExpiresAt.HasValue && qr.ExpiresAt.Value < DateTime.UtcNow)
            return ApiResponse<TouristTokenResponse>.Fail("QR_EXPIRED", "This QR code has expired.");

        if (qr.MaxUses.HasValue && qr.UseCount >= qr.MaxUses.Value)
            return ApiResponse<TouristTokenResponse>.Fail("QR_QUOTA", "This QR code has reached its maximum usage limit.");

        // 2. Create or reuse session (same device + same QR within 24h = reuse)
        var existingSession = await db.TouristSessions
            .FirstOrDefaultAsync(s =>
                s.SessionToken == qrToken &&
                s.DeviceId == request.DeviceId &&
                s.IsActive &&
                s.ExpiresAt > DateTime.UtcNow);

        TouristSession session;
        if (existingSession != null)
        {
            // Reuse active session — refresh LastSeenAt only
            existingSession.LastSeenAt = DateTime.UtcNow;
            existingSession.LanguageId = request.LanguageId ?? existingSession.LanguageId;
            session = existingSession;
            logger.LogDebug("Reusing existing session {Token} for device {Device}", qrToken[..8], request.DeviceId);
        }
        else
        {
            // Create new session (UUID v4 = QR token — ties session to this QR)
            session = new TouristSession
            {
                SessionToken = qrToken,
                DeviceId     = request.DeviceId,
                LanguageId   = request.LanguageId,
                StartedAt    = DateTime.UtcNow,
                ExpiresAt    = DateTime.UtcNow.AddHours(24),
                LastSeenAt   = DateTime.UtcNow,
                IsActive     = true
            };
            db.TouristSessions.Add(session);

            // Increment QR use count
            qr.UseCount++;
            logger.LogInformation("New tourist session started via QR {QRId}, device {Device}", qr.Id, request.DeviceId);
        }

        await db.SaveChangesAsync();

        // 3. Issue JWT
        var jwt = GenerateTouristJwt(session);

        return ApiResponse<TouristTokenResponse>.Ok(new TouristTokenResponse
        {
            AccessToken = jwt,
            SessionId   = session.SessionToken,
            ExpiresAt   = new DateTimeOffset(session.ExpiresAt).ToUnixTimeSeconds(),
            LanguageId  = session.LanguageId
        });
    }

    /// <inheritdoc/>
    public async Task<ApiResponse<TouristSessionDto>> GetSessionAsync(string sessionId)
    {
        var session = await db.TouristSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessionToken == sessionId);

        if (session == null)
            return ApiResponse<TouristSessionDto>.Fail("NOT_FOUND", "Session not found.");

        return ApiResponse<TouristSessionDto>.Ok(new TouristSessionDto
        {
            SessionId  = session.SessionToken,
            StartedAt  = session.StartedAt,
            ExpiresAt  = session.ExpiresAt,
            LanguageId = session.LanguageId,
            IsActive   = session.IsActive && session.ExpiresAt > DateTime.UtcNow
        });
    }

    /// <inheritdoc/>
    public async Task<ApiResponse<bool>> EndSessionAsync(string sessionId)
    {
        var session = await db.TouristSessions
            .FirstOrDefaultAsync(s => s.SessionToken == sessionId);

        if (session == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Session not found.");

        session.IsActive  = false;
        session.LastSeenAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        logger.LogInformation("Tourist session {Token} ended.", sessionId[..8]);
        return ApiResponse<bool>.Ok(true);
    }

    // ── Admin: QR Management ─────────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<ApiResponse<List<TourQRCodeDto>>> GetQRCodesAsync()
    {
        var codes = await db.TourQRCodes
            .AsNoTracking()
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new TourQRCodeDto
            {
                Id        = q.Id,
                QRToken   = q.QRToken,
                Label     = q.Label,
                MaxUses   = q.MaxUses,
                UseCount  = q.UseCount,
                IsActive  = q.IsActive,
                ExpiresAt = q.ExpiresAt,
                CreatedAt = q.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<List<TourQRCodeDto>>.Ok(codes);
    }

    /// <inheritdoc/>
    public async Task<ApiResponse<TourQRCodeDto>> CreateQRCode(CreateQRCodeRequest request)
    {
        var qrToken = Guid.NewGuid().ToString("N"); // 32-char hex, no dashes

        var qr = new TourQRCode
        {
            QRToken           = qrToken,
            Label             = request.Label,
            MaxUses           = request.MaxUses,
            ExpiresAt         = request.ExpiresAt,
            IsActive          = true,
            UseCount          = 0
        };

        db.TourQRCodes.Add(qr);
        await db.SaveChangesAsync();

        logger.LogInformation("Admin created QR code {Id} (label: {Label})", qr.Id, qr.Label);

        return ApiResponse<TourQRCodeDto>.Ok(new TourQRCodeDto
        {
            Id        = qr.Id,
            QRToken   = qr.QRToken,
            Label     = qr.Label,
            MaxUses   = qr.MaxUses,
            UseCount  = 0,
            IsActive  = true,
            ExpiresAt = qr.ExpiresAt,
            CreatedAt = qr.CreatedAt
        });
    }

    /// <inheritdoc/>
    public async Task<byte[]?> GetQRPngAsync(string qrToken, int pixels = 512)
    {
        var exists = await db.TourQRCodes.AnyAsync(q => q.QRToken == qrToken && q.IsActive);
        if (!exists) return null;

        pixels = Math.Clamp(pixels, 128, 1024);

        try
        {
            // QR encodes a deep-link URL: vinhkhanh://tour?qr={token}
            // The mobile app intercepts this scheme and calls StartSessionAsync.
            var qrContent = $"vinhkhanh://tour?qr={qrToken}";

            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.M);
            var pngQr = new PngByteQRCode(qrData);
            return pngQr.GetGraphic(pixels);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate PNG for QR token {Token}", qrToken[..8]);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<ApiResponse<bool>> DeactivateQRCodeAsync(int id)
    {
        var qr = await db.TourQRCodes.FindAsync(id);
        if (qr == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "QR code not found.");

        qr.IsActive = false;
        await db.SaveChangesAsync();

        logger.LogInformation("QR code {Id} deactivated.", id);
        return ApiResponse<bool>.Ok(true);
    }
}
