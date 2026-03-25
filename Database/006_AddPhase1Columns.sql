-- ============================================================
-- Migration 006: Add new columns for Phase 1 features
-- ============================================================
-- Run this against the existing database AFTER deploying the
-- updated backend code. Safe to run multiple times (IF NOT EXISTS / IGNORE).
--
-- Changes:
--   1. Languages: add TtsCode column for Azure TTS locale
--   2. Users: add Username, EmailConfirmed columns
--   3. POIs: add Priority column for geofence conflict resolution
-- ============================================================

USE VinhKhanhFoodTour;

-- -----------------------------------------------------------
-- 1. Languages.TtsCode
--    Azure Cognitive Services locale code, e.g. "vi-VN", "en-US".
--    NULL means TTS is not supported for this language.
-- -----------------------------------------------------------
ALTER TABLE Languages
    ADD COLUMN IF NOT EXISTS TtsCode VARCHAR(20) NULL COMMENT 'Azure TTS locale, e.g. vi-VN or en-US' AFTER FlagEmoji;

-- Update existing rows with known TTS codes
UPDATE Languages SET TtsCode = 'vi-VN' WHERE Code = 'vi' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'en-US' WHERE Code = 'en' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'zh-CN' WHERE Code = 'zh' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'ja-JP' WHERE Code = 'ja' AND TtsCode IS NULL;
UPDATE Languages SET TtsCode = 'ko-KR' WHERE Code = 'ko' AND TtsCode IS NULL;

-- -----------------------------------------------------------
-- 2a. Users.Username
--     Unique login name chosen by the tourist on registration.
--     Backfill from Email prefix for existing rows.
-- -----------------------------------------------------------
ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS Username VARCHAR(100) NULL COMMENT 'Unique username for tourist self-registration' AFTER Id;

-- Backfill existing users with email prefix as username
UPDATE Users SET Username = SUBSTRING_INDEX(Email, '@', 1)
    WHERE Username IS NULL;

-- Once backfilled, make it NOT NULL and unique
ALTER TABLE Users MODIFY COLUMN Username VARCHAR(100) NOT NULL;
ALTER TABLE Users ADD UNIQUE INDEX IF NOT EXISTS Idx_Users_Username (Username);

-- -----------------------------------------------------------
-- 2b. Users.EmailConfirmed
--     Reserved for future email verification flow.
--     Default FALSE; tourists can log in immediately after register.
-- -----------------------------------------------------------
ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS EmailConfirmed TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Reserved for email verification; currently always 0 (not enforced)' AFTER Username;

-- -----------------------------------------------------------
-- 3. POIs.Priority
--    Used by the mobile app geofence engine to resolve conflicts
--    when two POI geofences overlap (higher value wins).
--    Default 0 = normal priority.
-- -----------------------------------------------------------
ALTER TABLE POIs
    ADD COLUMN IF NOT EXISTS Priority INT NOT NULL DEFAULT 0
    COMMENT 'Geofence conflict priority: higher value plays first when zones overlap' AFTER GeofenceRadius;

-- Optional index if you frequently sort/filter by priority
ALTER TABLE POIs ADD INDEX IF NOT EXISTS Idx_POIs_Priority (Priority);

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
