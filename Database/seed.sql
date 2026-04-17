USE VinhKhanhFoodTour;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `VisitHistory`;
DELETE FROM `SyncLogs`;
DELETE FROM `UserSettings`;
DELETE FROM `AudioNarrations`;
DELETE FROM `MenuItemTranslations`;
DELETE FROM `POITranslations`;
DELETE FROM `POIMedia`;
DELETE FROM `POIMenuItems`;
DELETE FROM `POIs`;
DELETE FROM `OfflinePackages`;
DELETE FROM `SystemSettings`;
DELETE FROM `CategoryTranslations`;
DELETE FROM `Categories`;
DELETE FROM `Users`;
DELETE FROM `Languages`;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- Languages (VI + EN only)
-- =========================
INSERT INTO `Languages` (Id, Code, Name, NativeName, TtsCode, IsActive, SortOrder, FlagEmoji)
VALUES
  (1, 'vi', 'Vietnamese', 'Tiếng Việt', 'vi-VN-HoaiMyNeural', 1, 1, '🇻🇳'),
  (2, 'en', 'English', 'English', 'en-US-JennyNeural', 1, 2, '🇬🇧');

-- =========================
-- Categories (~10)
-- =========================
INSERT INTO `Categories` (Id, Icon, Color, SortOrder, IsActive)
VALUES
  (1,  'cat_01', '#FF6B35',  1, 1),
  (2,  'cat_02', '#2EC4B6',  2, 1),
  (3,  'cat_03', '#E71D36',  3, 1),
  (4,  'cat_04', '#FF9F1C',  4, 1),
  (5,  'cat_05', '#CB997E',  5, 1),
  (6,  'cat_06', '#6A4C93',  6, 1),
  (7,  'cat_07', '#F25C54',  7, 1),
  (8,  'cat_08', '#43AA8B',  8, 1),
  (9,  'cat_09', '#F3722C',  9, 1),
  (10, 'cat_10', '#4D908E',  10, 1);

INSERT INTO `CategoryTranslations` (CategoryId, LanguageId, Name, Description)
VALUES
  (1, 1, 'Nhóm đồ ăn 01',  'Mô tả nhóm đồ ăn 01'),
  (2, 1, 'Nhóm đồ ăn 02',  'Mô tả nhóm đồ ăn 02'),
  (3, 1, 'Nhóm đồ ăn 03',  'Mô tả nhóm đồ ăn 03'),
  (4, 1, 'Nhóm đồ ăn 04',  'Mô tả nhóm đồ ăn 04'),
  (5, 1, 'Nhóm đồ ăn 05',  'Mô tả nhóm đồ ăn 05'),
  (6, 1, 'Nhóm đồ ăn 06',  'Mô tả nhóm đồ ăn 06'),
  (7, 1, 'Nhóm đồ ăn 07',  'Mô tả nhóm đồ ăn 07'),
  (8, 1, 'Nhóm đồ ăn 08',  'Mô tả nhóm đồ ăn 08'),
  (9, 1, 'Nhóm đồ ăn 09',  'Mô tả nhóm đồ ăn 09'),
  (10,1, 'Nhóm đồ ăn 10',  'Mô tả nhóm đồ ăn 10'),

  (1, 2, 'Food Group 01',  'Description for food group 01'),
  (2, 2, 'Food Group 02',  'Description for food group 02'),
  (3, 2, 'Food Group 03',  'Description for food group 03'),
  (4, 2, 'Food Group 04',  'Description for food group 04'),
  (5, 2, 'Food Group 05',  'Description for food group 05'),
  (6, 2, 'Food Group 06',  'Description for food group 06'),
  (7, 2, 'Food Group 07',  'Description for food group 07'),
  (8, 2, 'Food Group 08',  'Description for food group 08'),
  (9, 2, 'Food Group 09',  'Description for food group 09'),
  (10,2, 'Food Group 10',  'Description for food group 10');

