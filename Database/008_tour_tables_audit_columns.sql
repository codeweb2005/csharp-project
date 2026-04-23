-- ============================================================================
-- Migration 008 — Add missing audit columns for tourist/QR tables
-- Fixes runtime EF errors such as:
--   Unknown column 'UpdatedAt' in 'field list'
-- ============================================================================

-- TouristSessions inherits BaseEntity in code, so it needs CreatedAt + UpdatedAt.
ALTER TABLE TouristSessions
    ADD COLUMN IF NOT EXISTS CreatedAt DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
    ADD COLUMN IF NOT EXISTS UpdatedAt DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP());

-- Backfill for rows created before this migration (defensive).
UPDATE TouristSessions
SET CreatedAt = COALESCE(CreatedAt, StartedAt, UTC_TIMESTAMP()),
    UpdatedAt = COALESCE(UpdatedAt, LastSeenAt, StartedAt, UTC_TIMESTAMP());

-- TourQRCodes already has CreatedAt, but lacks UpdatedAt while entity inherits BaseEntity.
ALTER TABLE TourQRCodes
    ADD COLUMN IF NOT EXISTS UpdatedAt DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP());

-- Backfill existing rows (defensive).
UPDATE TourQRCodes
SET UpdatedAt = COALESCE(UpdatedAt, CreatedAt, UTC_TIMESTAMP());
