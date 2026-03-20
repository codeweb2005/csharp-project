using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly ILogger<UserService> _logger;

    public UserService(AppDbContext db, ILogger<UserService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<UserDto>>> GetListAsync(
        int page, int size, string? search, string? role)
    {
        var query = _db.Users
            .Include(u => u.VendorPOI).ThenInclude(p => p!.Translations)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search));

        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var parsedRole))
            query = query.Where(u => u.Role == parsedRole);

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();

        var dtos = users.Select(MapToDto).ToList();

        return ApiResponse<PagedResult<UserDto>>.Ok(new PagedResult<UserDto>
        {
            Items = dtos,
            Pagination = new PaginationInfo { Page = page, Size = size, TotalItems = totalCount }
        });
    }

    public async Task<ApiResponse<UserDto>> GetByIdAsync(int id)
    {
        var user = await _db.Users
            .Include(u => u.VendorPOI).ThenInclude(p => p!.Translations)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return ApiResponse<UserDto>.Fail("NOT_FOUND", "Không tìm thấy người dùng");

        return ApiResponse<UserDto>.Ok(MapToDto(user));
    }

    public async Task<ApiResponse<UserDto>> CreateAsync(CreateUserRequest request)
    {
        // Check duplicate email
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
            return ApiResponse<UserDto>.Fail("VALIDATION_ERROR", "Email đã tồn tại trong hệ thống");

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
            return ApiResponse<UserDto>.Fail("VALIDATION_ERROR", "Role không hợp lệ");

        var user = new User
        {
            Email = request.Email,
            FullName = request.FullName,
            PasswordHash = PasswordHasher.Hash(request.Password),
            Role = role,
            Phone = request.Phone,
            IsActive = true,
            PreferredLanguageId = 1 // default Vietnamese
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Link vendor to POI if applicable
        if (role == UserRole.Vendor && request.POIId.HasValue)
        {
            var poi = await _db.POIs.FindAsync(request.POIId.Value);
            if (poi != null)
            {
                poi.VendorUserId = user.Id;
                await _db.SaveChangesAsync();
            }
        }

        _logger.LogInformation("User created: {Id} ({Email})", user.Id, user.Email);
        return ApiResponse<UserDto>.Ok(MapToDto(user));
    }

    public async Task<ApiResponse<UserDto>> UpdateAsync(int id, UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return ApiResponse<UserDto>.Fail("NOT_FOUND", "Không tìm thấy người dùng");

        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.PreferredLanguageId = request.PreferredLanguageId;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User updated: {Id}", id);
        return ApiResponse<UserDto>.Ok(MapToDto(user));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy người dùng");

        if (user.Role == UserRole.Admin)
            return ApiResponse<bool>.Fail("FORBIDDEN", "Không thể xóa tài khoản Admin");

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        _logger.LogInformation("User deleted: {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleActiveAsync(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy người dùng");

        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ResetPasswordAsync(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy người dùng");

        // Reset to default password
        user.PasswordHash = PasswordHasher.Hash("Reset@123");
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset for user {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    private static UserDto MapToDto(User u) => new()
    {
        Id = u.Id,
        Email = u.Email,
        FullName = u.FullName,
        Role = u.Role.ToString(),
        Phone = u.Phone,
        AvatarUrl = u.AvatarUrl,
        IsActive = u.IsActive,
        LastLoginAt = u.LastLoginAt,
        ShopName = u.VendorPOI?.Translations
            .OrderBy(t => t.LanguageId)
            .Select(t => t.Name)
            .FirstOrDefault()
    };
}
