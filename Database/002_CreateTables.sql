-- ============================================================================
-- 002_CreateTables.sql (MySQL)
-- Tạo toàn bộ bảng cho hệ thống Thuyết minh Phố Ẩm Thực Vĩnh Khánh
-- ============================================================================

USE `VinhKhanhFoodTour`;

-- ============================================================================
-- 1. BẢNG LANGUAGES — Ngôn ngữ hỗ trợ
-- ============================================================================

CREATE TABLE `Languages` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `Code`          VARCHAR(10)     NOT NULL,           -- ISO 639-1: 'vi', 'en'
    `Name`          VARCHAR(50)     NOT NULL,           -- 'Vietnamese', 'English'
    `NativeName`    VARCHAR(50)     NOT NULL,           -- 'Tiếng Việt'
    `TtsCode`       VARCHAR(20)     NULL,               -- 'vi-VN', 'en-US'
    `IsActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    `SortOrder`     INT             NOT NULL DEFAULT 0,
    `CreatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_Languages_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. BẢNG USERS — Người dùng (Khách, Chủ quán, Admin)
-- ============================================================================

CREATE TABLE `Users` (
    `Id`                    INT             NOT NULL AUTO_INCREMENT,
    `Username`              VARCHAR(100)    NOT NULL,
    `Email`                 VARCHAR(255)    NOT NULL,
    `PasswordHash`          VARCHAR(512)    NOT NULL,
    `Phone`                 VARCHAR(20)     NULL,
    `FullName`              VARCHAR(200)    NULL,
    `AvatarUrl`             VARCHAR(500)    NULL,
    `Role`                  TINYINT         NOT NULL DEFAULT 0,
        -- 0 = Customer  (Khách du lịch - dùng Mobile App)
        -- 1 = Vendor    (Chủ quán - quản lý qua Web)
        -- 2 = Admin     (Quản trị viên - quản lý toàn hệ thống)
    `PreferredLanguageId`   INT             NULL,
    `IsActive`              TINYINT(1)      NOT NULL DEFAULT 1,
    `EmailConfirmed`        TINYINT(1)      NOT NULL DEFAULT 0,
    `RefreshToken`          VARCHAR(512)    NULL,
    `RefreshTokenExpiry`    DATETIME        NULL,
    `LastLoginAt`           DATETIME        NULL,
    `CreatedAt`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_Users_Email` (`Email`),
    UNIQUE KEY `UQ_Users_Username` (`Username`),
    CONSTRAINT `FK_Users_PreferredLanguage` FOREIGN KEY (`PreferredLanguageId`)
        REFERENCES `Languages`(`Id`) ON DELETE SET NULL,
    CONSTRAINT `CK_Users_Role` CHECK (`Role` IN (0, 1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. BẢNG CATEGORIES — Danh mục loại quán ăn
-- ============================================================================

CREATE TABLE `Categories` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `Icon`          VARCHAR(50)     NOT NULL,           -- Emoji: '🍜'
    `Color`         VARCHAR(7)      NULL,                -- Hex: '#FF6B35'
    `SortOrder`     INT             NOT NULL DEFAULT 0,
    `IsActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    `CreatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. BẢNG CATEGORYTRANSLATIONS — Tên danh mục đa ngôn ngữ
-- ============================================================================

CREATE TABLE `CategoryTranslations` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `CategoryId`    INT             NOT NULL,
    `LanguageId`    INT             NOT NULL,
    `Name`          VARCHAR(100)    NOT NULL,
    `Description`   VARCHAR(500)    NULL,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_CatTrans_CatLang` (`CategoryId`, `LanguageId`),
    CONSTRAINT `FK_CatTrans_Category` FOREIGN KEY (`CategoryId`)
        REFERENCES `Categories`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_CatTrans_Language` FOREIGN KEY (`LanguageId`)
        REFERENCES `Languages`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. BẢNG POIS — Điểm ăn uống (Point of Interest) ⭐ BẢNG TRUNG TÂM
-- ============================================================================

CREATE TABLE `POIs` (
    `Id`                    INT             NOT NULL AUTO_INCREMENT,
    `VendorUserId`          INT             NULL,
    `CategoryId`            INT             NOT NULL,
    `Latitude`              DECIMAL(10, 7)  NOT NULL,       -- 10.7538000
    `Longitude`             DECIMAL(10, 7)  NOT NULL,       -- 106.6932000
    `GeofenceRadius`        INT             NOT NULL DEFAULT 30,
        -- Bán kính Geofence (mét). Phố ẩm thực nên dùng 20-40m
    `Address`               VARCHAR(300)    NOT NULL,
    `Phone`                 VARCHAR(20)     NULL,
    `Website`               VARCHAR(500)    NULL,
    `OpeningHours`          JSON            NULL,
        -- JSON: {"mon":"08:00-22:00","tue":"08:00-22:00",...}
    `PriceRangeMin`         DECIMAL(12, 0)  NULL,           -- VNĐ
    `PriceRangeMax`         DECIMAL(12, 0)  NULL,
    `Rating`                DECIMAL(3, 2)   NULL DEFAULT 0.00,
    `TotalVisits`           INT             NOT NULL DEFAULT 0,
    `TotalRatings`          INT             NOT NULL DEFAULT 0,
    `IsActive`              TINYINT(1)      NOT NULL DEFAULT 1,
    `IsFeatured`            TINYINT(1)      NOT NULL DEFAULT 0,
    `CreatedAt`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_POIs_Vendor` FOREIGN KEY (`VendorUserId`)
        REFERENCES `Users`(`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_POIs_Category` FOREIGN KEY (`CategoryId`)
        REFERENCES `Categories`(`Id`),
    CONSTRAINT `CK_POIs_Latitude` CHECK (`Latitude` BETWEEN -90.0 AND 90.0),
    CONSTRAINT `CK_POIs_Longitude` CHECK (`Longitude` BETWEEN -180.0 AND 180.0),
    CONSTRAINT `CK_POIs_GeofenceRadius` CHECK (`GeofenceRadius` BETWEEN 10 AND 500),
    CONSTRAINT `CK_POIs_Rating` CHECK (`Rating` BETWEEN 0.00 AND 5.00),
    CONSTRAINT `CK_POIs_PriceRange` CHECK (`PriceRangeMin` IS NULL OR `PriceRangeMax` IS NULL
        OR `PriceRangeMin` <= `PriceRangeMax`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. BẢNG POITRANSLATIONS — Nội dung thuyết minh đa ngôn ngữ
-- ============================================================================

CREATE TABLE `POITranslations` (
    `Id`                INT             NOT NULL AUTO_INCREMENT,
    `POIId`             INT             NOT NULL,
    `LanguageId`        INT             NOT NULL,
    `Name`              VARCHAR(200)    NOT NULL,
    `ShortDescription`  VARCHAR(500)    NOT NULL,
    `FullDescription`   TEXT            NOT NULL,
    `NarrationText`     TEXT            NULL,
        -- Văn bản dành riêng cho TTS (giọng đọc thuyết minh du lịch)
    `Highlights`        JSON            NULL,
        -- JSON array: ["Ốc hương","Sò điệp","Bia tươi"]
    `CreatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_POITrans_POILang` (`POIId`, `LanguageId`),
    CONSTRAINT `FK_POITrans_POI` FOREIGN KEY (`POIId`)
        REFERENCES `POIs`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_POITrans_Language` FOREIGN KEY (`LanguageId`)
        REFERENCES `Languages`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. BẢNG POIMEDIA — Hình ảnh, video cho POI
-- ============================================================================

CREATE TABLE `POIMedia` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `POIId`         INT             NOT NULL,
    `MediaType`     TINYINT         NOT NULL,
        -- 0 = Image, 1 = Video, 2 = Thumbnail360
    `FileUrl`       VARCHAR(500)    NOT NULL,
    `FileName`      VARCHAR(200)    NOT NULL,
    `FileSize`      BIGINT          NOT NULL,
    `MimeType`      VARCHAR(50)     NOT NULL,
    `Width`         INT             NULL,
    `Height`        INT             NULL,
    `Caption`       VARCHAR(300)    NULL,
    `SortOrder`     INT             NOT NULL DEFAULT 0,
    `IsPrimary`     TINYINT(1)      NOT NULL DEFAULT 0,
    `CreatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_POIMedia_POI` FOREIGN KEY (`POIId`)
        REFERENCES `POIs`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `CK_POIMedia_Type` CHECK (`MediaType` IN (0, 1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. BẢNG AUDIONARRATIONS — File âm thanh thuyết minh 🔊
-- ============================================================================

CREATE TABLE `AudioNarrations` (
    `Id`                INT             NOT NULL AUTO_INCREMENT,
    `POIId`             INT             NOT NULL,
    `LanguageId`        INT             NOT NULL,
    `FileUrl`           VARCHAR(500)    NOT NULL,
    `FileName`          VARCHAR(200)    NOT NULL,
    `FileSize`          BIGINT          NOT NULL,
    `DurationSeconds`   INT             NOT NULL,
    `MimeType`          VARCHAR(50)     NOT NULL DEFAULT 'audio/mpeg',
    `VoiceType`         TINYINT         NOT NULL,
        -- 0 = Recorded (ghi âm người thật)
        -- 1 = TTS (Text-to-Speech tự sinh)
    `VoiceName`         VARCHAR(100)    NULL,
        -- Tên giọng TTS: 'vi-VN-HoaiMyNeural'
    `SampleRate`        INT             NULL,
    `BitRate`           INT             NULL,
    `IsDefault`         TINYINT(1)      NOT NULL DEFAULT 0,
    `IsActive`          TINYINT(1)      NOT NULL DEFAULT 1,
    `CreatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Audio_POI` FOREIGN KEY (`POIId`)
        REFERENCES `POIs`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_Audio_Language` FOREIGN KEY (`LanguageId`)
        REFERENCES `Languages`(`Id`),
    CONSTRAINT `CK_Audio_VoiceType` CHECK (`VoiceType` IN (0, 1)),
    CONSTRAINT `CK_Audio_Duration` CHECK (`DurationSeconds` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. BẢNG POIMENUITEMS — Thực đơn quán ăn
-- ============================================================================

CREATE TABLE `POIMenuItems` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `POIId`         INT             NOT NULL,
    `Price`         DECIMAL(12, 0)  NOT NULL,
    `ImageUrl`      VARCHAR(500)    NULL,
    `IsAvailable`   TINYINT(1)      NOT NULL DEFAULT 1,
    `IsSignature`   TINYINT(1)      NOT NULL DEFAULT 0,
    `SortOrder`     INT             NOT NULL DEFAULT 0,
    `CreatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_MenuItem_POI` FOREIGN KEY (`POIId`)
        REFERENCES `POIs`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `CK_MenuItem_Price` CHECK (`Price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. BẢNG MENUITEMTRANSLATIONS — Tên món ăn đa ngôn ngữ
-- ============================================================================

CREATE TABLE `MenuItemTranslations` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `MenuItemId`    INT             NOT NULL,
    `LanguageId`    INT             NOT NULL,
    `Name`          VARCHAR(200)    NOT NULL,
    `Description`   VARCHAR(500)    NULL,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_MenuItemTrans_ItemLang` (`MenuItemId`, `LanguageId`),
    CONSTRAINT `FK_MenuItemTrans_Item` FOREIGN KEY (`MenuItemId`)
        REFERENCES `POIMenuItems`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_MenuItemTrans_Lang` FOREIGN KEY (`LanguageId`)
        REFERENCES `Languages`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. BẢNG USERSETTINGS — Cài đặt cá nhân người dùng
-- ============================================================================

CREATE TABLE `UserSettings` (
    `Id`                    INT             NOT NULL AUTO_INCREMENT,
    `UserId`                INT             NOT NULL,
    `PreferredLanguageId`   INT             NOT NULL,
    `NarrationMode`         TINYINT         NOT NULL DEFAULT 0,
        -- 0=Auto, 1=RecordedOnly, 2=TTSOnly, 3=TextOnly
    `AutoPlayEnabled`       TINYINT(1)      NOT NULL DEFAULT 1,
    `CooldownMinutes`       INT             NOT NULL DEFAULT 30,
    `GeofenceSensitivity`   TINYINT         NOT NULL DEFAULT 1,
        -- 0=Low, 1=Medium, 2=High
    `Volume`                DECIMAL(3, 2)   NOT NULL DEFAULT 0.80,
    `PlaybackSpeed`         DECIMAL(3, 2)   NOT NULL DEFAULT 1.00,
    `ShowNotifications`     TINYINT(1)      NOT NULL DEFAULT 1,
    `VibrationEnabled`      TINYINT(1)      NOT NULL DEFAULT 1,
    `UpdatedAt`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_Settings_UserId` (`UserId`),
    CONSTRAINT `FK_Settings_User` FOREIGN KEY (`UserId`)
        REFERENCES `Users`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_Settings_Lang` FOREIGN KEY (`PreferredLanguageId`)
        REFERENCES `Languages`(`Id`),
    CONSTRAINT `CK_Settings_Mode` CHECK (`NarrationMode` IN (0, 1, 2, 3)),
    CONSTRAINT `CK_Settings_Sensitivity` CHECK (`GeofenceSensitivity` IN (0, 1, 2)),
    CONSTRAINT `CK_Settings_Volume` CHECK (`Volume` BETWEEN 0.00 AND 1.00),
    CONSTRAINT `CK_Settings_Speed` CHECK (`PlaybackSpeed` BETWEEN 0.50 AND 2.00),
    CONSTRAINT `CK_Settings_Cooldown` CHECK (`CooldownMinutes` BETWEEN 5 AND 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. BẢNG VISITHISTORY — Lịch sử ghé thăm POI
-- ============================================================================

CREATE TABLE `VisitHistory` (
    `Id`                BIGINT          NOT NULL AUTO_INCREMENT,
    `UserId`            INT             NOT NULL,
    `POIId`             INT             NOT NULL,
    `LanguageId`        INT             NOT NULL DEFAULT 1,
    `VisitedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `TriggerType`       TINYINT         NOT NULL,
        -- 0=GeofenceEnter, 1=GeofenceExit, 2=ManualTap, 3=ListSelect
    `NarrationPlayed`   TINYINT(1)      NOT NULL DEFAULT 0,
    `NarrationType`     TINYINT         NULL,
        -- 0=Recorded, 1=TTS, NULL=không phát
    `AudioNarrationId`  INT             NULL,
    `DurationListened`  INT             NULL,
    `UserLatitude`      DECIMAL(10, 7)  NULL,
    `UserLongitude`     DECIMAL(10, 7)  NULL,
    `DeviceInfo`        VARCHAR(200)    NULL,
    `IsSynced`          TINYINT(1)      NOT NULL DEFAULT 1,
    `CreatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Visit_User` FOREIGN KEY (`UserId`)
        REFERENCES `Users`(`Id`),
    CONSTRAINT `FK_Visit_POI` FOREIGN KEY (`POIId`)
        REFERENCES `POIs`(`Id`),
    CONSTRAINT `FK_Visit_Language` FOREIGN KEY (`LanguageId`)
        REFERENCES `Languages`(`Id`),
    CONSTRAINT `FK_Visit_Audio` FOREIGN KEY (`AudioNarrationId`)
        REFERENCES `AudioNarrations`(`Id`) ON DELETE SET NULL,
    CONSTRAINT `CK_Visit_Trigger` CHECK (`TriggerType` IN (0, 1, 2, 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. BẢNG SYNCLOGS — Log đồng bộ dữ liệu
-- ============================================================================

CREATE TABLE `SyncLogs` (
    `Id`            BIGINT          NOT NULL AUTO_INCREMENT,
    `UserId`        INT             NOT NULL,
    `DeviceId`      VARCHAR(100)    NULL,
    `EntityType`    VARCHAR(50)     NOT NULL,       -- 'POI', 'Audio', 'VisitHistory'
    `EntityId`      INT             NULL,
    `Action`        VARCHAR(20)     NOT NULL,       -- 'Download', 'Upload', 'Update'
    `RecordCount`   INT             NOT NULL DEFAULT 1,
    `DataSizeBytes` BIGINT          NULL,
    `Status`        TINYINT         NOT NULL DEFAULT 0,
        -- 0=Pending, 1=InProgress, 2=Completed, 3=Failed
    `ErrorMessage`  VARCHAR(1000)   NULL,
    `StartedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CompletedAt`   DATETIME        NULL,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Sync_User` FOREIGN KEY (`UserId`)
        REFERENCES `Users`(`Id`),
    CONSTRAINT `CK_Sync_Status` CHECK (`Status` IN (0, 1, 2, 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. BẢNG OFFLINEPACKAGES — Gói tải về offline
-- ============================================================================

CREATE TABLE `OfflinePackages` (
    `Id`                INT             NOT NULL AUTO_INCREMENT,
    `LanguageId`        INT             NOT NULL,
    `Name`              VARCHAR(100)    NOT NULL,
    `Description`       VARCHAR(500)    NULL,
    `Version`           INT             NOT NULL DEFAULT 1,
    `TotalSizeBytes`    BIGINT          NOT NULL,
    `POICount`          INT             NOT NULL,
    `AudioCount`        INT             NOT NULL,
    `ImageCount`        INT             NOT NULL DEFAULT 0,
    `DownloadUrl`       VARCHAR(500)    NOT NULL,
    `Checksum`          VARCHAR(64)     NULL,
    `IsActive`          TINYINT(1)      NOT NULL DEFAULT 1,
    `CreatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Offline_Lang` FOREIGN KEY (`LanguageId`)
        REFERENCES `Languages`(`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. BẢNG SYSTEMSETTINGS — Cài đặt hệ thống
-- ============================================================================

CREATE TABLE `SystemSettings` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `Key`           VARCHAR(100)    NOT NULL,
    `Value`         VARCHAR(1000)   NOT NULL,
    `Description`   VARCHAR(500)    NULL,
    `UpdatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_Settings_Key` (`Key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Tất cả 15 bảng đã được tạo thành công!' AS Status;
