-- ============================================================================
-- 005_SeedData.sql (MySQL)
-- Dữ liệu mẫu cho phố ẩm thực Vĩnh Khánh
-- ============================================================================

USE `VinhKhanhFoodTour`;

-- ============================================================================
-- 1. NGÔN NGỮ
-- ============================================================================

INSERT INTO `Languages` (`Id`, `Code`, `Name`, `NativeName`, `TtsCode`, `SortOrder`) VALUES
    (1, 'vi', 'Vietnamese', 'Tiếng Việt',  'vi-VN', 1),
    (2, 'en', 'English',    'English',      'en-US', 2),
    (3, 'zh', 'Chinese',    '中文',          'zh-CN', 3),
    (4, 'ja', 'Japanese',   '日本語',        'ja-JP', 4),
    (5, 'ko', 'Korean',     '한국어',        'ko-KR', 5);

-- ============================================================================
-- 2. ADMIN MẶC ĐỊNH
-- ============================================================================

INSERT INTO `Users`
    (`Username`, `Email`, `PasswordHash`, `FullName`, `Role`, `PreferredLanguageId`, `IsActive`, `EmailConfirmed`)
VALUES
    ('admin', 'admin@vinhkhanh.app',
     '100000.MBFDqDcr9eiz4Zu26LCgQg==.Vu00Hr5uLHdu+di58ftA+AkmnEPB/P03gCrjrxrv5AQ=',
     'Quản trị viên', 2, 1, 1, 1),
    ('superadmin', 'superadmin@vinhkhanh.app',
     '100000.MBFDqDcr9eiz4Zu26LCgQg==.Vu00Hr5uLHdu+di58ftA+AkmnEPB/P03gCrjrxrv5AQ=',
     'Super Admin', 2, 1, 1, 1);

-- ============================================================================
-- 3. CHỦ QUÁN MẪU (Vendors)
-- ============================================================================

INSERT INTO `Users`
    (`Username`, `Email`, `PasswordHash`, `FullName`, `Phone`, `Role`, `PreferredLanguageId`, `IsActive`, `EmailConfirmed`)
VALUES
    ('ocdao_owner', 'ocdao@gmail.com',
     '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO',
     'Nguyễn Văn A', '0909123456', 1, 1, 1, 1),
    ('bahien_owner', 'bahien@gmail.com',
     '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO',
     'Trần Thị B', '0909654321', 1, 1, 1, 1),
    ('longuong40_owner', 'longuong40@gmail.com',
     '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO',
     'Lê Văn C', '0909111222', 1, 1, 1, 1);

-- ============================================================================
-- 4. KHÁCH HÀNG MẪU (Customers)
-- ============================================================================

INSERT INTO `Users`
    (`Username`, `Email`, `PasswordHash`, `FullName`, `Role`, `PreferredLanguageId`, `IsActive`, `EmailConfirmed`)
VALUES
    ('tourist_hana', 'hana@test.com',
     '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO',
     'Hana Tanaka', 0, 4, 1, 1),
    ('tourist_john', 'john@test.com',
     '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO',
     'John Smith', 0, 2, 1, 1),
    ('khach_minh', 'minh@test.com',
     '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO',
     'Phạm Minh', 0, 1, 1, 1);

-- ============================================================================
-- 5. DANH MỤC (Categories)
-- ============================================================================

INSERT INTO `Categories` (`Id`, `Icon`, `Color`, `SortOrder`) VALUES
    (1, '🍜', '#FF6B35', 1),
    (2, '🦪', '#2EC4B6', 2),
    (3, '🍻', '#E71D36', 3),
    (4, '🧋', '#FF9F1C', 4),
    (5, '🍰', '#CB997E', 5),
    (6, '🍲', '#6A4C93', 6),
    (7, '🔥', '#F25C54', 7);

