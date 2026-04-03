using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(AppDbContext db, ILogger<CategoryService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ApiResponse<List<CategoryDto>>> GetAllAsync()
    {
        var categories = await _db.Categories
            .Include(c => c.Translations).ThenInclude(t => t.Language)
            .Include(c => c.POIs)
            .OrderBy(c => c.SortOrder)
            .AsNoTracking()
            .ToListAsync();

        var dtos = categories.Select(MapToDto).ToList();
        return ApiResponse<List<CategoryDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<CategoryDto>> GetByIdAsync(int id)
    {
        var cat = await _db.Categories
            .Include(c => c.Translations).ThenInclude(t => t.Language)
            .Include(c => c.POIs)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cat == null)
            return ApiResponse<CategoryDto>.Fail("NOT_FOUND", "Không tìm thấy danh mục");

        return ApiResponse<CategoryDto>.Ok(MapToDto(cat));
    }

    public async Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryRequest request)
    {
        var cat = new Category
        {
            Icon = request.Icon,
            Color = request.Color,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            Translations = request.Translations.Select(t => new CategoryTranslation
            {
                LanguageId = t.LanguageId,
                Name = t.Name
            }).ToList()
        };

        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Category created: {Id}", cat.Id);

        // Reload with includes
        var created = await _db.Categories
            .Include(c => c.Translations).ThenInclude(t => t.Language)
            .Include(c => c.POIs)
            .FirstAsync(c => c.Id == cat.Id);

        return ApiResponse<CategoryDto>.Ok(MapToDto(created));
    }

    public async Task<ApiResponse<CategoryDto>> UpdateAsync(int id, CreateCategoryRequest request)
    {
        var cat = await _db.Categories
            .Include(c => c.Translations)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cat == null)
            return ApiResponse<CategoryDto>.Fail("NOT_FOUND", "Không tìm thấy danh mục");

        cat.Icon = request.Icon;
        cat.Color = request.Color;
        cat.SortOrder = request.SortOrder;
        cat.IsActive = request.IsActive;

        // Replace translations
        _db.CategoryTranslations.RemoveRange(cat.Translations);
        cat.Translations = request.Translations.Select(t => new CategoryTranslation
        {
            CategoryId = id,
            LanguageId = t.LanguageId,
            Name = t.Name
        }).ToList();

        await _db.SaveChangesAsync();
        _logger.LogInformation("Category updated: {Id}", id);

        var updated = await _db.Categories
            .Include(c => c.Translations).ThenInclude(t => t.Language)
            .Include(c => c.POIs)
            .FirstAsync(c => c.Id == id);

        return ApiResponse<CategoryDto>.Ok(MapToDto(updated));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var cat = await _db.Categories
            .Include(c => c.POIs)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cat == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy danh mục");

        if (cat.POIs.Any())
            return ApiResponse<bool>.Fail("VALIDATION_ERROR",
                $"Không thể xóa danh mục đang có {cat.POIs.Count} POI");

        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Category deleted: {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleActiveAsync(int id)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy danh mục");

        cat.IsActive = !cat.IsActive;
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    private static CategoryDto MapToDto(Category c) => new()
    {
        Id = c.Id,
        Icon = c.Icon,
        Color = c.Color,
        SortOrder = c.SortOrder,
        IsActive = c.IsActive,
        POICount = c.POIs?.Count ?? 0,
        Translations = c.Translations.Select(t => new CategoryTranslationDto
        {
            LanguageId = t.LanguageId,
            LanguageCode = t.Language?.Code ?? "",
            FlagEmoji = t.Language?.FlagEmoji ?? "",
            Name = t.Name
        }).ToList()
    };
}
