using Microsoft.Data.Sqlite;
using System;
using System.IO;

// ============================================================================
// Tạo file SQLite cho ứng dụng Phố Ẩm Thực Vĩnh Khánh
// Output: ../VinhKhanhFoodTour.db
// ============================================================================

var dbPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "VinhKhanhFoodTour.db");
dbPath = Path.GetFullPath(dbPath);

// Xóa file cũ nếu tồn tại
if (File.Exists(dbPath)) File.Delete(dbPath);

Console.WriteLine("============================================================");
Console.WriteLine("  🚀 Tạo CSDL SQLite - Phố Ẩm Thực Vĩnh Khánh");
Console.WriteLine($"  📁 {dbPath}");
Console.WriteLine("============================================================");

using var connection = new SqliteConnection($"Data Source={dbPath}");
connection.Open();

// Bật WAL mode (tốt cho mobile)
Execute("PRAGMA journal_mode=WAL;");
Execute("PRAGMA foreign_keys=ON;");

// ===================== CREATE TABLES =====================
Console.WriteLine("\n📋 Đang tạo bảng...");

Execute(@"
CREATE TABLE IF NOT EXISTS Languages (
    Id          INTEGER PRIMARY KEY,
    Code        TEXT    NOT NULL UNIQUE,
    Name        TEXT    NOT NULL,
    NativeName  TEXT    NOT NULL,
    TtsCode     TEXT,
    IsActive    INTEGER NOT NULL DEFAULT 1,
    SortOrder   INTEGER NOT NULL DEFAULT 0
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS Categories (
    Id          INTEGER PRIMARY KEY,
    Icon        TEXT    NOT NULL,
    Color       TEXT,
    SortOrder   INTEGER NOT NULL DEFAULT 0,
    IsActive    INTEGER NOT NULL DEFAULT 1
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS CategoryTranslations (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    CategoryId  INTEGER NOT NULL,
    LanguageId  INTEGER NOT NULL,
    Name        TEXT    NOT NULL,
    Description TEXT,
    UNIQUE(CategoryId, LanguageId),
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE CASCADE,
    FOREIGN KEY (LanguageId) REFERENCES Languages(Id) ON DELETE CASCADE
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS POIs (
    Id                      INTEGER PRIMARY KEY,
    VendorId                INTEGER,
    CategoryId              INTEGER NOT NULL,
    Latitude                REAL    NOT NULL,
    Longitude               REAL    NOT NULL,
    GeofenceRadiusMeters    INTEGER NOT NULL DEFAULT 30,
    Address                 TEXT    NOT NULL,
    PhoneNumber             TEXT,
    Website                 TEXT,
    OpeningHours            TEXT,           -- JSON
    PriceRangeMin           REAL,
    PriceRangeMax           REAL,
    Rating                  REAL    DEFAULT 0,
    TotalVisits             INTEGER NOT NULL DEFAULT 0,
    IsActive                INTEGER NOT NULL DEFAULT 1,
    IsFeatured              INTEGER NOT NULL DEFAULT 0,
    LastSyncedAt            TEXT,           -- ISO 8601
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS POITranslations (
    Id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    POIId               INTEGER NOT NULL,
    LanguageId          INTEGER NOT NULL,
    Name                TEXT    NOT NULL,
    ShortDescription    TEXT    NOT NULL,
    FullDescription     TEXT    NOT NULL,
    NarrationText       TEXT,
    Highlights          TEXT,               -- JSON array
    UNIQUE(POIId, LanguageId),
    FOREIGN KEY (POIId) REFERENCES POIs(Id) ON DELETE CASCADE,
    FOREIGN KEY (LanguageId) REFERENCES Languages(Id) ON DELETE CASCADE
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS POIMedia (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    POIId           INTEGER NOT NULL,
    MediaType       INTEGER NOT NULL,       -- 0=Image, 1=Video, 2=Thumbnail360
    FileUrl         TEXT    NOT NULL,
    LocalFilePath   TEXT,                   -- Đường dẫn file đã tải về local
    FileName        TEXT    NOT NULL,
    FileSize        INTEGER NOT NULL,
    MimeType        TEXT    NOT NULL,
    Width           INTEGER,
    Height          INTEGER,
    Caption         TEXT,
    SortOrder       INTEGER NOT NULL DEFAULT 0,
    IsPrimary       INTEGER NOT NULL DEFAULT 0,
    IsDownloaded    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (POIId) REFERENCES POIs(Id) ON DELETE CASCADE
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS AudioNarrations (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    POIId           INTEGER NOT NULL,
    LanguageId      INTEGER NOT NULL,
    FileUrl         TEXT    NOT NULL,
    LocalFilePath   TEXT,                   -- Đường dẫn file audio đã tải
    FileName        TEXT    NOT NULL,
    FileSize        INTEGER NOT NULL,
    DurationSeconds INTEGER NOT NULL,
    MimeType        TEXT    NOT NULL DEFAULT 'audio/mpeg',
    VoiceType       INTEGER NOT NULL,       -- 0=Recorded, 1=TTS
    VoiceName       TEXT,
    IsDefault       INTEGER NOT NULL DEFAULT 0,
    IsActive        INTEGER NOT NULL DEFAULT 1,
    IsDownloaded    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (POIId) REFERENCES POIs(Id) ON DELETE CASCADE,
    FOREIGN KEY (LanguageId) REFERENCES Languages(Id)
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS POIMenuItems (
    Id          INTEGER PRIMARY KEY,
    POIId       INTEGER NOT NULL,
    Price       REAL    NOT NULL,
    ImageUrl    TEXT,
    LocalImagePath TEXT,
    IsAvailable INTEGER NOT NULL DEFAULT 1,
    IsSignature INTEGER NOT NULL DEFAULT 0,
    SortOrder   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (POIId) REFERENCES POIs(Id) ON DELETE CASCADE
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS MenuItemTranslations (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    MenuItemId  INTEGER NOT NULL,
    LanguageId  INTEGER NOT NULL,
    Name        TEXT    NOT NULL,
    Description TEXT,
    UNIQUE(MenuItemId, LanguageId),
    FOREIGN KEY (MenuItemId) REFERENCES POIMenuItems(Id) ON DELETE CASCADE,
    FOREIGN KEY (LanguageId) REFERENCES Languages(Id) ON DELETE CASCADE
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS UserSettings (
    Id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    PreferredLanguageId     INTEGER NOT NULL DEFAULT 1,
    NarrationMode           INTEGER NOT NULL DEFAULT 0,
    AutoPlayEnabled         INTEGER NOT NULL DEFAULT 1,
    CooldownMinutes         INTEGER NOT NULL DEFAULT 30,
    GeofenceSensitivity     INTEGER NOT NULL DEFAULT 1,
    Volume                  REAL    NOT NULL DEFAULT 0.8,
    PlaybackSpeed           REAL    NOT NULL DEFAULT 1.0,
    ShowNotifications       INTEGER NOT NULL DEFAULT 1,
    VibrationEnabled        INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (PreferredLanguageId) REFERENCES Languages(Id)
);
");

Execute(@"
CREATE TABLE IF NOT EXISTS VisitHistory (
    Id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    POIId               INTEGER NOT NULL,
    VisitedAt           TEXT    NOT NULL,    -- ISO 8601
    TriggerType         INTEGER NOT NULL,   -- 0=GeofenceEnter, 1=Exit, 2=Manual, 3=List
    NarrationPlayed     INTEGER NOT NULL DEFAULT 0,
    NarrationType       INTEGER,            -- 0=Recorded, 1=TTS
    AudioNarrationId    INTEGER,
    DurationListened    INTEGER,
    UserLatitude        REAL,
    UserLongitude       REAL,
    DeviceInfo          TEXT,
    IsSynced            INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (POIId) REFERENCES POIs(Id),
    FOREIGN KEY (AudioNarrationId) REFERENCES AudioNarrations(Id)
);
");

Console.WriteLine("  ✅ 11 bảng đã tạo xong");

// ===================== CREATE INDEXES =====================
Console.WriteLine("\n📊 Đang tạo indexes...");

Execute("CREATE INDEX IF NOT EXISTS IX_POIs_Location ON POIs(Latitude, Longitude);");
Execute("CREATE INDEX IF NOT EXISTS IX_POIs_Category ON POIs(CategoryId, IsActive);");
Execute("CREATE INDEX IF NOT EXISTS IX_POIs_Active ON POIs(IsActive, IsFeatured);");
Execute("CREATE INDEX IF NOT EXISTS IX_POITrans_POILang ON POITranslations(POIId, LanguageId);");
Execute("CREATE INDEX IF NOT EXISTS IX_Audio_POILang ON AudioNarrations(POIId, LanguageId, IsActive);");
Execute("CREATE INDEX IF NOT EXISTS IX_Audio_Default ON AudioNarrations(POIId, LanguageId, IsDefault);");
Execute("CREATE INDEX IF NOT EXISTS IX_POIMedia_POI ON POIMedia(POIId, SortOrder);");
Execute("CREATE INDEX IF NOT EXISTS IX_POIMedia_Primary ON POIMedia(POIId, IsPrimary);");
Execute("CREATE INDEX IF NOT EXISTS IX_Visit_POI ON VisitHistory(POIId, VisitedAt);");
Execute("CREATE INDEX IF NOT EXISTS IX_Visit_Unsynced ON VisitHistory(IsSynced);");
Execute("CREATE INDEX IF NOT EXISTS IX_MenuItems_POI ON POIMenuItems(POIId, IsAvailable, SortOrder);");

Console.WriteLine("  ✅ 11 indexes đã tạo xong");

// ===================== SEED DATA =====================
Console.WriteLine("\n🌱 Đang chèn dữ liệu mẫu...");

// --- Languages ---
Execute(@"
INSERT INTO Languages (Id, Code, Name, NativeName, TtsCode, SortOrder) VALUES
    (1, 'vi', 'Vietnamese', 'Tiếng Việt',  'vi-VN', 1),
    (2, 'en', 'English',    'English',      'en-US', 2),
    (3, 'zh', 'Chinese',    '中文',          'zh-CN', 3),
    (4, 'ja', 'Japanese',   '日本語',        'ja-JP', 4),
    (5, 'ko', 'Korean',     '한국어',        'ko-KR', 5);
");
Console.WriteLine("  ✅ 5 ngôn ngữ");

// --- Categories ---
Execute(@"
INSERT INTO Categories (Id, Icon, Color, SortOrder) VALUES
    (1, '🍜', '#FF6B35', 1),
    (2, '🦪', '#2EC4B6', 2),
    (3, '🍻', '#E71D36', 3),
    (4, '🧋', '#FF9F1C', 4),
    (5, '🍰', '#CB997E', 5),
    (6, '🍲', '#6A4C93', 6),
    (7, '🔥', '#F25C54', 7);
");

Execute(@"
INSERT INTO CategoryTranslations (CategoryId, LanguageId, Name, Description) VALUES
    (1, 1, 'Quán ăn',       'Các quán ăn đường phố và nhà hàng'),
    (2, 1, 'Hải sản & Ốc',  'Quán ốc, hải sản tươi sống'),
    (3, 1, 'Quán nhậu',     'Quán nhậu, bia hơi, snack'),
    (4, 1, 'Đồ uống',       'Trà sữa, nước ép, sinh tố'),
    (5, 1, 'Tráng miệng',   'Chè, bánh, kem'),
    (6, 1, 'Lẩu',           'Lẩu các loại'),
    (7, 1, 'Nướng & BBQ',   'Nướng, xiên que, BBQ'),
    (1, 2, 'Restaurant',     'Street food stalls and restaurants'),
    (2, 2, 'Seafood & Snails','Fresh seafood and snail restaurants'),
    (3, 2, 'Bar & Grill',    'Bars, draft beer, snack shops'),
    (4, 2, 'Drinks',         'Bubble tea, juice, smoothies'),
    (5, 2, 'Dessert',        'Sweet soup, cakes, ice cream'),
    (6, 2, 'Hot Pot',        'Various hot pot styles'),
    (7, 2, 'BBQ & Grill',   'BBQ, skewers, grilled food');
");
Console.WriteLine("  ✅ 7 danh mục (VI + EN)");

// --- POIs ---
Execute(@"
INSERT INTO POIs (Id, VendorId, CategoryId, Latitude, Longitude, GeofenceRadiusMeters, Address, PhoneNumber, PriceRangeMin, PriceRangeMax, Rating, IsActive, IsFeatured) VALUES
    (1,  NULL, 2, 10.7538000, 106.6932000, 25, '149 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0283 826 5890', 50000,  200000, 4.50, 1, 1),
    (2,  NULL, 2, 10.7535000, 106.6928000, 25, '115 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0903 456 789',  40000,  180000, 4.30, 1, 1),
    (3,  NULL, 3, 10.7540000, 106.6935000, 30, '40 Vĩnh Khánh, P.10, Q.4, TP.HCM',  '0909 111 222',  30000,  150000, 4.20, 1, 0),
    (4,  NULL, 2, 10.7536500, 106.6930000, 25, '152 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0283 826 1234', 45000,  190000, 4.40, 1, 1),
    (5,  NULL, 2, 10.7533000, 106.6926000, 30, '98 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            60000,  300000, 4.10, 1, 0),
    (6,  NULL, 1, 10.7541000, 106.6937000, 20, '56 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            25000,  45000,  4.60, 1, 0),
    (7,  NULL, 6, 10.7537000, 106.6929500, 25, '125 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0903 789 456',  80000,  250000, 4.00, 1, 0),
    (8,  NULL, 7, 10.7539000, 106.6933500, 25, '75 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            40000,  160000, 4.15, 1, 0),
    (9,  NULL, 5, 10.7534000, 106.6927500, 15, '110 Vĩnh Khánh, P.10, Q.4, TP.HCM', NULL,            15000,  35000,  4.70, 1, 0),
    (10, NULL, 4, 10.7542000, 106.6938000, 15, '30 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            20000,  55000,  4.25, 1, 0);
");
Console.WriteLine("  ✅ 10 điểm POI");

// --- POI Translations (VI + EN) ---
Execute(@"
INSERT INTO POITranslations (POIId, LanguageId, Name, ShortDescription, FullDescription, NarrationText, Highlights) VALUES
    (1, 1, 'Ốc Đào Vĩnh Khánh',
     'Quán ốc nổi tiếng nhất phố Vĩnh Khánh với hơn 20 năm kinh nghiệm.',
     'Ốc Đào là một trong những quán ốc lâu đời nhất tại phố ẩm thực Vĩnh Khánh, Quận 4, TP.HCM.',
     'Chào mừng bạn đến với Ốc Đào, một trong những quán ốc lâu đời nhất tại phố ẩm thực Vĩnh Khánh. Với hơn 20 năm kinh nghiệm, nơi đây nổi tiếng với các món ốc hương nướng mỡ hành, sò điệp nướng phô mai, và đặc biệt là ốc len xào dừa. Giá trung bình từ 50 đến 200 ngàn đồng.',
     '[""Ốc hương nướng mỡ hành"",""Sò điệp phô mai"",""Ốc len xào dừa"",""Nghêu hấp sả""]'),
    (1, 2, 'Ốc Đào Vĩnh Khánh',
     'The most famous snail restaurant on Vinh Khanh Street with over 20 years of history.',
     'Oc Dao is one of the oldest and most iconic snail restaurants on Vinh Khanh food street.',
     'Welcome to Oc Dao, one of the oldest snail restaurants on Vinh Khanh food street. Famous for grilled horn snails with scallion oil, baked scallops with cheese, and coconut-sauteed snails. Average price: 2 to 8 USD.',
     '[""Grilled horn snails"",""Baked scallops with cheese"",""Coconut snails"",""Lemongrass clams""]'),

    (2, 1, 'Ốc Bà Hiền',
     'Quán ốc gia truyền với hương vị đậm đà.',
     'Ốc Bà Hiền là quán ốc gia truyền nổi tiếng trên đường Vĩnh Khánh.',
     'Bạn đang đứng trước Ốc Bà Hiền. Đặc biệt nên thử ốc bươu xào me và nghêu nướng mỡ hành. Giá từ 40 đến 180 ngàn đồng.',
     '[""Ốc bươu xào me"",""Nghêu nướng mỡ hành"",""Cua rang muối""]'),
    (2, 2, 'Ốc Bà Hiền',
     'A family-run snail restaurant with rich District 4 flavors.',
     'Oc Ba Hien is a beloved family-run snail restaurant on Vinh Khanh Street.',
     'You are in front of Oc Ba Hien. Try the tamarind apple snails and scallion-grilled clams. Prices: 40,000 to 180,000 VND.',
     '[""Tamarind apple snails"",""Grilled clams"",""Salt and pepper crab""]'),

    (3, 1, 'Lồng Uống 40', 'Quán nhậu bình dân đông khách nhất khu vực.',
     'Lồng Uống 40 nổi tiếng với không gian vỉa hè sôi động, bia tươi giá rẻ.',
     'Chào mừng đến Lồng Uống 40, điểm đến yêu thích của giới trẻ Sài Gòn trên phố Vĩnh Khánh.',
     '[""Bia tươi"",""Khô mực nướng"",""Gà nướng muối ớt""]'),
    (3, 2, 'Lồng Uống 40', 'The most popular budget-friendly bar in the area.',
     'Long Uong 40 is famous for its vibrant sidewalk atmosphere and cheap draft beer.',
     'Welcome to Long Uong 40, the perfect spot to experience Saigon street beer culture.',
     '[""Draft beer"",""Grilled dried squid"",""Salt and chili chicken""]'),

    (4, 1, 'Ốc Oanh', 'Quán ốc lâu đời với món ốc len xào dừa huyền thoại.',
     'Ốc Oanh nổi tiếng với món ốc len xào dừa thơm béo.',
     'Bạn đang ở gần Ốc Oanh, nổi tiếng với ốc len xào dừa — biểu tượng ẩm thực đường phố Sài Gòn.',
     '[""Ốc len xào dừa"",""Sò huyết nướng"",""Cua rang me""]'),
    (4, 2, 'Ốc Oanh', 'Long-standing snail restaurant famous for legendary coconut snails.',
     'Oc Oanh is celebrated for its creamy coconut-sauteed snails.',
     'You are near Oc Oanh, famous for coconut-sauteed snails — an iconic Saigon street food.',
     '[""Coconut snails"",""Grilled blood cockles"",""Tamarind crab""]'),

    (5, 1, 'Hải Sản Năm Sao', 'Nhà hàng hải sản cao cấp với giá bình dân.',
     'Phục vụ hải sản tươi sống chất lượng cao với mức giá hợp lý.',
     'Chào mừng đến Hải Sản Năm Sao. Tôm hùm, cua hoàng đế, cá tươi mỗi ngày.',
     '[""Tôm hùm nướng"",""Cua hoàng đế"",""Cá chẽm hấp""]'),
    (5, 2, 'Hải Sản Năm Sao', 'Premium seafood at affordable prices.',
     'High-quality fresh seafood at reasonable prices.',
     'Welcome to Hai San Nam Sao. Lobster, king crab, and freshly caught fish daily.',
     '[""Grilled lobster"",""King crab"",""Steamed sea bass""]'),

    (6, 1, 'Bún Riêu Cô Ba', 'Bún riêu truyền thống, bí quyết gia truyền 3 đời.',
     'Nước dùng từ công thức gia truyền 3 đời, đậm đà hương vị miền Nam.',
     'Bún Riêu Cô Ba — nước dùng gia truyền 3 đời, riêu cua đồng xay nhuyễn. Mỗi tô chỉ từ 25 ngàn đồng.',
     '[""Bún riêu cua"",""Bún riêu chả"",""Bún riêu giò heo""]'),
    (6, 2, 'Bún Riêu Cô Ba', 'Traditional crab noodle soup, 3-generation family recipe.',
     'Broth from a 3-generation family recipe with Southern Vietnamese flavors.',
     'Bun Rieu Co Ba — 3-generation recipe with freshwater crab. Each bowl from just 25,000 VND.',
     '[""Crab noodle soup"",""Crab meatball noodle"",""Crab pork knuckle noodle""]'),

    (7, 1, 'Lẩu Dê Vĩnh Khánh', 'Lẩu dê nổi tiếng, thịt tươi mềm.',
     'Chuyên phục vụ lẩu dê tươi sống, tái chanh, nướng xiên.',
     'Lẩu Dê Vĩnh Khánh — lẩu dê tươi, thịt mềm, nước dùng hầm xương dê nhiều giờ.',
     '[""Lẩu dê"",""Dê tái chanh"",""Dê nướng xiên""]'),
    (7, 2, 'Goat Hot Pot Vĩnh Khánh', 'Famous goat hot pot with tender meat.',
     'Fresh goat hot pot, lime-cured goat, grilled goat skewers.',
     'Goat Hot Pot Vinh Khanh — tender meat, rich broth simmered from goat bones for hours.',
     '[""Goat hot pot"",""Lime-cured goat"",""Grilled goat skewers""]'),

    (8, 1, 'Nướng Ngói Vĩnh Khánh', 'Nướng ngói đặc sản, thịt bò mềm thơm.',
     'Nướng trên ngói đất truyền thống miền Nam.',
     'Nướng Ngói Vĩnh Khánh — nướng thịt trên ngói đất, phương pháp truyền thống miền Nam Việt Nam.',
     '[""Bò nướng ngói"",""Tôm nướng ngói"",""Mực nướng ngói""]'),
    (8, 2, 'Tile-Grilled BBQ', 'Specialty tile-grilled BBQ on hot clay tiles.',
     'Food grilled on traditional clay roof tiles.',
     'Tile-Grilled BBQ — unique method of grilling on clay roof tiles, extraordinarily aromatic.',
     '[""Tile-grilled beef"",""Tile-grilled shrimp"",""Tile-grilled squid""]'),

    (9, 1, 'Chè Bà Tư', 'Chè truyền thống Sài Gòn nổi tiếng nhất Vĩnh Khánh.',
     'Phục vụ hơn 20 loại chè truyền thống.',
     'Chè Bà Tư — hơn 20 loại chè, nổi bật là chè ba màu và chè trôi nước. Giá từ 15 ngàn đồng.',
     '[""Chè ba màu"",""Chè trôi nước"",""Chè đậu xanh""]'),
    (9, 2, 'Chè Bà Tư', 'Traditional Saigon dessert soup.',
     'Over 20 types of Vietnamese sweet soups.',
     'Che Ba Tu — over 20 types of sweet soups. Highlights: three-color dessert and glutinous rice balls.',
     '[""Three-color dessert"",""Glutinous rice balls"",""Mung bean soup""]'),

    (10, 1, 'Trà Sữa Vĩnh Khánh', 'Trà sữa và thức uống giải khát đa dạng.',
     'Phục vụ trà sữa, nước ép trái cây tươi và sinh tố.',
     'Trà Sữa Vĩnh Khánh — trà sữa trân châu, nước ép bưởi, sinh tố bơ. Giải nhiệt Sài Gòn.',
     '[""Trà sữa trân châu"",""Nước ép bưởi"",""Sinh tố bơ""]'),
    (10, 2, 'Bubble Tea Vĩnh Khánh', 'Diverse bubble tea and refreshments.',
     'Bubble teas, fresh fruit juices, and smoothies.',
     'Bubble Tea Vinh Khanh — pearl bubble tea, pomelo juice, avocado smoothie.',
     '[""Pearl bubble tea"",""Pomelo juice"",""Avocado smoothie""]');
");
Console.WriteLine("  ✅ 10 POI × 2 ngôn ngữ = 20 bản dịch");

// --- Menu Items (Ốc Đào) ---
Execute(@"
INSERT INTO POIMenuItems (Id, POIId, Price, IsAvailable, IsSignature, SortOrder) VALUES
    (1,  1, 85000,  1, 1, 1),
    (2,  1, 75000,  1, 1, 2),
    (3,  1, 95000,  1, 1, 3),
    (4,  1, 65000,  1, 0, 4),
    (5,  1, 55000,  1, 0, 5),
    (6,  1, 120000, 1, 0, 6),
    (7,  1, 70000,  1, 0, 7),
    (8,  1, 45000,  1, 0, 8),
    (9,  1, 150000, 1, 0, 9),
    (10, 1, 80000,  1, 0, 10);
");

Execute(@"
INSERT INTO MenuItemTranslations (MenuItemId, LanguageId, Name, Description) VALUES
    (1,  1, 'Ốc hương nướng mỡ hành',   'Ốc hương tươi nướng với mỡ hành phi thơm'),
    (2,  1, 'Ốc len xào dừa',            'Ốc len xào với nước cốt dừa béo ngậy'),
    (3,  1, 'Sò điệp nướng phô mai',     'Sò điệp tươi nướng phô mai tan chảy'),
    (4,  1, 'Nghêu hấp sả',              'Nghêu hấp với sả và lá chanh'),
    (5,  1, 'Ốc mỡ xào tỏi',            'Ốc mỡ béo xào tỏi phi giòn'),
    (6,  1, 'Cua rang me',                'Cua biển rang với sốt me chua ngọt'),
    (7,  1, 'Sò huyết nướng',            'Sò huyết nướng mỡ hành'),
    (8,  1, 'Ốc bươu luộc sả',           'Ốc bươu luộc nguyên con với sả'),
    (9,  1, 'Tôm sú nướng muối ớt',      'Tôm sú size lớn nướng muối ớt'),
    (10, 1, 'Mực nướng sa tế',           'Mực tươi nướng sốt sa tế cay'),
    (1,  2, 'Grilled Horn Snails',        'Fresh horn snails with scallion oil'),
    (2,  2, 'Coconut-Sautéed Snails',     'Snails sautéed in coconut cream'),
    (3,  2, 'Baked Scallops with Cheese', 'Scallops baked with melted cheese'),
    (4,  2, 'Lemongrass Steamed Clams',   'Clams steamed with lemongrass'),
    (5,  2, 'Garlic Butter Snails',       'Snails with crispy fried garlic'),
    (6,  2, 'Tamarind Crab',              'Crab in tamarind sauce'),
    (7,  2, 'Grilled Blood Cockles',      'Blood cockles with scallion oil'),
    (8,  2, 'Boiled Apple Snails',        'Apple snails boiled with lemongrass'),
    (9,  2, 'Salt & Chili Tiger Prawns',  'Large tiger prawns with salt and chili'),
    (10, 2, 'Satay Grilled Squid',        'Fresh squid with spicy satay sauce');
");
Console.WriteLine("  ✅ 10 món ăn × 2 ngôn ngữ");

// --- Audio Narrations ---
Execute(@"
INSERT INTO AudioNarrations (POIId, LanguageId, FileUrl, FileName, FileSize, DurationSeconds, VoiceType, VoiceName, IsDefault, IsActive) VALUES
    (1, 1, '/audio/vi/oc-dao-recorded.mp3',    'oc-dao-recorded.mp3',    2457600, 45, 0, NULL,                  1, 1),
    (1, 1, '/audio/vi/oc-dao-tts.mp3',         'oc-dao-tts.mp3',         1843200, 42, 1, 'vi-VN-HoaiMyNeural',  0, 1),
    (1, 2, '/audio/en/oc-dao-en.mp3',          'oc-dao-en.mp3',          2048000, 48, 1, 'en-US-JennyNeural',   1, 1),
    (2, 1, '/audio/vi/ba-hien-recorded.mp3',   'ba-hien-recorded.mp3',   1945600, 38, 0, NULL,                  1, 1),
    (2, 2, '/audio/en/ba-hien-en.mp3',         'ba-hien-en.mp3',         1740800, 40, 1, 'en-US-JennyNeural',   1, 1),
    (6, 1, '/audio/vi/bun-rieu-recorded.mp3',  'bun-rieu-recorded.mp3',  2150400, 42, 0, NULL,                  1, 1),
    (6, 2, '/audio/en/bun-rieu-en.mp3',        'bun-rieu-en.mp3',        2355200, 50, 1, 'en-US-JennyNeural',   1, 1),
    (9, 1, '/audio/vi/che-ba-tu-recorded.mp3', 'che-ba-tu-recorded.mp3', 1638400, 35, 0, NULL,                  1, 1),
    (9, 2, '/audio/en/che-ba-tu-en.mp3',       'che-ba-tu-en.mp3',       1536000, 36, 1, 'en-US-JennyNeural',   1, 1);
");
Console.WriteLine("  ✅ 9 file audio metadata");

// --- Default UserSettings ---
Execute(@"
INSERT INTO UserSettings (PreferredLanguageId, NarrationMode, AutoPlayEnabled, CooldownMinutes, GeofenceSensitivity, Volume, PlaybackSpeed) VALUES
    (1, 0, 1, 30, 1, 0.8, 1.0);
");
Console.WriteLine("  ✅ Cài đặt mặc định");

// ===================== VERIFY =====================
Console.WriteLine("\n🔍 Kiểm tra dữ liệu...\n");

using var cmd = connection.CreateCommand();
string[] tables = ["Languages", "Categories", "CategoryTranslations", "POIs",
    "POITranslations", "POIMedia", "AudioNarrations", "POIMenuItems",
    "MenuItemTranslations", "UserSettings", "VisitHistory"];

Console.WriteLine("  {0,-25} {1,10}", "Bảng", "Số dòng");
Console.WriteLine("  " + new string('-', 37));
foreach (var table in tables)
{
    cmd.CommandText = $"SELECT COUNT(*) FROM {table}";
    var count = cmd.ExecuteScalar();
    Console.WriteLine("  {0,-25} {1,10}", table, count);
}

// File size
var fileInfo = new FileInfo(dbPath);
Console.WriteLine($"\n  📁 File: {dbPath}");
Console.WriteLine($"  📦 Kích thước: {fileInfo.Length / 1024.0:F1} KB");

Console.WriteLine("\n============================================================");
Console.WriteLine("  ✅ HOÀN TẤT! File SQLite đã sẵn sàng.");
Console.WriteLine("============================================================");

// ===================== Helper =====================
void Execute(string sql)
{
    using var c = connection.CreateCommand();
    c.CommandText = sql;
    c.ExecuteNonQuery();
}
