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

            // Fix any schema mismatches introduced since DB was first created
            await FixSchemaAsync(db, logger);

            await SeedLanguagesAsync(db, logger);
            await SeedAdminUserAsync(db, logger);
            await SeedCategoriesAsync(db, logger);
            await SeedSamplePOIsAsync(db, logger);
            await SeedVendorUserAsync(db, logger);
            await SeedSystemSettingsAsync(db, logger);

            // ── Extended data for realistic demo ──
            await SeedExtraPOIsAsync(db, logger);
            await SeedMenuItemsAsync(db, logger);
            await SeedVisitHistoryAsync(db, logger);   // anonymous visits only — no user accounts needed
            await SeedAudioNarrationsAsync(db, logger);
            await SeedOfflinePackagesAsync(db, logger);
            await SeedQRCodesAsync(db, logger);
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
            PasswordHash = PasswordHasher.Hash("Admin@123456"),
            FullName = "Quản trị viên",
            Role = UserRole.Admin,
            Phone = "0283 826 5890",
            IsActive = true,
            PreferredLanguageId = 1, // Vietnamese
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded admin user: admin@vinhkhanh.app / Admin@123456");
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

        var seafoodCat = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Hải sản & Ốc"));
        var restaurantCat = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Quán ăn"));
        var barCat = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Quán nhậu"));
        var drinksCat = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Đồ uống"));
        var dessertCat = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Tráng miệng"));

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
                        FullDescription = "Ốc Đào Vĩnh Khánh là một trong những quán ốc lâu đời và nổi tiếng nhất tại phố ẩm thực Vĩnh Khánh, Quận 4. Được thành lập từ năm 1995, quán phục vụ đa dạng các loại ốc tươi sống theo phong cách Sài Gòn đặc trưng. Thực đơn phong phú với hơn 30 món từ ốc, sò, hàu và các loại cua ghẹ.",
                        NarrationText = "Chào mừng bạn đến với Ốc Đào, một trong những quán ốc lâu đời nhất tại phố ẩm thực Vĩnh Khánh. Được thành lập từ năm 1995, Ốc Đào nổi tiếng với các món ốc tươi sống được chế biến theo phong cách Sài Gòn đặc trưng.",
                        Highlights = "[\"Ốc hương nướng mỡ hành\",\"Sò điệp phô mai\",\"Ốc len xào dừa\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Oc Dao Vinh Khanh",
                        ShortDescription = "The most famous snail restaurant on Vinh Khanh street since 1995.",
                        FullDescription = "Oc Dao Vinh Khanh is one of the oldest and most renowned snail restaurants on Vinh Khanh food street, District 4. Established in 1995, the restaurant serves a wide variety of fresh shellfish prepared in authentic Saigon style. The menu features over 30 dishes made from snails, clams, oysters, and crabs.",
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
                        FullDescription = "Ốc Bà Hiền là quán ốc gia truyền ba đời tại Vĩnh Khánh. Được truyền lại từ bà ngoại sang mẹ và đến nay là chủ nhân thế hệ thứ ba, quán duy trì hương vị truyền thống với các món ốc len xào dừa béo thơm, nghêu hấp sả và ốc hương nướng.",
                        NarrationText = "Ốc Bà Hiền là quán ốc gia truyền ba đời tại Vĩnh Khánh. Món đặc trưng là ốc len xào dừa thơm béo và nghêu hấp sả.",
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Oc Ba Hien",
                        ShortDescription = "A three-generation family snail restaurant, famous for coconut snails.",
                        FullDescription = "Oc Ba Hien is a three-generation family snail shop at Vinh Khanh street. Passed down from grandmother to mother to the current third-generation owner, the restaurant maintains its traditional flavors featuring coconut sauteed snails, lemongrass steamed clams, and grilled horn snails.",
                        NarrationText = "Oc Ba Hien is a three-generation family snail shop at Vinh Khanh street. Their specialty is coconut sauteed snails and lemongrass steamed clams.",
                    }
                ]
            },
            new()
            {
                CategoryId = barCat.Id,
                Address = "152 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0912 345 678",
                Latitude = 10.7535, Longitude = 106.6935,
                GeofenceRadius = 30, Rating = 4.1, TotalVisits = 290,
                IsActive = true, IsFeatured = false,
                PriceRangeMin = 60000, PriceRangeMax = 300000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Nhậu Vĩnh Khánh Beer Club",
                        ShortDescription = "Quán nhậu sôi động với bia hơi và đồ nhắm tươi mỗi tối.",
                        FullDescription = "Vĩnh Khánh Beer Club là điểm hẹn quen thuộc của giới trẻ Sài Gòn mỗi buổi tối. Quán phục vụ bia hơi Sài Gòn tươi, các món nhắm phong phú từ hải sản đến thịt nướng. Không khí sôi động, âm nhạc live vào cuối tuần.",
                        NarrationText = "Vĩnh Khánh Beer Club – điểm đến lý tưởng cho những buổi tối vui vẻ cùng bạn bè tại phố Vĩnh Khánh với bia hơi và hải sản tươi ngon.",
                        Highlights = "[\"Bia hơi Sài Gòn\",\"Cua rang me\",\"Nhạc sống cuối tuần\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Vinh Khanh Beer Club",
                        ShortDescription = "A lively bar with fresh draft beer and seafood snacks every evening.",
                        FullDescription = "Vinh Khanh Beer Club is a popular hangout for Saigon's young crowd every evening. The bar serves fresh Saigon draft beer alongside a rich menu of seafood and grilled meats. Lively atmosphere with live music on weekends.",
                        NarrationText = "Vinh Khanh Beer Club – the ideal spot for fun evenings with friends on Vinh Khanh street, featuring fresh draft beer and delicious seafood.",
                        Highlights = "[\"Fresh Saigon Draft Beer\",\"Tamarind Crab\",\"Live Music on Weekends\"]"
                    }
                ]
            },
            new()
            {
                CategoryId = drinksCat.Id,
                Address = "138 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0923 456 789",
                Latitude = 10.7542, Longitude = 106.6928,
                GeofenceRadius = 20, Rating = 4.4, TotalVisits = 210,
                IsActive = true, IsFeatured = false,
                PriceRangeMin = 25000, PriceRangeMax = 80000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Chè & Nước Mía Vĩnh Khánh",
                        ShortDescription = "Điểm giải khát với chè truyền thống và nước mía tươi ép.",
                        FullDescription = "Chè & Nước Mía Vĩnh Khánh là điểm dừng chân yêu thích của khách du lịch và người dân địa phương sau khi thưởng thức các món ốc. Quán phục vụ hơn 15 loại chè truyền thống Nam Bộ và nước mía ép tươi mỗi ngày.",
                        NarrationText = "Sau bữa ốc, hãy ghé Chè & Nước Mía Vĩnh Khánh để thưởng thức chè ba màu, chè đậu xanh và nước mía tươi mát.",
                        Highlights = "[\"Chè ba màu\",\"Nước mía ép tươi\",\"Bánh flan cafe\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Vinh Khanh Dessert Drinks",
                        ShortDescription = "A refreshment stop with traditional Vietnamese sweet soups and fresh sugarcane juice.",
                        FullDescription = "Vinh Khanh Dessert Drinks is a favorite stop for tourists and locals after enjoying snails. The shop serves over 15 types of traditional Southern Vietnamese sweet soups and freshly pressed sugarcane juice daily.",
                        NarrationText = "After your snail feast, stop by Vinh Khanh Dessert Drinks for tri-color sweet soup, mung bean pudding, and refreshing fresh sugarcane juice.",
                        Highlights = "[\"Tri-color Sweet Soup\",\"Fresh Sugarcane Juice\",\"Coffee Flan\"]"
                    }
                ]
            },
            new()
            {
                CategoryId = restaurantCat.Id,
                Address = "160 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0934 567 890",
                Latitude = 10.7533, Longitude = 106.6938,
                GeofenceRadius = 30, Rating = 4.6, TotalVisits = 520,
                IsActive = true, IsFeatured = true,
                PriceRangeMin = 80000, PriceRangeMax = 350000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Cơm Tấm Sài Gòn Số 1",
                        ShortDescription = "Cơm tấm sườn bì chả nổi tiếng nhất khu vực Quận 4.",
                        FullDescription = "Cơm Tấm Sài Gòn Số 1 đã trở thành địa chỉ quen thuộc của người dân Quận 4 với hơn 20 năm hoạt động. Sườn nướng than hoa, bì sợi giòn và chả trứng hấp là bộ ba làm nên tên tuổi quán. Phục vụ cả ngày từ 6 giờ sáng đến 10 giờ tối.",
                        NarrationText = "Cơm Tấm Sài Gòn Số 1 – hơn 20 năm phục vụ cơm tấm sườn bì chả chính hiệu Sài Gòn tại Vĩnh Khánh.",
                        Highlights = "[\"Sườn nướng than hoa\",\"Bì sợi truyền thống\",\"Nước mắm chua ngọt\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Saigon Broken Rice No.1",
                        ShortDescription = "The most famous broken rice restaurant in District 4.",
                        FullDescription = "Saigon Broken Rice No.1 has been a familiar address for District 4 residents for over 20 years. Charcoal-grilled pork ribs, crispy shredded pork skin, and steamed egg pork roll are the trio that made the restaurant famous. Open all day from 6am to 10pm.",
                        NarrationText = "Saigon Broken Rice No.1 – over 20 years serving authentic Saigon broken rice with grilled pork ribs at Vinh Khanh.",
                        Highlights = "[\"Charcoal Grilled Pork Ribs\",\"Traditional Shredded Pork Skin\",\"Sweet Fish Sauce\"]"
                    }
                ]
            },
            new()
            {
                CategoryId = dessertCat.Id,
                Address = "141 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0945 678 901",
                Latitude = 10.7541, Longitude = 106.6929,
                GeofenceRadius = 20, Rating = 4.2, TotalVisits = 165,
                IsActive = true, IsFeatured = false,
                PriceRangeMin = 20000, PriceRangeMax = 60000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Bánh Tráng Trộn Vĩnh Khánh",
                        ShortDescription = "Đặc sản bánh tráng trộn Sài Gòn kiểu mới với hơn 20 topping.",
                        FullDescription = "Bánh Tráng Trộn Vĩnh Khánh chuyên phục vụ món ăn vặt đặc sản của giới trẻ Sài Gòn. Với hơn 20 topping đa dạng từ tôm khô, xoài, rau răm đến trứng cút và sa tế, mỗi phần bánh tráng trộn là một trải nghiệm ẩm thực độc đáo.",
                        NarrationText = "Bánh Tráng Trộn Vĩnh Khánh – thiên đường ăn vặt với hơn 20 topping độc đáo cho tô bánh tráng trộn đúng điệu Sài Gòn.",
                        Highlights = "[\"Tôm khô giòn\",\"Xoài sợi chua\",\"Trứng cút chiên\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Vinh Khanh Rice Paper Salad",
                        ShortDescription = "Saigon-style rice paper salad with over 20 toppings.",
                        FullDescription = "Vinh Khanh Rice Paper Salad specializes in this popular Saigon street snack. With over 20 diverse toppings ranging from dried shrimp, mango, and Vietnamese coriander to quail eggs and chili sauce, each serving is a unique culinary experience.",
                        NarrationText = "Vinh Khanh Rice Paper Salad – a street food paradise with over 20 unique toppings for the perfect Saigon-style mixed rice paper salad.",
                        Highlights = "[\"Crispy Dried Shrimp\",\"Sour Shredded Mango\",\"Fried Quail Eggs\"]"
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

    // ═══════════════════════════════════════════════════════════════════
    // EXTENDED SEED METHODS
    // ═══════════════════════════════════════════════════════════════════

    private static async Task SeedExtraPOIsAsync(AppDbContext db, ILogger logger)
    {
        // Only run if we have <= 6 POIs (already seeded the first batch)
        if (await db.POIs.CountAsync() >= 8) return;

        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;
        var hotpotCat = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Lẩu"));
        var bbqCat    = await db.Categories.FirstAsync(c => c.Translations.Any(t => t.Name == "Nướng & BBQ"));

        var extra = new List<POI>
        {
            new()
            {
                CategoryId = hotpotCat.Id,
                Address = "156 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0956 789 012",
                Latitude = 10.7534, Longitude = 106.6936,
                GeofenceRadius = 30, Rating = 4.4, TotalVisits = 310,
                IsActive = true, IsFeatured = false,
                PriceRangeMin = 120000, PriceRangeMax = 450000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "Lẩu Thái Vĩnh Khánh",
                        ShortDescription = "Lẩu Thái chua cay đặc sắc, hải sản tươi sống, phục vụ đến 11 giờ đêm.",
                        FullDescription = "Lẩu Thái Vĩnh Khánh nổi tiếng với nồi lẩu Thái chua cay đậm đà. Hải sản tươi sống từ chợ Vĩnh Khánh, nước lẩu nấu từ xương hầm 4 tiếng. Phục vụ từ 4PM đến 11PM, phù hợp ăn nhóm từ 2-10 người.",
                        NarrationText = "Lẩu Thái Vĩnh Khánh – điểm dừng chân lý tưởng cho những buổi tối sum họp bạn bè. Nồi lẩu Thái chua cay với hải sản tươi ngon sẽ khiến bạn nhớ mãi.",
                        Highlights = "[\"Lẩu Thái hải sản\",\"Tôm hùm tươi\",\"Nước lẩu hầm xương\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Vinh Khanh Thai Hot Pot",
                        ShortDescription = "Authentic Thai hot pot with fresh seafood, open until 11PM.",
                        FullDescription = "Vinh Khanh Thai Hot Pot is renowned for its rich, spicy, and sour Thai-style hot pot broth. Fresh seafood sourced from Vinh Khanh market daily, broth slow-simmered from bones for 4 hours. Serves 2-10 people, open 4PM to 11PM.",
                        NarrationText = "Vinh Khanh Thai Hot Pot – the ideal gathering spot for evening get-togethers. The spicy and sour Thai hot pot with fresh seafood will leave a lasting impression.",
                        Highlights = "[\"Thai Seafood Hot Pot\",\"Fresh Lobster\",\"Slow-simmered Bone Broth\"]"
                    }
                ]
            },
            new()
            {
                CategoryId = bbqCat.Id,
                Address = "163 Vĩnh Khánh, Phường 10, Quận 4, TP.HCM",
                Phone = "0967 890 123",
                Latitude = 10.7532, Longitude = 106.6940,
                GeofenceRadius = 30, Rating = 4.5, TotalVisits = 420,
                IsActive = true, IsFeatured = true,
                PriceRangeMin = 80000, PriceRangeMax = 500000,
                Translations =
                [
                    new POITranslation
                    {
                        LanguageId = viId, Name = "BBQ Vĩnh Khánh —炭焼き",
                        ShortDescription = "Nướng than hoa kiểu Nhật-Hàn kết hợp, thịt bò wagyu và hải sản.",
                        FullDescription = "BBQ Vĩnh Khánh mang phong cách nướng than hoa kết hợp giữa Yakiniku Nhật Bản và BBQ Hàn Quốc. Menu bao gồm thịt bò Wagyu nhập khẩu, sườn bò, mực và tôm tươi. Khói than hoa đặc trưng tạo nên hương vị không thể nhầm lẫn.",
                        NarrationText = "BBQ Vĩnh Khánh – trải nghiệm nướng than hoa theo phong cách Nhật-Hàn với thịt bò Wagyu và hải sản tươi ngon giữa lòng phố ẩm thực Vĩnh Khánh.",
                        Highlights = "[\"Thịt bò Wagyu\",\"Mực nướng than hoa\",\"Sốt tare Nhật Bản\"]"
                    },
                    new POITranslation
                    {
                        LanguageId = enId, Name = "Vinh Khanh BBQ Charcoal Grill",
                        ShortDescription = "Japanese-Korean fusion charcoal BBQ with Wagyu beef and fresh seafood.",
                        FullDescription = "Vinh Khanh BBQ combines Japanese Yakiniku and Korean BBQ grilling styles. The menu features imported Wagyu beef, beef ribs, fresh squid, and shrimp. The distinctive charcoal smoke creates an unforgettable flavor.",
                        NarrationText = "Vinh Khanh BBQ – experience Japanese-Korean style charcoal grilling with Wagyu beef and fresh seafood in the heart of Vinh Khanh food street.",
                        Highlights = "[\"Wagyu Beef\",\"Charcoal Grilled Squid\",\"Japanese Tare Sauce\"]"
                    }
                ]
            }
        };

        db.POIs.AddRange(extra);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} extra POIs", extra.Count);
    }

    private static async Task SeedMenuItemsAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Set<POIMenuItem>().AnyAsync()) return;

        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;
        var allPois = await db.POIs.ToListAsync();

        var menuData = new List<(string poiName, List<(string vi, string en, decimal price, bool signature)> items)>
        {
            ("Ốc Đào Vĩnh Khánh", [
                ("Ốc hương nướng mỡ hành", "Grilled Horn Snails with Scallion Oil", 85000, true),
                ("Sò điệp nướng phô mai", "Baked Scallops with Cheese", 120000, true),
                ("Ốc len xào dừa", "Coconut Sautéed Mud Creeper Snails", 75000, false),
                ("Nghêu hấp sả gừng", "Lemongrass-Ginger Steamed Clams", 65000, false),
            ]),
            ("Ốc Bà Hiền", [
                ("Ốc len xào dừa đặc biệt", "Special Coconut Snails", 80000, true),
                ("Ốc hương hấp bia", "Beer-Steamed Horn Snails", 90000, false),
                ("Sò huyết xào me", "Tamarind Blood Cockles", 70000, true),
            ]),
            ("Cơm Tấm Sài Gòn Số 1", [
                ("Cơm tấm sườn bì chả", "Broken Rice with Pork Ribs, Skin & Roll", 75000, true),
                ("Cơm tấm sườn nướng", "Broken Rice with Grilled Pork Rib", 65000, false),
                ("Bì cuốn chả giò", "Pork Skin Spring Rolls", 45000, false),
            ]),
            ("Nhậu Vĩnh Khánh Beer Club", [
                ("Cua rang me", "Tamarind Crab", 280000, true),
                ("Bạch tuộc nướng", "Grilled Octopus", 150000, true),
                ("Bia Sài Gòn đỏ (1 lon)", "Saigon Red Beer (1 can)", 20000, false),
            ]),
            ("Lẩu Thái Vĩnh Khánh", [
                ("Lẩu Thái hải sản (2 người)", "Thai Seafood Hot Pot (2 pax)", 280000, true),
                ("Tôm hùm tươi (500g)", "Fresh Lobster (500g)", 450000, true),
                ("Mực lá tươi", "Fresh Cuttlefish", 120000, false),
            ]),
            ("BBQ Vĩnh Khánh —炭焼き", [
                ("Thịt bò Wagyu A5 (100g)", "Wagyu A5 Beef (100g)", 380000, true),
                ("Set hải sản BBQ", "Seafood BBQ Set", 250000, true),
                ("Mực nướng than hoa", "Charcoal Grilled Squid", 180000, false),
            ]),
        };

        int sortOrder = 0;
        foreach (var (poiName, items) in menuData)
        {
            var poi = allPois.FirstOrDefault(p => p.Id > 0); // placeholder lookup
            // Find matching POI by name via translations
            var poiTranslation = await db.Set<POITranslation>()
                .FirstOrDefaultAsync(t => t.Name == poiName && t.LanguageId == viId);
            if (poiTranslation == null) continue;

            foreach (var (vi, en, price, signature) in items)
            {
                var item = new POIMenuItem
                {
                    POIId = poiTranslation.POIId,
                    Price = price,
                    IsSignature = signature,
                    IsAvailable = true,
                    SortOrder = sortOrder++,
                    Translations =
                    [
                        new MenuItemTranslation { LanguageId = viId, Name = vi },
                        new MenuItemTranslation { LanguageId = enId, Name = en },
                    ]
                };
                db.Set<POIMenuItem>().Add(item);
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded menu items for all POIs");
    }

    // SeedTouristUsersAsync intentionally removed:
    // Tourists are fully anonymous — QR scan creates a TouristSession, no account required.

    private static async Task SeedVisitHistoryAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Set<VisitHistory>().AnyAsync()) return;

        var allPois = await db.POIs.Select(p => new { p.Id, p.Latitude, p.Longitude }).ToListAsync();
        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;
        var rnd = new Random(42);

        var visits = new List<VisitHistory>();
        var triggerTypes = new[] { TriggerType.GeofenceEnter, TriggerType.Manual, TriggerType.List };
        var langIds = new[] { viId, enId, viId, viId }; // 75% Vietnamese visitors

        // Generate 30 days of anonymous visit history (UserId always null)
        for (int day = 29; day >= 0; day--)
        {
            var date = DateTime.UtcNow.Date.AddDays(-day).AddHours(7);
            var baseVisits = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? 18 : 10;
            var dayVisits = baseVisits + rnd.Next(-3, 8);

            for (int i = 0; i < dayVisits; i++)
            {
                var poi = allPois[rnd.Next(allPois.Count)];
                var langId = langIds[rnd.Next(langIds.Length)];
                var narrated = rnd.Next(100) > 25;

                visits.Add(new VisitHistory
                {
                    POIId = poi.Id,
                    UserId = null,   // always anonymous — no account required
                    LanguageId = langId,
                    TriggerType = triggerTypes[rnd.Next(triggerTypes.Length)],
                    NarrationPlayed = narrated,
                    ListenDuration = narrated ? rnd.Next(15, 120) : 0,
                    VisitedAt = date.AddHours(rnd.Next(10, 22)).AddMinutes(rnd.Next(60)),
                    Latitude = poi.Latitude + (rnd.NextDouble() - 0.5) * 0.0002,
                    Longitude = poi.Longitude + (rnd.NextDouble() - 0.5) * 0.0002,
                    DeviceId = $"device-{rnd.Next(1000, 9999):D4}",
                });
            }
        }

        db.Set<VisitHistory>().AddRange(visits);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} visit history records (30 days)", visits.Count);
    }

    private static async Task SeedAudioNarrationsAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Set<AudioNarration>().AnyAsync()) return;

        var allPois = await db.POIs.ToListAsync();
        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;

        var narrations = new List<AudioNarration>();

        foreach (var poi in allPois)
        {
            // Vietnamese TTS narration (default)
            narrations.Add(new AudioNarration
            {
                POIId = poi.Id,
                LanguageId = viId,
                FilePath = $"audio/poi-{poi.Id}-vi.mp3", // placeholder path
                VoiceType = VoiceType.TTS,
                VoiceName = "vi-VN-HoaiMyNeural",
                Duration = 35 + (poi.Id * 7 % 25),  // 35–60 seconds
                FileSize = 250000 + (poi.Id * 12000),
                IsDefault = true,
                IsActive = true,
            });

            // English TTS narration
            narrations.Add(new AudioNarration
            {
                POIId = poi.Id,
                LanguageId = enId,
                FilePath = $"audio/poi-{poi.Id}-en.mp3",
                VoiceType = VoiceType.TTS,
                VoiceName = "en-US-JennyNeural",
                Duration = 30 + (poi.Id * 5 % 20),  // 30–50 seconds
                FileSize = 200000 + (poi.Id * 10000),
                IsDefault = true,
                IsActive = true,
            });
        }

        db.Set<AudioNarration>().AddRange(narrations);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} audio narrations", narrations.Count);
    }

    private static async Task SeedOfflinePackagesAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Set<OfflinePackage>().AnyAsync()) return;

        var viId = (await db.Languages.FirstAsync(l => l.Code == "vi")).Id;
        var enId = (await db.Languages.FirstAsync(l => l.Code == "en")).Id;
        var poiCount = await db.POIs.CountAsync();

        var packages = new List<OfflinePackage>
        {
            new()
            {
                LanguageId = viId,
                Name = "Gói Tiếng Việt — Vĩnh Khánh Food Tour",
                Version = "1.2.0",
                Status = PackageStatus.Active,
                Progress = 100,
                CurrentStep = "Hoàn thành",
                FilePath = "packages/vinhkhanh-vi-v1.2.0.zip",
                FileSize = 8_400_000,
                Checksum = "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
                DownloadCount = 234,
                POICount = poiCount,
                AudioCount = poiCount,
                ImageCount = poiCount * 3,
            },
            new()
            {
                LanguageId = enId,
                Name = "English Package — Vinh Khanh Food Tour",
                Version = "1.2.0",
                Status = PackageStatus.Active,
                Progress = 100,
                CurrentStep = "Complete",
                FilePath = "packages/vinhkhanh-en-v1.2.0.zip",
                FileSize = 7_800_000,
                Checksum = "sha256:b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                DownloadCount = 89,
                POICount = poiCount,
                AudioCount = poiCount,
                ImageCount = poiCount * 3,
            },
        };

        db.Set<OfflinePackage>().AddRange(packages);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} offline packages", packages.Count);
    }

    private static async Task SeedQRCodesAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Set<TourQRCode>().AnyAsync()) return;

        var admin = await db.Users.FirstAsync(u => u.Role == UserRole.Admin);

        var codes = new List<TourQRCode>
        {
            new()
            {
                QRToken = Guid.NewGuid().ToString(),
                Label = "Tour Sáng — Nhóm Doanh Nghiệp",
                MaxUses = null, // Unlimited
                UseCount = 47,
                CreatedByAdminId = admin.Id,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddMonths(3),
            },
            new()
            {
                QRToken = Guid.NewGuid().ToString(),
                Label = "Tour Chiều — Khách Nước Ngoài",
                MaxUses = null,
                UseCount = 23,
                CreatedByAdminId = admin.Id,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddMonths(3),
            },
            new()
            {
                QRToken = Guid.NewGuid().ToString(),
                Label = "QR Sự Kiện Ẩm Thực 15/04",
                MaxUses = 50,
                UseCount = 50,
                CreatedByAdminId = admin.Id,
                IsActive = false, // Expired after event
                ExpiresAt = DateTime.UtcNow.AddDays(-3),
            },
            new()
            {
                QRToken = Guid.NewGuid().ToString(),
                Label = "Tour Thử Nghiệm Beta",
                MaxUses = 10,
                UseCount = 3,
                CreatedByAdminId = admin.Id,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddMonths(1),
            },
        };

        db.Set<TourQRCode>().AddRange(codes);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} QR tour codes", codes.Count);
    }

    /// <summary>
    /// Idempotent schema fixes: runs ALTER TABLE statements that may not be reflected
    /// in the original EnsureCreated snapshot (e.g. columns made nullable after initial creation).
    /// Uses INFORMATION_SCHEMA checks instead of "ADD COLUMN IF NOT EXISTS" for full
    /// MySQL connector compatibility.
    /// </summary>
    private static async Task FixSchemaAsync(AppDbContext db, ILogger logger)
    {
        // Resolve the database name from the active connection.
        var dbName = db.Database.GetDbConnection().Database;

        // Make VisitHistory.UserId nullable so anonymous (QR-only) visits can be recorded
        // without a user account. MODIFY COLUMN is idempotent.
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE VisitHistory MODIFY COLUMN UserId INT NULL;");
            logger.LogInformation("[Schema] VisitHistory.UserId set to nullable");
        }
        catch (Exception ex) when (ex.Message.Contains("Duplicate column") || ex.Message.Contains("doesn't exist"))
        {
            // Already correct — ignore
        }

        // TourQRCodes inherits BaseEntity → needs UpdatedAt.
        await AddColumnIfMissingAsync(db, dbName, "TourQRCodes", "UpdatedAt",
            "DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP())", logger);

        // TouristSessions inherits BaseEntity → needs CreatedAt + UpdatedAt.
        await AddColumnIfMissingAsync(db, dbName, "TouristSessions", "CreatedAt",
            "DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP())", logger);
        await AddColumnIfMissingAsync(db, dbName, "TouristSessions", "UpdatedAt",
            "DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP())", logger);

        // Backfill TtsCode for languages seeded before this column was populated.
        var ttsCodes = new Dictionary<string, string>
        {
            ["vi"] = "vi-VN",
            ["en"] = "en-US",
            ["zh"] = "zh-CN",
            ["ja"] = "ja-JP",
            ["ko"] = "ko-KR",
        };

        foreach (var (code, ttsCode) in ttsCodes)
        {
            var lang = await db.Languages.FirstOrDefaultAsync(l => l.Code == code);
            if (lang != null && string.IsNullOrEmpty(lang.TtsCode))
                lang.TtsCode = ttsCode;
        }
        await db.SaveChangesAsync();
        logger.LogInformation("[Schema] Language TtsCodes backfilled");
    }

    /// <summary>
    /// Adds a column to a table only if it does not already exist.
    /// Uses raw ADO.NET ExecuteScalarAsync — avoids EF Core wrapping the query in a
    /// subquery (which breaks trailing semicolons and scalar results).
    /// </summary>
    private static async Task AddColumnIfMissingAsync(
        AppDbContext db, string dbName, string table, string column, string columnDef, ILogger logger)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
            await connection.OpenAsync();

        int count;
        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText =
                $"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS " +
                $"WHERE TABLE_SCHEMA = '{dbName}' " +
                $"AND TABLE_NAME = '{table}' " +
                $"AND COLUMN_NAME = '{column}'";
            count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        }

        if (count == 0)
        {
            await db.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE `{table}` ADD COLUMN `{column}` {columnDef}");
            logger.LogInformation("[Schema] Added {Table}.{Column}", table, column);
        }
        else
        {
            logger.LogInformation("[Schema] {Table}.{Column} already exists — skipped", table, column);
        }
    }
}