-- =========================
-- Users (~10)
-- Role: 0=Customer, 1=Vendor, 2=Admin (the CK_Users_Role allows 0,1,2)
-- =========================
INSERT INTO `Users` (Id, Username, Email, PasswordHash, FullName, AvatarUrl, Role, PreferredLanguageId, IsActive, EmailConfirmed)
VALUES
  (1,  'admin',        'admin@vinhkhanh.app',  '100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Admin Account',  NULL, 2, 1, 1, 1),
  (2,  'vendor_a',    'vendor_a@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Vendor A',      NULL, 1, 1, 1, 1),
  (3,  'vendor_b',    'vendor_b@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Vendor B',      NULL, 1, 2, 1, 1),
  (4,  'customer_01', 'customer_01@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 01',  NULL, 0, 1, 1, 1),
  (5,  'customer_02', 'customer_02@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 02',  NULL, 0, 2, 1, 1),
  (6,  'customer_03', 'customer_03@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 03',  NULL, 0, 1, 1, 1),
  (7,  'customer_04', 'customer_04@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 04',  NULL, 0, 2, 1, 1),
  (8,  'customer_05', 'customer_05@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 05',  NULL, 0, 1, 1, 1),
  (9,  'customer_06', 'customer_06@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 06',  NULL, 0, 2, 1, 1),
  (10, 'customer_07', 'customer_07@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=', 'Customer 07',  NULL, 0, 1, 1, 1);

-- =========================
-- POIs (~10)
-- =========================
INSERT INTO `POIs`
  (Id, VendorId, CategoryId, Latitude, Longitude, GeofenceRadiusMeters, Priority, Address, PhoneNumber, Website,
   OpeningHours, PriceRangeMin, PriceRangeMax, Rating, TotalVisits, TotalRatings, IsActive, IsFeatured, GeofenceRadius, Phone, VendorUserId)
VALUES
  (1,  2,  1, 10.7538000, 106.6932000, 25, 1,  '149 Vinh Khanh - POI 01', '0901 000 001', NULL, NULL, 50000, 200000, 4.50, 10, 2, 1, 1, 25, NULL, 2),
  (2,  2,  2, 10.7535000, 106.6928000, 25, 2,  '115 Vinh Khanh - POI 02', '0901 000 002', NULL, NULL, 40000, 180000, 4.30, 8, 1,  1, 1, 25, NULL, 2),
  (3,  2,  3, 10.7540000, 106.6935000, 30, 3,  '40 Vinh Khanh - POI 03',  '0901 000 003', NULL, NULL, 30000, 150000, 4.20, 12, 3, 1, 0, 25, NULL, 2),
  (4,  2,  4, 10.7536500, 106.6930000, 25, 4,  '152 Vinh Khanh - POI 04', '0901 000 004', NULL, NULL, 45000, 190000, 4.40, 6,  1,  1, 1, 25, NULL, 2),
  (5,  2,  5, 10.7533000, 106.6926000, 30, 5,  '98 Vinh Khanh - POI 05',  NULL,           NULL, NULL, 60000, 300000, 4.10, 4,  0,  1, 0, 25, NULL, 2),

  (6,  3,  6, 10.7541000, 106.6937000, 20, 6,  '56 Vinh Khanh - POI 06',  NULL,           NULL, NULL, 25000,  45000,  4.60, 9,  2,  1, 0, 25, NULL, 3),
  (7,  3,  7, 10.7537000, 106.6929500, 25, 7,  '125 Vinh Khanh - POI 07', '0901 000 007', NULL, NULL, 80000, 250000, 4.00, 7,  1,  1, 0, 25, NULL, 3),
  (8,  3,  8, 10.7539000, 106.6933500, 25, 8,  '75 Vinh Khanh - POI 08',  NULL,           NULL, NULL, 40000, 160000, 4.15, 3,  0,  1, 0, 25, NULL, 3),
  (9,  3,  9, 10.7534000, 106.6927500, 15, 9,  '110 Vinh Khanh - POI 09', NULL,           NULL, NULL, 15000,  35000,  4.70, 11, 4, 1, 0, 25, NULL, 3),
  (10, 3,  10,10.7542000, 106.6938000, 15, 10, '30 Vinh Khanh - POI 10',  NULL,           NULL, NULL, 20000,  55000,  4.25, 5,  1,  1, 0, 25, NULL, 3);

