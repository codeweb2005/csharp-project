-- ============================================================
-- VinhKhanh DB Reset Script
-- Run this BEFORE restarting backend to allow DataSeeder to re-run
-- ============================================================

-- Disable FK checks temporarily
SET session_replication_role = 'replica';

-- Clear data in dependency order (children first)
TRUNCATE TABLE "AudioFiles"        RESTART IDENTITY CASCADE;
TRUNCATE TABLE "MediaFiles"        RESTART IDENTITY CASCADE;
TRUNCATE TABLE "VisitLogs"         RESTART IDENTITY CASCADE;
TRUNCATE TABLE "OfflinePackagePOIs"RESTART IDENTITY CASCADE;
TRUNCATE TABLE "OfflinePackages"   RESTART IDENTITY CASCADE;
TRUNCATE TABLE "POITranslations"   RESTART IDENTITY CASCADE;
TRUNCATE TABLE "POIs"              RESTART IDENTITY CASCADE;
TRUNCATE TABLE "CategoryTranslations" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Categories"        RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Users"             RESTART IDENTITY CASCADE;
TRUNCATE TABLE "SystemSettings"    RESTART IDENTITY CASCADE;
-- Keep Languages (seeder checks AnyAsync anyway)

-- Re-enable FK checks
SET session_replication_role = 'origin';

SELECT 'Database reset complete. Restart backend to reseed.' AS status;
