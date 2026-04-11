-- ============================================================
-- Migration 010: POI menu tables (POIMenuItems + MenuItemTranslations)
-- ============================================================
-- Fixes: GET /api/v1/pois/{id} → 500 when MySQL reports
--   Table '....POIMenuItems' doesn't exist
--
-- EF maps POIMenuItem → `POIMenuItems` with ImageUrl column; entity
-- inherits BaseEntity → requires `UpdatedAt` (002_CreateTables.sql
-- only had CreatedAt on POIMenuItems — this script adds full shape).
--
-- Idempotent: CREATE IF NOT EXISTS + ALTER if legacy table lacks UpdatedAt.
-- Adjust USE below if your schema name differs (e.g. vinhkhanh_foodtour).
-- ============================================================

USE `VinhKhanhFoodTour`;

CREATE TABLE IF NOT EXISTS `POIMenuItems` (
    `Id`            INT             NOT NULL AUTO_INCREMENT,
    `POIId`         INT             NOT NULL,
    `Price`         DECIMAL(12, 0)  NOT NULL,
    `ImageUrl`      VARCHAR(500)    NULL,
    `IsAvailable`   TINYINT(1)      NOT NULL DEFAULT 1,
    `IsSignature`   TINYINT(1)      NOT NULL DEFAULT 0,
    `SortOrder`     INT             NOT NULL DEFAULT 0,
    `CreatedAt`     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt`     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_POIMenuItems_POI` FOREIGN KEY (`POIId`)
        REFERENCES `POIs`(`Id`) ON DELETE CASCADE,
    CONSTRAINT `CK_POIMenuItems_Price` CHECK (`Price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MenuItemTranslations` (
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

-- Legacy: POIMenuItems from 002 had no UpdatedAt — required by EF BaseEntity
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'POIMenuItems' AND COLUMN_NAME = 'UpdatedAt'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `POIMenuItems` ADD COLUMN `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER `CreatedAt`',
    'SELECT ''POIMenuItems.UpdatedAt already exists, skipping ALTER.'' AS Status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration 010 complete.' AS Status;
