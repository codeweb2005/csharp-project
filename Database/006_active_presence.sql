-- ============================================================================
-- Migration 006 — Active Presence (Realtime Monitoring)
-- Stores the current GPS position and active POI for each connected tourist session.
-- Rows are upserted on each presence ping and deleted when the session ends or expires.
-- This table is intentionally small (1 row per active tourist) — not for analytics.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ActivePresence (
    SessionId   VARCHAR(64)  NOT NULL,   -- FK → TouristSessions.SessionToken
    PoiId       INT          NULL,       -- actively-entered POI, NULL if between POIs
    Latitude    DOUBLE       NULL,
    Longitude   DOUBLE       NULL,
    UpdatedAt   DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),

    PRIMARY KEY (SessionId),
    INDEX idx_presence_poi       (PoiId),
    INDEX idx_presence_updated   (UpdatedAt),
    CONSTRAINT fk_presence_session FOREIGN KEY (SessionId) REFERENCES TouristSessions (SessionToken) ON DELETE CASCADE,
    CONSTRAINT fk_presence_poi     FOREIGN KEY (PoiId) REFERENCES POIs (Id) ON DELETE SET NULL
);
