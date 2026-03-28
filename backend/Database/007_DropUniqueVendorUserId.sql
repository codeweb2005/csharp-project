-- =============================================================
-- Migration 007: Convert POIs.VendorUserId from 1:1 to 1:N
-- Drop the UNIQUE index and recreate as a regular (non-unique) index,
-- preserving the FK constraint so referential integrity is kept.
-- =============================================================

-- 1. Drop the FK that pins the unique index in place
ALTER TABLE POIs DROP FOREIGN KEY FK_POIs_Users_VendorUserId;

-- 2. Now we can drop the unique index
ALTER TABLE POIs DROP INDEX IX_POIs_VendorUserId;

-- 3. Recreate as a plain (non-unique) index for query performance
CREATE INDEX IX_POIs_VendorUserId ON POIs (VendorUserId);

-- 4. Re-add the FK with the new non-unique index backing it
ALTER TABLE POIs
  ADD CONSTRAINT FK_POIs_Users_VendorUserId
  FOREIGN KEY (VendorUserId) REFERENCES Users (Id)
  ON DELETE SET NULL;

-- Verify
SHOW INDEX FROM POIs WHERE Key_name = 'IX_POIs_VendorUserId';