-- =========================
-- POITranslations (~20 = 10 POIs x 2 languages)
-- =========================
INSERT INTO `POITranslations` (POIId, LanguageId, Name, ShortDescription, FullDescription, NarrationText, Highlights)
VALUES
  (1, 1, 'Địa điểm 01',  'Mô tả ngắn 01', 'Mô tả đầy đủ địa điểm 01.', 'Chào mừng đến với địa điểm 01.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (1, 2, 'Place 01',      'Short description 01','Full description of place 01.', 'Welcome to place 01.',        '["Highlight 1","Highlight 2"]'),

  (2, 1, 'Địa điểm 02',  'Mô tả ngắn 02', 'Mô tả đầy đủ địa điểm 02.', 'Chào mừng đến với địa điểm 02.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (2, 2, 'Place 02',      'Short description 02','Full description of place 02.', 'Welcome to place 02.',        '["Highlight 1","Highlight 2"]'),

  (3, 1, 'Địa điểm 03',  'Mô tả ngắn 03', 'Mô tả đầy đủ địa điểm 03.', 'Chào mừng đến với địa điểm 03.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (3, 2, 'Place 03',      'Short description 03','Full description of place 03.', 'Welcome to place 03.',        '["Highlight 1","Highlight 2"]'),

  (4, 1, 'Địa điểm 04',  'Mô tả ngắn 04', 'Mô tả đầy đủ địa điểm 04.', 'Chào mừng đến với địa điểm 04.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (4, 2, 'Place 04',      'Short description 04','Full description of place 04.', 'Welcome to place 04.',        '["Highlight 1","Highlight 2"]'),

  (5, 1, 'Địa điểm 05',  'Mô tả ngắn 05', 'Mô tả đầy đủ địa điểm 05.', 'Chào mừng đến với địa điểm 05.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (5, 2, 'Place 05',      'Short description 05','Full description of place 05.', 'Welcome to place 05.',        '["Highlight 1","Highlight 2"]'),

  (6, 1, 'Địa điểm 06',  'Mô tả ngắn 06', 'Mô tả đầy đủ địa điểm 06.', 'Chào mừng đến với địa điểm 06.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (6, 2, 'Place 06',      'Short description 06','Full description of place 06.', 'Welcome to place 06.',        '["Highlight 1","Highlight 2"]'),

  (7, 1, 'Địa điểm 07',  'Mô tả ngắn 07', 'Mô tả đầy đủ địa điểm 07.', 'Chào mừng đến với địa điểm 07.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (7, 2, 'Place 07',      'Short description 07','Full description of place 07.', 'Welcome to place 07.',        '["Highlight 1","Highlight 2"]'),

  (8, 1, 'Địa điểm 08',  'Mô tả ngắn 08', 'Mô tả đầy đủ địa điểm 08.', 'Chào mừng đến với địa điểm 08.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (8, 2, 'Place 08',      'Short description 08','Full description of place 08.', 'Welcome to place 08.',        '["Highlight 1","Highlight 2"]'),

  (9, 1, 'Địa điểm 09',  'Mô tả ngắn 09', 'Mô tả đầy đủ địa điểm 09.', 'Chào mừng đến với địa điểm 09.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (9, 2, 'Place 09',      'Short description 09','Full description of place 09.', 'Welcome to place 09.',        '["Highlight 1","Highlight 2"]'),

  (10,1, 'Địa điểm 10',  'Mô tả ngắn 10', 'Mô tả đầy đủ địa điểm 10.', 'Chào mừng đến với địa điểm 10.',  '["Điểm nhấn 1","Điểm nhấn 2"]'),
  (10,2, 'Place 10',      'Short description 10','Full description of place 10.', 'Welcome to place 10.',        '["Highlight 1","Highlight 2"]');

-- =========================
-- POIMenuItems (~10)
-- =========================
INSERT INTO `POIMenuItems` (Id, POIId, Price, ImageUrl, IsAvailable, IsSignature, SortOrder)
VALUES
  (1,  1,  65000, '/images/dish-01.png', 1, 1, 1),
  (2,  2,  72000, '/images/dish-02.png', 1, 0, 2),
  (3,  3,  55000, '/images/dish-03.png', 1, 0, 3),
  (4,  4,  80000, '/images/dish-04.png', 1, 1, 4),
  (5,  5,  60000, '/images/dish-05.png', 1, 0, 5),
  (6,  6,  45000, '/images/dish-06.png', 1, 0, 6),
  (7,  7,  90000, '/images/dish-07.png', 1, 1, 7),
  (8,  8,  52000, '/images/dish-08.png', 1, 0, 8),
  (9,  9,  35000, '/images/dish-09.png', 1, 0, 9),
  (10,10,  78000, '/images/dish-10.png', 1, 1, 10);

-- MenuItemTranslations (~20 = 10 menu items x 2 languages)
INSERT INTO `MenuItemTranslations` (MenuItemId, LanguageId, Name, Description)
VALUES
  (1, 1,  'Món ăn 01',  'Mô tả món ăn 01'),
  (1, 2,  'Dish 01',     'Description for dish 01'),

  (2, 1,  'Món ăn 02',  'Mô tả món ăn 02'),
  (2, 2,  'Dish 02',     'Description for dish 02'),

  (3, 1,  'Món ăn 03',  'Mô tả món ăn 03'),
  (3, 2,  'Dish 03',     'Description for dish 03'),

  (4, 1,  'Món ăn 04',  'Mô tả món ăn 04'),
  (4, 2,  'Dish 04',     'Description for dish 04'),

  (5, 1,  'Món ăn 05',  'Mô tả món ăn 05'),
  (5, 2,  'Dish 05',     'Description for dish 05'),

  (6, 1,  'Món ăn 06',  'Mô tả món ăn 06'),
  (6, 2,  'Dish 06',     'Description for dish 06'),

  (7, 1,  'Món ăn 07',  'Mô tả món ăn 07'),
  (7, 2,  'Dish 07',     'Description for dish 07'),

  (8, 1,  'Món ăn 08',  'Mô tả món ăn 08'),
  (8, 2,  'Dish 08',     'Description for dish 08'),

  (9, 1,  'Món ăn 09',  'Mô tả món ăn 09'),
  (9, 2,  'Dish 09',     'Description for dish 09'),

  (10,1, 'Món ăn 10',  'Mô tả món ăn 10'),
  (10,2, 'Dish 10',     'Description for dish 10');

-- =========================
-- POIMedia (~10)
-- =========================
INSERT INTO `POIMedia` (Id, POIId, MediaType, FileUrl, FileName, FileSize, MimeType, Width, Height, Caption, SortOrder, IsPrimary)
VALUES
  (1,  1, 0, '/images/poi-01.jpg',  'poi-01.jpg',  150000, 'image/jpeg', 800, 600, 'POI 01 thumbnail', 0, 1),
  (2,  2, 0, '/images/poi-02.jpg',  'poi-02.jpg',  140000, 'image/jpeg', 800, 600, 'POI 02 thumbnail', 0, 1),
  (3,  3, 0, '/images/poi-03.jpg',  'poi-03.jpg',  160000, 'image/jpeg', 800, 600, 'POI 03 thumbnail', 0, 1),
  (4,  4, 0, '/images/poi-04.jpg',  'poi-04.jpg',  155000, 'image/jpeg', 800, 600, 'POI 04 thumbnail', 0, 1),
  (5,  5, 0, '/images/poi-05.jpg',  'poi-05.jpg',  145000, 'image/jpeg', 800, 600, 'POI 05 thumbnail', 0, 1),
  (6,  6, 0, '/images/poi-06.jpg',  'poi-06.jpg',  165000, 'image/jpeg', 800, 600, 'POI 06 thumbnail', 0, 1),
  (7,  7, 0, '/images/poi-07.jpg',  'poi-07.jpg',  135000, 'image/jpeg', 800, 600, 'POI 07 thumbnail', 0, 1),
  (8,  8, 0, '/images/poi-08.jpg',  'poi-08.jpg',  148000, 'image/jpeg', 800, 600, 'POI 08 thumbnail', 0, 1),
  (9,  9, 0, '/images/poi-09.jpg',  'poi-09.jpg',  172000, 'image/jpeg', 800, 600, 'POI 09 thumbnail', 0, 1),
  (10,10, 0, '/images/poi-10.jpg',  'poi-10.jpg',  158000, 'image/jpeg', 800, 600, 'POI 10 thumbnail', 0, 1);

-- =========================
-- UserSettings (~10)
-- =========================
INSERT INTO `UserSettings` (UserId, PreferredLanguageId, NarrationMode, AutoPlayEnabled, CooldownMinutes, GeofenceSensitivity, Volume, PlaybackSpeed, ShowNotifications, VibrationEnabled)
VALUES
  (1,  1, 0, 1, 30, 1, 0.80, 1.00, 1, 1),
  (2,  1, 1, 1, 20, 2, 0.75, 1.05, 1, 1),
  (3,  2, 2, 0, 25, 1, 0.85, 1.10, 1, 0),
  (4,  1, 0, 1, 35, 1, 0.70, 0.95, 0, 1),
  (5,  2, 1, 1, 30, 2, 0.90, 1.20, 1, 1),
  (6,  1, 2, 0, 60, 1, 0.65, 1.00, 0, 0),
  (7,  2, 3, 1, 45, 2, 0.78, 1.15, 1, 1),
  (8,  1, 1, 1, 25, 0, 0.82, 1.05, 1, 0),
  (9,  2, 2, 0, 40, 2, 0.88, 1.30, 0, 1),
  (10, 1, 0, 1, 22, 1, 0.76, 1.00, 1, 1);

-- =========================
-- VisitHistory (~10)
-- =========================
INSERT INTO `VisitHistory`
  (UserId, POIId, LanguageId, TriggerType, NarrationPlayed, NarrationType, AudioNarrationId, DurationListened,
   UserLatitude, UserLongitude, DeviceInfo, IsSynced)
VALUES
  (4,  1, 1, 0, 1, 0,  NULL, 40, 10.7538000, 106.6932000, 'Android (seed)', 1),
  (5,  2, 2, 2, 1, 1,  NULL, 44, 10.7535000, 106.6928000, 'iOS (seed)',     0),

  (6,  3, 1, 1, 1, 0,  NULL, 42, 10.7540000, 106.6935000, 'Android (seed)', 1),
  (7,  4, 2, 0, 1, 1,  NULL, 43, 10.7536500, 106.6930000, 'iOS (seed)',     1),

  (8,  5, 1, 2, 0, 0,  NULL, 41, 10.7533000, 106.6926000, 'Android (seed)', 0),
  (9,  6, 2, 1, 1, 1,  NULL, 48, 10.7541000, 106.6937000, 'iOS (seed)',     1),

  (10, 7, 1, 3, 1, 0,  NULL, 37, 10.7537000, 106.6929500, 'Android (seed)', 1),
  (4,  8, 2, 2, 1, 1,  NULL, 46, 10.7539000, 106.6933500, 'iOS (seed)',     0),

  (5,  9, 1, 0, 0, 0,  NULL, 41, 10.7534000, 106.6927500, 'Android (seed)', 1),
  (6, 10, 2, 2, 1, 1,  NULL, 44, 10.7542000, 106.6938000, 'iOS (seed)',     1);

-- =========================
-- OfflinePackages (~10)
-- (LanguageId: only 1 or 2)
-- =========================
INSERT INTO `OfflinePackages` (Id, LanguageId, Name, Description, Version, TotalSizeBytes, POICount, AudioCount, ImageCount, DownloadUrl, IsActive, Status, Progress, CurrentStep, DownloadCount)
VALUES
  (1,  1, 'Offline VI Pack 01', 'Package for VI (01)', 1, 120000000, 10, 10, 10, '/offline/vi/pack01.zip', 1, 0, 0, 'init', 0),
  (2,  1, 'Offline VI Pack 02', 'Package for VI (02)', 1, 130000000, 10, 10, 10, '/offline/vi/pack02.zip', 1, 0, 0, 'init', 0),
  (3,  1, 'Offline VI Pack 03', 'Package for VI (03)', 1, 125000000, 10, 10, 10, '/offline/vi/pack03.zip', 1, 0, 0, 'init', 0),
  (4,  1, 'Offline VI Pack 04', 'Package for VI (04)', 1, 128000000, 10, 10, 10, '/offline/vi/pack04.zip', 1, 0, 0, 'init', 0),
  (5,  1, 'Offline VI Pack 05', 'Package for VI (05)', 1, 140000000, 10, 10, 10, '/offline/vi/pack05.zip', 1, 0, 0, 'init', 0),

  (6,  2, 'Offline EN Pack 01', 'Package for EN (01)', 1, 118000000, 10, 10, 10, '/offline/en/pack01.zip', 1, 0, 0, 'init', 0),
  (7,  2, 'Offline EN Pack 02', 'Package for EN (02)', 1, 127000000, 10, 10, 10, '/offline/en/pack02.zip', 1, 0, 0, 'init', 0),
  (8,  2, 'Offline EN Pack 03', 'Package for EN (03)', 1, 121000000, 10, 10, 10, '/offline/en/pack03.zip', 1, 0, 0, 'init', 0),
  (9,  2, 'Offline EN Pack 04', 'Package for EN (04)', 1, 132000000, 10, 10, 10, '/offline/en/pack04.zip', 1, 0, 0, 'init', 0),
  (10, 2, 'Offline EN Pack 05', 'Package for EN (05)', 1, 138000000, 10, 10, 10, '/offline/en/pack05.zip', 1, 0, 0, 'init', 0);

-- =========================
-- SystemSettings (~10)
-- =========================
INSERT INTO `SystemSettings` (Key, Value, Description)
VALUES
  ('Audio.BaseUrl', '/audio', 'Base URL for audio assets'),
  ('Media.BaseUrl', '/images', 'Base URL for images'),
  ('Offline.Provider', 'local', 'Offline provider mode'),
  ('Offline.Version', '1', 'Default offline version'),
  ('Default.LanguageId', '1', 'Preferred default language'),
  ('TTS.DefaultVoice', 'en-US-JennyNeural', 'Default TTS voice'),
  ('App.Cooldown.Default', '30', 'Default cooldown minutes'),
  ('App.Geofence.Sensitivity.Default', '1', 'Default geofence sensitivity'),
  ('App.PlaybackSpeed.Default', '1.00', 'Default playback speed'),
  ('App.Volume.Default', '0.80', 'Default volume');

-- =========================
-- SyncLogs (~10)
-- =========================
INSERT INTO `SyncLogs` (UserId, DeviceId, EntityType, EntityId, Action, RecordCount, DataSizeBytes, Status, ErrorMessage)
VALUES
  (4,  'dev-01', 'POI',   1,  'SYNC', 1, 500000, 0, NULL),
  (5,  'dev-02', 'POI',   2,  'SYNC', 1, 420000, 1, NULL),
  (6,  'dev-03', 'POI',   3,  'SYNC', 1, 610000, 0, NULL),
  (7,  'dev-04', 'POI',   4,  'SYNC', 1, 350000, 2, NULL),
  (8,  'dev-05', 'POI',   5,  'SYNC', 1, 540000, 0, NULL),

  (9,  'dev-06', 'AUDIO', 12, 'SYNC', 1, 900000, 1, NULL),
  (10, 'dev-07', 'AUDIO', 14, 'SYNC', 1, 880000, 0, NULL),
  (4,  'dev-08', 'VISIT',  3,  'SYNC', 1, 150000, 0, NULL),
  (5,  'dev-09', 'VISIT',  4,  'SYNC', 1, 160000, 3, NULL),
  (6,  'dev-10', 'MENU',   8,  'SYNC', 1, 120000, 0, NULL);