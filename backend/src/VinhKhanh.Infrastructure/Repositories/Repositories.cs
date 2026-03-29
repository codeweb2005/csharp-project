using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext _db;
    protected readonly DbSet<T> _set;

    public Repository(AppDbContext db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id) => await _set.FindAsync(id);

    public async Task<IReadOnlyList<T>> GetAllAsync() =>
        await _set.AsNoTracking().ToListAsync();

    public async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate) =>
        await _set.AsNoTracking().Where(predicate).ToListAsync();

    public async Task<T> AddAsync(T entity)
    {
        await _set.AddAsync(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(T entity)
    {
        _set.Update(entity);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(T entity)
    {
        _set.Remove(entity);
        await _db.SaveChangesAsync();
    }

    public async Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null) =>
        predicate == null ? await _set.CountAsync() : await _set.CountAsync(predicate);

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate) =>
        await _set.AnyAsync(predicate);
}

public class POIRepository : Repository<POI>, IPOIRepository
{
    public POIRepository(AppDbContext db) : base(db) { }

    public async Task<(IReadOnlyList<POI> Items, int TotalCount)> GetPagedAsync(
        int page, int size, string? search = null,
        int? categoryId = null, bool? isActive = null,
        string sortBy = "name", string order = "asc",
        List<int>? vendorPOIIds = null)
    {
        var query = _set
            .Include(p => p.Category).ThenInclude(c => c.Translations)
            .Include(p => p.Translations)
            .Include(p => p.Media.Where(m => m.IsPrimary))
            .Include(p => p.AudioNarrations)
            .AsNoTracking()
            .AsQueryable();

        // Vendor scoping
        if (vendorPOIIds != null)
            query = query.Where(p => vendorPOIIds.Contains(p.Id));

        // Filters
        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Translations.Any(t => t.Name.Contains(search))
                                  || p.Address.Contains(search));
        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);
        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();

        // Sort
        query = sortBy.ToLower() switch
        {
            "visits" => order == "desc" ? query.OrderByDescending(p => p.TotalVisits) : query.OrderBy(p => p.TotalVisits),
            "rating" => order == "desc" ? query.OrderByDescending(p => p.Rating) : query.OrderBy(p => p.Rating),
            "createdat" => order == "desc" ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
            _ => order == "desc"
                ? query.OrderByDescending(p => p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault())
                : query.OrderBy(p => p.Translations.OrderBy(t => t.LanguageId).Select(t => t.Name).FirstOrDefault())
        };

        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<POI?> GetDetailAsync(int id) =>
        await _set
            .Include(p => p.Category).ThenInclude(c => c.Translations)
            .Include(p => p.Translations).ThenInclude(t => t.Language)
            .Include(p => p.Media.OrderBy(m => m.SortOrder))
            .Include(p => p.AudioNarrations).ThenInclude(a => a.Language)
            .Include(p => p.MenuItems.OrderBy(m => m.SortOrder)).ThenInclude(m => m.Translations)
            .Include(p => p.VendorUser)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task<IReadOnlyList<POI>> GetNearbyAsync(double lat, double lng, double radiusKm)
    {
        // Haversine approximation using MySQL math
        var pois = await _set
            .Include(p => p.Translations)
            .Include(p => p.Category)
            .Where(p => p.IsActive)
            .AsNoTracking()
            .ToListAsync();

        return pois
            .Where(p => DistanceKm(lat, lng, p.Latitude, p.Longitude) <= radiusKm)
            .OrderBy(p => DistanceKm(lat, lng, p.Latitude, p.Longitude))
            .ToList();
    }

    private static double DistanceKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