INSERT INTO `CategoryTranslations` (`CategoryId`, `LanguageId`, `Name`, `Description`) VALUES
    -- Tiếng Việt
    (1, 1, 'Quán ăn',         'Các quán ăn đường phố và nhà hàng'),
    (2, 1, 'Hải sản & Ốc',    'Quán ốc, hải sản tươi sống'),
    (3, 1, 'Quán nhậu',       'Quán nhậu, bia hơi, snack'),
    (4, 1, 'Đồ uống',         'Trà sữa, nước ép, sinh tố'),
    (5, 1, 'Tráng miệng',     'Chè, bánh, kem'),
    (6, 1, 'Lẩu',             'Lẩu các loại'),
    (7, 1, 'Nướng & BBQ',     'Nướng, xiên que, BBQ'),
    -- English
    (1, 2, 'Restaurant',       'Street food stalls and restaurants'),
    (2, 2, 'Seafood & Snails', 'Fresh seafood and snail restaurants'),
    (3, 2, 'Bar & Grill',      'Bars, draft beer, snack shops'),
    (4, 2, 'Drinks',           'Bubble tea, juice, smoothies'),
    (5, 2, 'Dessert',          'Sweet soup, cakes, ice cream'),
    (6, 2, 'Hot Pot',          'Various hot pot styles'),
    (7, 2, 'BBQ & Grill',     'BBQ, skewers, grilled food'),
    -- 中文
    (1, 3, '餐厅',             '街头小吃和餐厅'),
    (2, 3, '海鲜和蜗牛',        '新鲜海鲜和蜗牛餐厅'),
    (3, 3, '酒吧',             '酒吧、啤酒、小吃'),
    (4, 3, '饮料',             '奶茶、果汁、冰沙'),
    (5, 3, '甜点',             '甜汤、蛋糕、冰淇淋'),
    (6, 3, '火锅',             '各种火锅'),
    (7, 3, '烧烤',             '烧烤、串烧'),
    -- 日本語
    (1, 4, 'レストラン',         '屋台料理とレストラン'),
    (2, 4, 'シーフード＆カタツムリ', '新鮮な海鮮と巻貝料理'),
    (3, 4, 'バー＆グリル',       'バー、ビール、おつまみ'),
    (4, 4, 'ドリンク',           'タピオカ、ジュース、スムージー'),
    (5, 4, 'デザート',           'スイーツ、ケーキ、アイスクリーム'),
    (6, 4, '鍋料理',            '各種鍋料理'),
    (7, 4, '焼肉＆BBQ',        '焼肉、串焼き'),
    -- 한국어
    (1, 5, '식당',              '길거리 음식과 레스토랑'),
    (2, 5, '해산물 & 달팽이',    '신선한 해산물과 달팽이 요리'),
    (3, 5, '술집',              '바, 맥주, 안주'),
    (4, 5, '음료',              '버블티, 주스, 스무디'),
    (5, 5, '디저트',            '단 수프, 케이크, 아이스크림'),
    (6, 5, '전골',              '다양한 전골 요리'),
    (7, 5, '바베큐',            '바베큐, 꼬치구이');

-- ============================================================================
-- 6. ĐIỂM ĂN UỐNG (POIs) — 10 quán trên Vĩnh Khánh
-- ============================================================================

INSERT INTO `POIs`
    (`Id`, `VendorUserId`, `CategoryId`, `Latitude`, `Longitude`,
     `GeofenceRadius`, `Address`, `Phone`,
     `PriceRangeMin`, `PriceRangeMax`, `Rating`, `IsActive`, `IsFeatured`)
