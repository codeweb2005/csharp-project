-- ============================================================================
-- Migration 007 — Spatial index + performance indexes
-- Run AFTER the base schema (000–004) is applied.
-- ============================================================================

-- ── Spatial index on POIs ────────────────────────────────────────────────────
-- MySQL 8 does not support functional/generated column FK, but a stored generated
-- column + SPATIAL INDEX is the cleanest way to accelerate ST_Distance_Sphere.

ALTER TABLE POIs
    ADD COLUMN IF NOT EXISTS Location POINT
        AS (POINT(Longitude, Latitude)) STORED NOT NULL
        COMMENT 'Spatial column for ST_Distance_Sphere acceleration';

-- SPATIAL INDEX requires NOT NULL and a spatial type (POINT, GEOMETRY…)
-- If the column already exists this will fail gracefully — just skip.
CREATE SPATIAL INDEX IF NOT EXISTS idx_poi_location ON POIs (Location);

-- ── Covering index for VisitHistory analytics queries ───────────────────────
-- Most analytics queries filter by PoiId + time range, so a composite index
-- covering both columns avoids full table scans on large VisitHistory tables.
CREATE INDEX IF NOT EXISTS idx_visit_poi_time  ON VisitHistory (PoiId, VisitedAt DESC);
CREATE INDEX IF NOT EXISTS idx_visit_device    ON VisitHistory (DeviceId, VisitedAt DESC);
CREATE INDEX IF NOT EXISTS idx_visit_session   ON VisitHistory (DeviceId, PoiId, VisitedAt DESC);

-- ── Index for TouristSessions cleanup ────────────────────────────────────────
-- Scheduled cleanup: DELETE FROM TouristSessions WHERE ExpiresAt < UTC_TIMESTAMP() AND IsActive = 0
-- Already covered by idx_tourist_session_expires from migration 005.

-- ── Analyze tables to refresh optimizer statistics ───────────────────────────
ANALYZE TABLE POIs;
ANALYZE TABLE VisitHistory;
