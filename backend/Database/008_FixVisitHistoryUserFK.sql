-- =============================================================
-- Migration 008: Fix FK constraints on VisitHistory.UserId
-- Change from RESTRICT (default) to SET NULL so that deleting a
-- User account preserves the visit analytics data (UserId = NULL).
-- =============================================================

-- 1. Drop the existing RESTRICT FK
ALTER TABLE VisitHistory DROP FOREIGN KEY FK_VisitHistory_Users_UserId;

-- 2. Re-add with ON DELETE SET NULL
ALTER TABLE VisitHistory
  ADD CONSTRAINT FK_VisitHistory_Users_UserId
  FOREIGN KEY (UserId) REFERENCES Users (Id)
  ON DELETE SET NULL;

-- Verify
SELECT CONSTRAINT_NAME, DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_NAME = 'FK_VisitHistory_Users_UserId'
  AND CONSTRAINT_SCHEMA = 'vinhkhanh_foodtour';
