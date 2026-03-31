using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

public class MenuService : IMenuService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly ILogger<MenuService> _logger;

    public MenuService(AppDbContext db, IFileStorageService storage, ILogger<MenuService> logger)
    {
        _db = db;
        _storage = storage;
        _logger = logger;
    }

    public async Task<ApiResponse<List<MenuItemDto>>> GetByPOIAsync(int poiId)
    {
        var items = await _db.MenuItems
            .Include(m => m.Translations).ThenInclude(t => t.Language)
            .Where(m => m.POIId == poiId)
            .OrderBy(m => m.SortOrder)
            .AsNoTracking()
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        return ApiResponse<List<MenuItemDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<MenuItemDto>> CreateAsync(int poiId, CreateMenuItemRequest request)
    {
        if (!await _db.POIs.AnyAsync(p => p.Id == poiId))
            return ApiResponse<MenuItemDto>.Fail("NOT_FOUND", "Không tìm thấy POI");

        var maxOrder = await _db.MenuItems
            .Where(m => m.POIId == poiId)
            .MaxAsync(m => (int?)m.SortOrder) ?? 0;

        var item = new POIMenuItem
        {
            POIId = poiId,
            Price = request.Price,
            IsSignature = request.IsSignature,
            IsAvailable = request.IsAvailable,
            SortOrder = request.SortOrder > 0 ? request.SortOrder : maxOrder + 1,
            Translations = request.Translations.Select(t => new MenuItemTranslation
            {
                LanguageId = t.LanguageId,
                Name = t.Name,
                Description = t.Description
            }).ToList()
        };

        _db.MenuItems.Add(item);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Menu item created for POI {PoiId}: {Id}", poiId, item.Id);

        // Reload
        var created = await _db.MenuItems
            .Include(m => m.Translations).ThenInclude(t => t.Language)
            .FirstAsync(m => m.Id == item.Id);

        return ApiResponse<MenuItemDto>.Ok(MapToDto(created));
    }

    public async Task<ApiResponse<MenuItemDto>> UpdateAsync(int id, CreateMenuItemRequest request)
    {
        var item = await _db.MenuItems
            .Include(m => m.Translations)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (item == null)
            return ApiResponse<MenuItemDto>.Fail("NOT_FOUND", "Không tìm thấy món ăn");

        item.Price = request.Price;
        item.IsSignature = request.IsSignature;
        item.IsAvailable = request.IsAvailable;
        if (request.SortOrder > 0) item.SortOrder = request.SortOrder;

        // Replace translations
        _db.MenuItemTranslations.RemoveRange(item.Translations);
        item.Translations = request.Translations.Select(t => new MenuItemTranslation
        {
            MenuItemId = id,
            LanguageId = t.LanguageId,
            Name = t.Name,
            Description = t.Description
        }).ToList();

        await _db.SaveChangesAsync();
        _logger.LogInformation("Menu item updated: {Id}", id);

        var updated = await _db.MenuItems
            .Include(m => m.Translations).ThenInclude(t => t.Language)
            .FirstAsync(m => m.Id == id);

        return ApiResponse<MenuItemDto>.Ok(MapToDto(updated));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id)
    {
        var item = await _db.MenuItems.FindAsync(id);
        if (item == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy món ăn");

        _db.MenuItems.Remove(item);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Menu item deleted: {Id}", id);
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleAvailableAsync(int id)
    {
        var item = await _db.MenuItems.FindAsync(id);
        if (item == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy món ăn");

        item.IsAvailable = !item.IsAvailable;
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ToggleSignatureAsync(int id)
    {
        var item = await _db.MenuItems.FindAsync(id);
        if (item == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Không tìm thấy món ăn");

        item.IsSignature = !item.IsSignature;
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<MenuItemDto>> UploadImageAsync(int id, Stream file, string fileName)
    {
        var item = await _db.MenuItems
            .Include(m => m.Translations).ThenInclude(t => t.Language)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (item == null)
            return ApiResponse<MenuItemDto>.Fail("NOT_FOUND", "Không tìm thấy món ăn");

        // Delete old image if exists
        if (!string.IsNullOrEmpty(item.ImagePath))
        {
            try { await _storage.DeleteAsync(item.ImagePath); } catch { /* log but continue */ }
        }

        var filePath = await _storage.UploadAsync(file, fileName, $"menu/poi-{item.POIId}");
        item.ImagePath = filePath;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Menu item image uploaded: {Id}", id);
        return ApiResponse<MenuItemDto>.Ok(MapToDto(item));
    }

    private MenuItemDto MapToDto(POIMenuItem m) => new()
    {
        Id = m.Id,
        POIId = m.POIId,
        Price = m.Price,
        ImageUrl = string.IsNullOrEmpty(m.ImagePath) ? null : _storage.GetFileUrl(m.ImagePath),
        IsSignature = m.IsSignature,
        IsAvailable = m.IsAvailable,
        SortOrder = m.SortOrder,
        Name = m.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault() ?? "",
        Description = m.Translations.OrderBy(t => t.LanguageId).Select(t => t.Description).FirstOrDefault(),
        Translations = m.Translations.Select(t => new MenuTranslationDto
        {
            LanguageId = t.LanguageId,
            Name = t.Name,
            Description = t.Description
        }).ToList()
    };
}
