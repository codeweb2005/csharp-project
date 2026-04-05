-- ============================================================
-- Migration 009: Password reset + profile self-service support
-- ============================================================
-- Adds columns for forgot-password flow (token hash + expiry).
-- Safe to run multiple times (guard via INFORMATION_SCHEMA
-- for MySQL 8.4 compatibility).
-- ============================================================

USE `VinhKhanhFoodTour`;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'PasswordResetTokenHash'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE `Users` ADD COLUMN `PasswordResetTokenHash` VARCHAR(64) NULL COMMENT 'SHA-256 hex of plain reset token' AFTER `LastLoginAt`",
    "SELECT 'Users.PasswordResetTokenHash already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'VinhKhanhFoodTour' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'PasswordResetExpiry'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE `Users` ADD COLUMN `PasswordResetExpiry` DATETIME(6) NULL COMMENT 'UTC expiry for password reset' AFTER `PasswordResetTokenHash`",
    "SELECT 'Users.PasswordResetExpiry already exists, skipping.' AS Status"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration 009 complete.' AS Status;
