using System.Security.Cryptography;
using System.Text;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// BCrypt-style password hashing using PBKDF2 with SHA-256.
/// Format: {iterations}.{salt_base64}.{hash_base64}
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;            // 128 bits
    private const int HashSize = 32;            // 256 bits
    private const int Iterations = 100_000;     // OWASP recommended

    /// <summary>Hash a password → returns storable string</summary>
    public static string Hash(string password)
    {
        var salt = new byte[SaltSize];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(salt);

        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    /// <summary>Verify a password against a stored hash</summary>
    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 3) return false;

        if (!int.TryParse(parts[0], out var iterations)) return false;
        var salt = Convert.FromBase64String(parts[1]);
        var expectedHash = Convert.FromBase64String(parts[2]);

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            expectedHash.Length);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
