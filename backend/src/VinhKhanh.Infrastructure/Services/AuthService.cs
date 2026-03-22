using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Authentication service - handles login, token refresh, password change, and current user retrieval.
/// </summary>
public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext db, JwtService jwt, ILogger<AuthService> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
    }

    /// <summary>
    /// Login flow:
    /// 1. Find user by email
    /// 2. Verify password hash
    /// 3. Check if user is active
    /// 4. Generate JWT access token + refresh token
    /// 5. Store refresh token in DB
    /// 6. Update last login timestamp
    /// </summary>
    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request)
    {
        // 1. Find user
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null)
        {
            _logger.LogWarning("Login failed: user not found for email {Email}", request.Email);
            return ApiResponse<LoginResponse>.Fail("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }

        // 2. Verify password
        if (!PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: wrong password for user {UserId}", user.Id);
            return ApiResponse<LoginResponse>.Fail("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }

        // 3. Check active
        if (!user.IsActive)
        {
            _logger.LogWarning("Login failed: user {UserId} is deactivated", user.Id);
            return ApiResponse<LoginResponse>.Fail("ACCOUNT_DISABLED",
                "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.");
        }

        // 4. Generate tokens
        var accessToken = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        // 5. Store refresh token
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = _jwt.GetRefreshTokenExpiry();
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} ({Email}) logged in successfully", user.Id, user.Email);

        // 6. Return response
        return ApiResponse<LoginResponse>.Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwt.GetExpirySeconds(),
            User = MapToDto(user)
        });
    }

    /// <summary>
    /// Refresh token flow:
    /// 1. Find user by refresh token
    /// 2. Check if refresh token is expired
    /// 3. Generate new access token + rotate refresh token
    /// </summary>
    public async Task<ApiResponse<LoginResponse>> RefreshTokenAsync(string refreshToken)
    {
        // 1. Find user by refresh token
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user == null)
        {
            return ApiResponse<LoginResponse>.Fail("INVALID_TOKEN", "Refresh token không hợp lệ");
        }

        // 2. Check expiry
        if (user.RefreshTokenExpiry < DateTime.UtcNow)
        {
            // Revoke the expired token
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _db.SaveChangesAsync();

            return ApiResponse<LoginResponse>.Fail("TOKEN_EXPIRED",
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // 3. Check active
        if (!user.IsActive)
        {
            return ApiResponse<LoginResponse>.Fail("ACCOUNT_DISABLED",
                "Tài khoản đã bị vô hiệu hóa.");
        }

        // 4. Rotate tokens
        var newAccessToken = _jwt.GenerateAccessToken(user);
        var newRefreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = _jwt.GetRefreshTokenExpiry();
        await _db.SaveChangesAsync();

        _logger.LogInformation("Token refreshed for user {UserId}", user.Id);

        return ApiResponse<LoginResponse>.Ok(new LoginResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresIn = _jwt.GetExpirySeconds(),
            User = MapToDto(user)
        });
    }

    /// <summary>
    /// Change password flow:
    /// 1. Find user by ID
    /// 2. Verify current password
    /// 3. Hash new password and save
    /// 4. Revoke refresh token (force re-login on other devices)
    /// </summary>
    public async Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy người dùng");

        // Verify current password
        if (!PasswordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return ApiResponse<bool>.Fail("INVALID_CREDENTIALS", "Mật khẩu hiện tại không đúng");

        // Validate new password
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return ApiResponse<bool>.Fail("VALIDATION_ERROR", "Mật khẩu mới phải có ít nhất 6 ký tự");

        // Hash and save
        user.PasswordHash = PasswordHasher.Hash(request.NewPassword);

        // Revoke refresh token → force re-login everywhere
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Password changed for user {UserId}", userId);
        return ApiResponse<bool>.Ok(true);
    }

    /// <summary>Get current user info from token claims</summary>
    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users
            .Include(u => u.VendorPOI)
                .ThenInclude(p => p!.Translations)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return ApiResponse<UserDto>.Fail("NOT_FOUND", "User not found");

        var dto = MapToDto(user);

        // If vendor, include shop name from first available translation
        if (user.VendorPOI != null)
        {
            dto.ShopName = user.VendorPOI.Translations
                .OrderBy(t => t.LanguageId)
                .Select(t => t.Name)
                .FirstOrDefault();
        }

        return ApiResponse<UserDto>.Ok(dto);
    }

    /// <summary>
    /// Tourist self-registration flow:
    /// 1. Validate fields (email format, password length, uniqueness)
    /// 2. Hash password
    /// 3. Create User with Role = Customer (0)
    /// 4. Issue JWT access + refresh tokens immediately (tourist is logged in after registration)
    /// </summary>
    public async Task<ApiResponse<LoginResponse>> RegisterAsync(RegisterRequest request)
    {
        // 1. Basic validation
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            return ApiResponse<LoginResponse>.Fail("VALIDATION_ERROR", "Invalid email address");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            return ApiResponse<LoginResponse>.Fail("VALIDATION_ERROR", "Password must be at least 8 characters");

        if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
            return ApiResponse<LoginResponse>.Fail("VALIDATION_ERROR", "Username must be at least 3 characters");

        // 2. Check uniqueness of email and username
        var emailExists = await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (emailExists)
            return ApiResponse<LoginResponse>.Fail("DUPLICATE_EMAIL", "This email is already registered");

        var usernameExists = await _db.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (usernameExists)
            return ApiResponse<LoginResponse>.Fail("DUPLICATE_USERNAME", "This username is already taken");

        // 3. Create the user entity (Role = Customer = 0)
        var user = new User
        {
            Username = request.Username.Trim(),
            Email = request.Email.Trim().ToLower(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            FullName = request.FullName ?? request.Username,
            Role = Domain.Enums.UserRole.Customer,
            PreferredLanguageId = request.PreferredLanguageId,
            IsActive = true,
            EmailConfirmed = false,  // could trigger email verification in the future
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 4. Generate tokens and issue login response immediately
        var accessToken = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = _jwt.GetRefreshTokenExpiry();
        user.LastLoginAt = DateTime.UtcNow;

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("New tourist registered: {UserId} ({Email})", user.Id, user.Email);

        return ApiResponse<LoginResponse>.Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwt.GetExpirySeconds(),
            User = MapToDto(user)
        });
    }

    // ============ Private helpers ============

    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Role = user.Role.ToString(),
        Phone = user.Phone,
        AvatarUrl = user.AvatarUrl,
        IsActive = user.IsActive,
        LastLoginAt = user.LastLoginAt
    };
}
