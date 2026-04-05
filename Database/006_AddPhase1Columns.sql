-- ============================================================
-- Migration 006: Add new columns for Phase 1 features
-- ============================================================
-- Run this against the existing database AFTER deploying the
-- updated backend code. Safe to run multiple times (guard via
-- INFORMATION_SCHEMA checks for MySQL 8.4 compatibility).
--
-- Changes:
--   1. Languages: add TtsCode column for Azure TTS locale
--   2. Users: add Username, EmailConfirmed columns
--   3. POIs: add Priority column for geofence conflict resolution
-- ============================================================

USE VinhKhanhFoodTour;

-- -----------------------------------------------------------
-- 1. Languages.TtsCode
-- -----------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'Languages' AND COLUMN_NAME = 'TtsCode'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Languages ADD COLUMN TtsCode VARCHAR(20) NULL COMMENT 'Azure TTS locale, e.g. vi-VN or en-US' AFTER FlagEmoji",
    "SELECT 'Languages.TtsCode already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE Languages SET TtsCode = 'vi-VN' WHERE Code = 'vi' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'en-US' WHERE Code = 'en' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'zh-CN' WHERE Code = 'zh' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'ja-JP' WHERE Code = 'ja' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'ko-KR' WHERE Code = 'ko' AND TtsCode IS NULL;

-- -----------------------------------------------------------
-- 2a. Users.Username
-- -----------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'Username'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Users ADD COLUMN Username VARCHAR(100) NULL COMMENT 'Unique username for tourist self-registration' AFTER Id",
    "SELECT 'Users.Username already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE Users SET Username = SUBSTRING_INDEX(Email, '@', 1) WHERE Username IS NULL;

ALTER TABLE Users MODIFY COLUMN Username VARCHAR(100) NOT NULL;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'Users' AND INDEX_NAME = 'Idx_Users_Username'
);
SET @sql = IF(@idx_exists = 0,
    "ALTER TABLE Users ADD UNIQUE INDEX Idx_Users_Username (Username)",
    "SELECT 'Index Idx_Users_Username already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------
-- 2b. Users.EmailConfirmed
-- -----------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'EmailConfirmed'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Users ADD COLUMN EmailConfirmed TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Reserved for email verification' AFTER Username",
    "SELECT 'Users.EmailConfirmed already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------
-- 3. POIs.Priority
-- -----------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'POIs' AND COLUMN_NAME = 'Priority'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE POIs ADD COLUMN Priority INT NOT NULL DEFAULT 0 COMMENT 'Geofence conflict priority: higher value plays first when zones overlap' AFTER GeofenceRadiusMeters",
    "SELECT 'POIs.Priority already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'POIs' AND INDEX_NAME = 'Idx_POIs_Priority'
);
SET @sql = IF(@idx_exists = 0,
    "ALTER TABLE POIs ADD INDEX Idx_POIs_Priority (Priority)",
    "SELECT 'Index Idx_POIs_Priority already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------
-- Verify
-- -----------------------------------------------------------
SELECT 'Migration 006 complete.' AS Status;

SELECT
    COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour'
  AND TABLE_NAME IN ('Languages', 'Users', 'POIs')
  AND COLUMN_NAME IN ('TtsCode', 'Username', 'EmailConfirmed', 'Priority')
ORDER BY TABLE_NAME, COLUMN_NAME;
