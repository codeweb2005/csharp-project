using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using VinhKhanh.Domain.Entities;
using VinhKhanh.Domain.Enums;
using VinhKhanh.Infrastructure.Data;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Seeds initial data: Languages, Admin user, Categories, and sample POIs.
/// Only runs if data doesn't already exist.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        try
        {
            // Ensure database is created
            await db.Database.EnsureCreatedAsync();

            await SeedLanguagesAsync(db, logger);
            await SeedAdminUserAsync(db, logger);
            await SeedCategoriesAsync(db, logger);
            await SeedSamplePOIsAsync(db, logger);
            await SeedVendorUserAsync(db, logger);
            await SeedSystemSettingsAsync(db, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error seeding database");
        }
    }

    private static async Task SeedLanguagesAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Languages.AnyAsync()) return;

        var languages = new List<Language>
        {
            new() { Code = "vi", Name = "Vietnamese", NativeName = "Tiếng Việt", FlagEmoji = "🇻🇳", SortOrder = 1 },
            new() { Code = "en", Name = "English", NativeName = "English", FlagEmoji = "🇬🇧", SortOrder = 2 },
            new() { Code = "zh", Name = "Chinese", NativeName = "中文", FlagEmoji = "🇨🇳", SortOrder = 3 },
            new() { Code = "ja", Name = "Japanese", NativeName = "日本語", FlagEmoji = "🇯🇵", SortOrder = 4 },
            new() { Code = "ko", Name = "Korean", NativeName = "한국어", FlagEmoji = "🇰🇷", SortOrder = 5 },
        };

        db.Languages.AddRange(languages);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} languages", languages.Count);
    }

    private static async Task SeedAdminUserAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Admin)) return;

        var admin = new User
        {
            Email = "admin@vinhkhanh.app",
            PasswordHash = PasswordHasher.Hash("Admin@123"),
            FullName = "Quản trị viên",
            Role = UserRole.Admin,
            Phone = "0283 826 5890",
            IsActive = true,
            PreferredLanguageId = 1, // Vietnamese
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded admin user: admin@vinhkhanh.app / Admin@123");
    }

    private static async Task SeedCategoriesAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Categories.AnyAsync()) return;

        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;

        var categories = new List<(string Icon, string Color, string NameVi, string NameEn)>
        {
            ("🍜", "#FF6B35", "Quán ăn", "Restaurant"),
            ("🦪", "#2EC4B6", "Hải sản & Ốc", "Seafood & Snails"),
            ("🍻", "#E71D36", "Quán nhậu", "Bar & Grill"),
            ("🧋", "#FF9F1C", "Đồ uống", "Drinks"),
            ("🍰", "#CB997E", "Tráng miệng", "Dessert"),
            ("🍲", "#6A4C93", "Lẩu", "Hot Pot"),
            ("🔥", "#F25C54", "Nướng & BBQ", "BBQ & Grill"),
        };

        for (int i = 0; i < categories.Count; i++)
        {
            var (icon, color, nameVi, nameEn) = categories[i];
            var cat = new Category
            {
                Icon = icon,
                Color = color,
                SortOrder = i + 1,
                IsActive = true,
                Translations =
                [
                    new CategoryTranslation { LanguageId = viId, Name = nameVi },
                    new CategoryTranslation { LanguageId = enId, Name = nameEn },
                ]
            };
            db.Categories.Add(cat);
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} categories", categories.Count);
    }

    private static async Task SeedSamplePOIsAsync(AppDbContext db, ILogger logger)
    {
        if (await db.POIs.AnyAsync()) return;

        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;
        var seafoodCat = await db.Categories
            .FirstAsync(c => c.Translations.Any(t => t.Name == "Hải sản & Ốc"));

        var pois = new List<POI>
        {
            new()
            {
                CategoryId = seafoodCat.Id,
                Address = "149 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0283 826 5890",
                Latitude = 10.7538, Longitude = 106.6932,
                GeofenceRadius = 25, Rating = 4.5, TotalVisits = 450,
                IsActive = true, IsFeatured = true,
                PriceRangeMin = 50000, PriceRangeMax = 200000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Ốc Đào Vĩnh Khánh",
                        ShortDescription = "Quán ốc nổi tiếng nhất phố Vĩnh Khánh, phục vụ từ năm 1995.",
                        NarrationText = "Chào mừng bạn đến với Ốc Đào, một trong những quán ốc lâu đời nhất tại phố ẩm thực Vĩnh Khánh. Được thành lập từ năm 1995, Ốc Đào nổi tiếng với các món ốc tươi sống được chế biến theo phong cách Sài Gòn đặc trưng.",
                        Highlights = "[\"Ốc hương nướng mỡ hành\",\"Sò điệp phô mai\",\"Ốc len xào dừa\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Oc Dao Vinh Khanh",
                        ShortDescription = "The most famous snail restaurant on Vinh Khanh street since 1995.",
                        NarrationText = "Welcome to Oc Dao, one of the oldest and most beloved snail restaurants on Vinh Khanh food street. Established in 1995, Oc Dao is renowned for its fresh shellfish prepared in traditional Saigon style.",
                        Highlights = "[\"Grilled Horn Snails\",\"Baked Scallops with Cheese\",\"Coconut Sauteed Snails\"]"
                    }
                ]
            },
            new()
            {
                CategoryId = seafoodCat.Id,
                Address = "145 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0901 234 567",
                Latitude = 10.7540, Longitude = 106.6930,
                GeofenceRadius = 25, Rating = 4.3, TotalVisits = 380,
                IsActive = true, IsFeatured = true,
                PriceRangeMin = 45000, PriceRangeMax = 180000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Ốc Bà Hiền",
                        ShortDescription = "Quán ốc gia truyền 3 đời, nổi tiếng với ốc len xào dừa.",
                        NarrationText = "Ốc Bà Hiền là quán ốc gia truyền ba đời tại Vĩnh Khánh. Món đặc trưng là ốc len xào dừa thơm béo và nghêu hấp sả.",
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Oc Ba Hien",
                        ShortDescription = "A three-generation family snail restaurant, famous for coconut snails.",
                        NarrationText = "Oc Ba Hien is a three-generation family snail shop at Vinh Khanh street. Their specialty is coconut sauteed snails and lemongrass steamed clams.",
                    }
                ]
            },
        };

        db.POIs.AddRange(pois);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} sample POIs", pois.Count);
    }

    private static async Task SeedVendorUserAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Vendor)) return;

        var firstPoi = await db.POIs.FirstOrDefaultAsync();
        if (firstPoi == null) return;

        var vendor = new User
        {
            Email = "vendor@vinhkhanh.app",
            PasswordHash = PasswordHasher.Hash("Vendor@123"),
            FullName = "Ốc Đào Owner",
            Role = UserRole.Vendor,
            Phone = "0901 234 567",
            IsActive = true,
            PreferredLanguageId = 2, // English
        };

        db.Users.Add(vendor);
        await db.SaveChangesAsync();

        // Link vendor to first POI
        firstPoi.VendorUserId = vendor.Id;
        await db.SaveChangesAsync();

        logger.LogInformation("Seeded vendor user: vendor@vinhkhanh.app / Vendor@123 → POI #{PoiId}", firstPoi.Id);
    }

    private static async Task SeedSystemSettingsAsync(AppDbContext db, ILogger logger)
    {
        if (await db.SystemSettings.AnyAsync()) return;

        var settings = new List<SystemSetting>
        {
            new() { Key = "geofence.defaultRadius", Value = "30", Description = "Bán kính geofence mặc định (mét)" },
            new() { Key = "geofence.gpsUpdateFrequency", Value = "5", Description = "Tần suất cập nhật GPS (giây)" },
            new() { Key = "geofence.gpsAccuracy", Value = "High", Description = "Độ chính xác GPS" },
            new() { Key = "narration.defaultCooldown", Value = "30", Description = "Cooldown thuyết minh (phút)" },
            new() { Key = "narration.defaultMode", Value = "Auto", Description = "Chế độ thuyết minh mặc định" },
            new() { Key = "narration.ttsSpeed", Value = "1.0", Description = "Tốc độ đọc TTS" },
            new() { Key = "narration.autoGenerateTTS", Value = "true", Description = "Tự động tạo TTS" },
            new() { Key = "sync.frequency", Value = "15", Description = "Tần suất đồng bộ (phút)" },
            new() { Key = "sync.batchSize", Value = "50", Description = "Batch size khi sync" },
            new() { Key = "sync.compressData", Value = "true", Description = "Nén dữ liệu khi sync" },
            new() { Key = "api.maintenanceMode", Value = "false", Description = "Chế độ bảo trì" },
        };

        db.SystemSettings.AddRange(settings);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} system settings", settings.Count);
    }
}
