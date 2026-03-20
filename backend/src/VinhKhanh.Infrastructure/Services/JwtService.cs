using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using VinhKhanh.Domain.Entities;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Handles JWT access token generation, refresh token creation, and token validation.
/// </summary>
public class JwtService
{
    private readonly IConfiguration _config;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtService(IConfiguration config)
    {
        _config = config;
        var key = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not configured");
        _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    /// <summary>Generate JWT access token with user claims</summary>
    public string GenerateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("email", user.Email),
            new("name", user.FullName),
            new("role", user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var expiryMinutes = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60");

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Generate cryptographically secure refresh token</summary>
    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>Get token expiry in seconds</summary>
    public int GetExpirySeconds()
    {
        var minutes = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60");
        return minutes * 60;
    }

    /// <summary>Get refresh token expiry</summary>
    public DateTime GetRefreshTokenExpiry()
    {
        var days = int.Parse(_config["Jwt:RefreshExpiryDays"] ?? "7");
        return DateTime.UtcNow.AddDays(days);
    }

    /// <summary>Validate and extract claims from an expired access token</summary>
    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var validation = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _config["Jwt:Issuer"],
            ValidAudience = _config["Jwt:Audience"],
            IssuerSigningKey = _signingKey,
            ValidateLifetime = false  // allow expired tokens
        };

        try
        {
            var principal = new JwtSecurityTokenHandler()
                .ValidateToken(token, validation, out var securityToken);

            if (securityToken is not JwtSecurityToken jwt ||
                !jwt.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                return null;

            return principal;
        }
        catch
        {
            return null;
        }
    }
}