VALUES
    (1,  2,    2, 10.7538000, 106.6932000, 25, '149 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0283 826 5890', 50000,  200000, 4.50, 1, 1),
    (2,  3,    2, 10.7535000, 106.6928000, 25, '115 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0903 456 789',  40000,  180000, 4.30, 1, 1),
    (3,  4,    3, 10.7540000, 106.6935000, 30, '40 Vĩnh Khánh, P.10, Q.4, TP.HCM',  '0909 111 222',  30000,  150000, 4.20, 1, 0),
    (4,  NULL, 2, 10.7536500, 106.6930000, 25, '152 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0283 826 1234', 45000,  190000, 4.40, 1, 1),
    (5,  NULL, 2, 10.7533000, 106.6926000, 30, '98 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            60000,  300000, 4.10, 1, 0),
    (6,  NULL, 1, 10.7541000, 106.6937000, 20, '56 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            25000,  45000,  4.60, 1, 0),
    (7,  NULL, 6, 10.7537000, 106.6929500, 25, '125 Vĩnh Khánh, P.10, Q.4, TP.HCM', '0903 789 456',  80000,  250000, 4.00, 1, 0),
    (8,  NULL, 7, 10.7539000, 106.6933500, 25, '75 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            40000,  160000, 4.15, 1, 0),
    (9,  NULL, 5, 10.7534000, 106.6927500, 15, '110 Vĩnh Khánh, P.10, Q.4, TP.HCM', NULL,            15000,  35000,  4.70, 1, 0),
    (10, NULL, 4, 10.7542000, 106.6938000, 15, '30 Vĩnh Khánh, P.10, Q.4, TP.HCM',  NULL,            20000,  55000,  4.25, 1, 0);

-- ============================================================================
-- 7. NỘI DUNG THUYẾT MINH (POITranslations) — VI + EN
-- ============================================================================

INSERT INTO `POITranslations`
    (`POIId`, `LanguageId`, `Name`, `ShortDescription`, `FullDescription`, `NarrationText`, `Highlights`)
VALUES
    -- POI 1: Ốc Đào
    (1, 1, 'Ốc Đào Vĩnh Khánh',
     'Quán ốc nổi tiếng nhất phố Vĩnh Khánh với hơn 20 năm kinh nghiệm.',
     'Ốc Đào là một trong những quán ốc lâu đời và nổi tiếng nhất tại phố ẩm thực Vĩnh Khánh, Quận 4, TP.HCM. Quán được thành lập từ những năm 2000, nổi tiếng với các loại ốc và hải sản tươi sống.',
     'Chào mừng bạn đến với Ốc Đào, một trong những quán ốc lâu đời nhất tại phố ẩm thực Vĩnh Khánh. Với hơn 20 năm kinh nghiệm, nơi đây nổi tiếng với các món ốc hương nướng mỡ hành, sò điệp nướng phô mai, và đặc biệt là ốc len xào dừa. Giá trung bình từ 50 đến 200 ngàn đồng một người.',
     '["Ốc hương nướng mỡ hành","Sò điệp phô mai","Ốc len xào dừa","Nghêu hấp sả"]'),
    (1, 2, 'Ốc Đào Vĩnh Khánh',
     'The most famous snail restaurant on Vinh Khanh Street with over 20 years of history.',
     'Oc Dao is one of the oldest and most iconic snail restaurants on Vinh Khanh food street in District 4, Ho Chi Minh City.',
     'Welcome to Oc Dao, one of the oldest snail restaurants on Vinh Khanh food street. Famous for grilled horn snails with scallion oil, baked scallops with cheese, and coconut-sauteed snails. Average price: 2–8 USD. Open daily 4PM–midnight.',
     '["Grilled horn snails","Baked scallops with cheese","Coconut snails","Lemongrass clams"]'),

    -- POI 2: Bà Hiền
    (2, 1, 'Ốc Bà Hiền',
     'Quán ốc gia truyền với hương vị đậm đà, đặc trưng Quận 4.',
     'Ốc Bà Hiền là quán ốc gia truyền nổi tiếng trên đường Vĩnh Khánh, hương vị đậm đà và giá cả bình dân.',
     'Bạn đang đứng trước Ốc Bà Hiền, một quán ốc gia truyền nổi tiếng. Đặc biệt, bạn nên thử món ốc bươu xào me và nghêu nướng mỡ hành. Giá từ 40 đến 180 ngàn đồng.',
     '["Ốc bươu xào me","Nghêu nướng mỡ hành","Cua rang muối"]'),
    (2, 2, 'Ốc Bà Hiền',
     'A family-run snail restaurant with rich, authentic District 4 flavors.',
     'Oc Ba Hien is a beloved family-run snail restaurant on Vinh Khanh Street with rich flavors and affordable prices.',
     'You are now in front of Oc Ba Hien. Try the tamarind-sauteed apple snails and scallion-grilled clams. Prices: 40,000–180,000 VND.',
     '["Tamarind apple snails","Grilled clams","Salt & pepper crab"]'),

    -- POI 3: Lồng Uống 40
    (3, 1, 'Lồng Uống 40',
     'Quán nhậu bình dân đông khách nhất khu vực.',
     'Lồng Uống 40 nổi tiếng với không gian vỉa hè sôi động, bia tươi giá rẻ và các món nhắm đa dạng.',
     'Chào mừng bạn đến Lồng Uống 40, điểm đến yêu thích của giới trẻ Sài Gòn. Nơi đây lý tưởng để trải nghiệm văn hóa bia hơi đường phố.',
     '["Bia tươi","Khô mực nướng","Gà nướng muối ớt"]'),
    (3, 2, 'Lồng Uống 40',
     'The most popular budget-friendly bar in the area.',
     'Long Uong 40 is famous for its vibrant sidewalk atmosphere, cheap draft beer, and diverse snack menu.',
     'Welcome to Long Uong 40, the perfect spot to experience authentic Saigon street beer culture.',
     '["Draft beer","Grilled dried squid","Salt & chili chicken"]'),

    -- POI 4: Ốc Oanh
    (4, 1, 'Ốc Oanh',
     'Quán ốc lâu đời với món ốc len xào dừa huyền thoại.',
     'Ốc Oanh nổi tiếng với món ốc len xào dừa thơm béo và các loại ốc tươi sống chất lượng cao.',
     'Bạn đang ở gần Ốc Oanh, nổi tiếng với ốc len xào dừa — món ăn đường phố biểu tượng của Sài Gòn. Nên thử sò huyết nướng và cua rang me.',
     '["Ốc len xào dừa","Sò huyết nướng","Cua rang me"]'),
    (4, 2, 'Ốc Oanh',
     'Long-standing snail restaurant famous for legendary coconut snails.',
     'Oc Oanh is celebrated for its creamy coconut-sauteed snails and high-quality fresh snails.',
     'You are near Oc Oanh, famous for coconut-sauteed snails — an iconic Saigon street food. Try the grilled blood cockles and tamarind crab.',
     '["Coconut snails","Grilled blood cockles","Tamarind crab"]'),

    -- POI 5: Hải sản Năm Sao
    (5, 1, 'Hải Sản Năm Sao',
     'Nhà hàng hải sản cao cấp với giá bình dân.',
     'Hải Sản Năm Sao phục vụ hải sản tươi sống chất lượng cao với mức giá hợp lý.',
     'Chào mừng đến Hải Sản Năm Sao, trải nghiệm hải sản cao cấp. Tôm hùm, cua hoàng đế, cá tươi mỗi ngày.',
     '["Tôm hùm nướng","Cua hoàng đế","Cá chẽm hấp"]'),
    (5, 2, 'Hải Sản Năm Sao',
     'Premium seafood restaurant at affordable prices.',
     'Hai San Nam Sao serves high-quality fresh seafood at reasonable prices.',
     'Welcome to Hai San Nam Sao. Lobster, king crab, and freshly caught fish daily.',
     '["Grilled lobster","King crab","Steamed sea bass"]'),

    -- POI 6: Bún Riêu Cô Ba
    (6, 1, 'Bún Riêu Cô Ba',
     'Quán bún riêu truyền thống, bí quyết gia truyền 3 đời.',
     'Nước dùng được nấu từ công thức gia truyền 3 đời, đậm đà hương vị miền Nam.',
     'Bún Riêu Cô Ba — nước dùng gia truyền 3 đời, riêu cua đồng xay nhuyễn. Mỗi tô chỉ từ 25 ngàn đồng.',
     '["Bún riêu cua","Bún riêu chả","Bún riêu giò heo"]'),
    (6, 2, 'Bún Riêu Cô Ba',
     'Traditional crab noodle soup with a 3-generation family recipe.',
     'The broth is made from a 3-generation family recipe, rich with Southern Vietnamese flavors.',
     'Bun Rieu Co Ba — 3-generation recipe with finely ground freshwater crab. Each bowl from just 25,000 VND.',
     '["Crab noodle soup","Crab & meatball noodle","Crab & pork knuckle noodle"]'),

    -- POI 7: Lẩu Dê
    (7, 1, 'Lẩu Dê Vĩnh Khánh',
     'Lẩu dê nổi tiếng, thịt tươi mềm, nước dùng đậm đà.',
     'Chuyên phục vụ lẩu dê tươi sống, tái chanh, nướng xiên.',
     'Lẩu Dê Vĩnh Khánh — lẩu dê tươi, thịt mềm, nước dùng hầm xương dê nhiều giờ.',
     '["Lẩu dê","Dê tái chanh","Dê nướng xiên"]'),
    (7, 2, 'Goat Hot Pot Vĩnh Khánh',
     'Famous goat hot pot with fresh tender meat and rich broth.',
     'Specializes in fresh goat hot pot, lime-cured goat, grilled goat skewers.',
     'Goat Hot Pot Vinh Khanh — tender meat, rich broth simmered from goat bones for hours.',
     '["Goat hot pot","Lime-cured goat","Grilled goat skewers"]'),

    -- POI 8: Nướng Ngói
    (8, 1, 'Nướng Ngói Vĩnh Khánh',
     'Nướng ngói đặc sản, thịt bò mềm thơm trên ngói nóng.',
     'Nướng trên ngói đất truyền thống, hương vị đặc trưng miền Nam.',
     'Nướng Ngói Vĩnh Khánh — nướng thịt trên ngói đất, phương pháp truyền thống miền Nam Việt Nam.',
     '["Bò nướng ngói","Tôm nướng ngói","Mực nướng ngói"]'),
    (8, 2, 'Tile-Grilled BBQ Vĩnh Khánh',
     'Specialty tile-grilled BBQ with tender beef on hot clay tiles.',
     'Food grilled on traditional clay roof tiles, a Southern Vietnamese technique.',
     'Tile-Grilled BBQ — unique method of grilling on clay roof tiles, extraordinarily aromatic.',
     '["Tile-grilled beef","Tile-grilled shrimp","Tile-grilled squid"]'),

    -- POI 9: Chè Bà Tư
    (9, 1, 'Chè Bà Tư',
     'Chè truyền thống Sài Gòn, quán chè nổi tiếng nhất Vĩnh Khánh.',
     'Phục vụ các loại chè truyền thống: chè ba màu, chè đậu xanh, chè trôi nước.',
     'Chè Bà Tư — hơn 20 loại chè, nổi bật là chè ba màu và chè trôi nước. Giá từ 15 ngàn đồng.',
     '["Chè ba màu","Chè trôi nước","Chè đậu xanh"]'),
    (9, 2, 'Chè Bà Tư',
     'Traditional Saigon dessert soup, the most famous on Vĩnh Khánh.',
     'Serves traditional Saigon dessert soups: three-color dessert, mung bean soup, glutinous rice balls.',
     'Che Ba Tu — over 20 types of sweet soups. Highlights: three-color dessert and glutinous rice balls. From 15,000 VND.',
     '["Three-color dessert","Glutinous rice balls","Mung bean soup"]'),

    -- POI 10: Trà Sữa
    (10, 1, 'Trà Sữa Vĩnh Khánh',
     'Quán trà sữa và thức uống giải khát đa dạng.',
     'Phục vụ trà sữa, nước ép trái cây tươi và sinh tố.',
     'Trà Sữa Vĩnh Khánh — trà sữa trân châu, nước ép bưởi, sinh tố bơ. Giải nhiệt Sài Gòn.',
     '["Trà sữa trân châu","Nước ép bưởi","Sinh tố bơ"]'),
    (10, 2, 'Bubble Tea Vĩnh Khánh',
     'Diverse bubble tea and refreshment shop.',
     'Serves bubble teas, fresh fruit juices, and smoothies.',
     'Bubble Tea Vinh Khanh — pearl bubble tea, pomelo juice, avocado smoothie. Perfect for hot Saigon weather.',
     '["Pearl bubble tea","Pomelo juice","Avocado smoothie"]');

-- ============================================================================
-- 8. THỰC ĐƠN — Quán Ốc Đào
-- ============================================================================

INSERT INTO `POIMenuItems`
    (`Id`, `POIId`, `Price`, `IsAvailable`, `IsSignature`, `SortOrder`)
VALUES
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

INSERT INTO `MenuItemTranslations` (`MenuItemId`, `LanguageId`, `Name`, `Description`) VALUES
    (1,  1, 'Ốc hương nướng mỡ hành',     'Ốc hương tươi nướng với mỡ hành phi thơm'),
    (2,  1, 'Ốc len xào dừa',              'Ốc len xào với nước cốt dừa béo ngậy'),
    (3,  1, 'Sò điệp nướng phô mai',       'Sò điệp tươi nướng phô mai tan chảy'),
    (4,  1, 'Nghêu hấp sả',                'Nghêu hấp với sả và lá chanh'),
    (5,  1, 'Ốc mỡ xào tỏi',              'Ốc mỡ béo xào tỏi phi giòn'),
    (6,  1, 'Cua rang me',                  'Cua biển rang với sốt me chua ngọt'),
    (7,  1, 'Sò huyết nướng',              'Sò huyết nướng mỡ hành'),
    (8,  1, 'Ốc bươu luộc sả',             'Ốc bươu luộc nguyên con với sả'),
    (9,  1, 'Tôm sú nướng muối ớt',        'Tôm sú size lớn nướng muối ớt'),
    (10, 1, 'Mực nướng sa tế',             'Mực tươi nướng sốt sa tế cay'),
    (1,  2, 'Grilled Horn Snails with Scallion Oil',  'Fresh horn snails grilled with fragrant scallion oil'),
    (2,  2, 'Coconut-Sautéed Snails',                 'Snails sautéed in rich coconut cream'),
    (3,  2, 'Baked Scallops with Cheese',              'Fresh scallops baked with melted cheese'),
    (4,  2, 'Lemongrass Steamed Clams',                'Clams steamed with lemongrass and kaffir lime'),
    (5,  2, 'Garlic Butter Snails',                    'Plump snails sautéed with crispy fried garlic'),
    (6,  2, 'Tamarind Crab',                           'Sea crab in sweet & sour tamarind sauce'),
    (7,  2, 'Grilled Blood Cockles',                   'Blood cockles grilled with scallion oil'),
    (8,  2, 'Lemongrass Boiled Apple Snails',          'Whole apple snails boiled with lemongrass'),
    (9,  2, 'Salt & Chili Grilled Tiger Prawns',       'Large tiger prawns with salt and chili'),
    (10, 2, 'Satay Grilled Squid',                     'Fresh squid with spicy satay sauce');

-- ============================================================================
-- 9. CÀI ĐẶT USER
-- ============================================================================

INSERT INTO `UserSettings`
    (`UserId`, `PreferredLanguageId`, `NarrationMode`, `AutoPlayEnabled`,
     `CooldownMinutes`, `GeofenceSensitivity`, `Volume`, `PlaybackSpeed`)
VALUES
    (4, 4, 0, 1, 30, 1, 0.80, 1.00),
    (5, 2, 0, 1, 30, 1, 0.80, 1.00),
    (6, 1, 0, 1, 20, 2, 0.90, 1.00);

-- ============================================================================
-- 10. AUDIO MẪU (metadata)
-- ============================================================================

INSERT INTO `AudioNarrations`
    (`POIId`, `LanguageId`, `FileUrl`, `FileName`, `FileSize`,
     `DurationSeconds`, `MimeType`, `VoiceType`, `VoiceName`, `IsDefault`, `IsActive`)
VALUES
    (1, 1, '/audio/vi/oc-dao-recorded.mp3',     'oc-dao-recorded.mp3',     2457600, 45, 'audio/mpeg', 0, NULL,                     1, 1),
    (1, 1, '/audio/vi/oc-dao-tts.mp3',          'oc-dao-tts.mp3',          1843200, 42, 'audio/mpeg', 1, 'vi-VN-HoaiMyNeural',     0, 1),
    (1, 2, '/audio/en/oc-dao-en.mp3',           'oc-dao-en.mp3',           2048000, 48, 'audio/mpeg', 1, 'en-US-JennyNeural',      1, 1),
    (2, 1, '/audio/vi/ba-hien-recorded.mp3',    'ba-hien-recorded.mp3',    1945600, 38, 'audio/mpeg', 0, NULL,                     1, 1),
    (2, 2, '/audio/en/ba-hien-en.mp3',          'ba-hien-en.mp3',          1740800, 40, 'audio/mpeg', 1, 'en-US-JennyNeural',      1, 1),
    (6, 1, '/audio/vi/bun-rieu-recorded.mp3',   'bun-rieu-recorded.mp3',   2150400, 42, 'audio/mpeg', 0, NULL,                     1, 1),
    (6, 2, '/audio/en/bun-rieu-en.mp3',         'bun-rieu-en.mp3',         2355200, 50, 'audio/mpeg', 1, 'en-US-JennyNeural',      1, 1),
    (9, 1, '/audio/vi/che-ba-tu-recorded.mp3',  'che-ba-tu-recorded.mp3',  1638400, 35, 'audio/mpeg', 0, NULL,                     1, 1),
    (9, 2, '/audio/en/che-ba-tu-en.mp3',        'che-ba-tu-en.mp3',        1536000, 36, 'audio/mpeg', 1, 'en-US-JennyNeural',      1, 1);

-- ============================================================================
-- 11. GÓI OFFLINE
-- ============================================================================

INSERT INTO `OfflinePackages`
    (`LanguageId`, `Name`, `Description`, `Version`,
     `TotalSizeBytes`, `POICount`, `AudioCount`, `ImageCount`, `DownloadUrl`, `Checksum`)
VALUES
    (1, 'Vĩnh Khánh Pack - Tiếng Việt', 'Gói đầy đủ tiếng Việt', 1, 52428800, 10, 10, 30, '/offline/vinh-khanh-vi-v1.zip', 'a1b2c3d4e5f6'),
    (2, 'Vĩnh Khánh Pack - English',    'Full English pack',      1, 48234496, 10, 10, 30, '/offline/vinh-khanh-en-v1.zip', 'f6e5d4c3b2a1');

-- ============================================================================
-- 12. LỊCH SỬ GHÉ THĂM MẪU
-- ============================================================================

INSERT INTO `VisitHistory`
    (`UserId`, `POIId`, `VisitedAt`, `TriggerType`, `NarrationPlayed`,
     `NarrationType`, `AudioNarrationId`, `DurationListened`,
     `UserLatitude`, `UserLongitude`, `DeviceInfo`, `IsSynced`)
VALUES
    (5, 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), 0, 1, 1, 3, 48, 10.7537500, 106.6931800, 'Android 14 / Samsung S24', 1),
    (4, 9, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), 0, 1, 0, 8, 35, 10.7534200, 106.6927300, 'iOS 18 / iPhone 16', 1),
    (6, 6, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 45 MINUTE), 2, 1, 0, 6, 42, 10.7541200, 106.6937100, 'Android 15 / Xiaomi 14', 1);

SELECT '✅ TẤT CẢ DỮ LIỆU MẪU ĐÃ ĐƯỢC TẠO THÀNH CÔNG!' AS Status;
