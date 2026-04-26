-- 009_web_site_visits.sql
-- Track anonymous web visitor sessions for dashboard analytics.
-- Separate from VisitHistory (which requires a POI) so web visitors
-- who browse the site (without entering a specific POI) are also counted.

CREATE TABLE IF NOT EXISTS WebSiteVisits (
    Id              INT          NOT NULL AUTO_INCREMENT,
    VisitorId       VARCHAR(128) NOT NULL,
    VisitedAt       DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
    NarrationCount  INT          NOT NULL DEFAULT 0,

    PRIMARY KEY (Id),
    INDEX idx_wsv_visitor    (VisitorId),
    INDEX idx_wsv_visited_at (VisitedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table already exists (re-run), ensure NarrationCount column is present.
ALTER TABLE WebSiteVisits ADD COLUMN IF NOT EXISTS NarrationCount INT NOT NULL DEFAULT 0;
