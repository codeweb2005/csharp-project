-- ============================================================
-- Migration 009: Password reset + profile self-service support
-- ============================================================
-- Adds columns for forgot-password flow (token hash + expiry).
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

USE `vinhkhanh_foodtour`;

ALTER TABLE `Users`
    ADD COLUMN IF NOT EXISTS `PasswordResetTokenHash` VARCHAR(64) NULL
        COMMENT 'SHA-256 hex of plain reset token' AFTER `RefreshTokenExpiry`;

ALTER TABLE `Users`
    ADD COLUMN IF NOT EXISTS `PasswordResetExpiry` DATETIME(6) NULL
        COMMENT 'UTC expiry for password reset' AFTER `PasswordResetTokenHash`;

SELECT 'Migration 009 complete.' AS Status;
