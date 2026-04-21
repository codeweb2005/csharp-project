-- ============================================================================
-- Migration 005 — Tourist Sessions
-- Supports QR-code-based walk-in tourists (no account required).
-- A tourist scans a QR code → app exchanges the session token for a short-lived JWT.
-- TTL: 24 hours; cleanup via scheduled job or manual DELETE WHERE ExpiresAt < NOW().
-- ============================================================================

CREATE TABLE IF NOT EXISTS TouristSessions (
    Id           INT          NOT NULL AUTO_INCREMENT,
    SessionToken VARCHAR(64)  NOT NULL UNIQUE,    -- UUID v4 encoded in QR code
    DeviceId     VARCHAR(128) NULL,               -- anonymous device fingerprint (UUID stored in Preferences)
    LanguageId   INT          NULL,               -- preferred language at session start
    StartedAt    DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
    ExpiresAt    DATETIME     NOT NULL,           -- StartedAt + 24h
    LastSeenAt   DATETIME     NULL,               -- updated on each presence ping
    IsActive     TINYINT(1)   NOT NULL DEFAULT 1,

    PRIMARY KEY (Id),
    CONSTRAINT uq_tourist_session_token UNIQUE (SessionToken),
    INDEX idx_tourist_session_token   (SessionToken),
    INDEX idx_tourist_session_expires (ExpiresAt),
    INDEX idx_tourist_session_device  (DeviceId),
    CONSTRAINT fk_tourist_lang FOREIGN KEY (LanguageId) REFERENCES Languages (Id) ON DELETE SET NULL
);

-- ============================================================================
-- Migration 005b — Tour QR Codes (optional: pre-generated named QRs by admin)
-- If Option A (multiuse QR): one master QR per tour session → many TouristSessions.
-- If Option B (unique QR per tourist): each QR used exactly once.
-- ============================================================================

CREATE TABLE IF NOT EXISTS TourQRCodes (
    Id           INT          NOT NULL AUTO_INCREMENT,
    QRToken      VARCHAR(64)  NOT NULL UNIQUE,   -- UUID v4; same value embedded in QR PNG
    Label        VARCHAR(128) NULL,              -- admin label, e.g. "Nhóm Sáng 01"
    MaxUses      INT          NULL,              -- NULL = unlimited (multiuse / Option A)
    UseCount     INT          NOT NULL DEFAULT 0,
    CreatedByAdminId INT      NULL,
    IsActive     TINYINT(1)   NOT NULL DEFAULT 1,
    CreatedAt    DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
    ExpiresAt    DATETIME     NULL,              -- NULL = never expires

    PRIMARY KEY (Id),
    CONSTRAINT uq_tour_qr_token UNIQUE (QRToken),
    INDEX idx_tour_qr_token   (QRToken),
    INDEX idx_tour_qr_active  (IsActive, ExpiresAt)
);
