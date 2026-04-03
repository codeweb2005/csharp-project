-- ============================================================================
-- 007_ResetData.sql (MySQL)
-- Xoa toan bo du lieu, chi giu lai tai khoan Admin va du lieu tham chieu
-- (Languages, Categories, CategoryTranslations)
-- ============================================================================

USE `VinhKhanhFoodTour`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Xoa du lieu phu thuoc (child tables truoc)
TRUNCATE TABLE `VisitHistory`;
TRUNCATE TABLE `SyncLogs`;
TRUNCATE TABLE `UserSettings`;
TRUNCATE TABLE `MenuItemTranslations`;
TRUNCATE TABLE `POIMenuItems`;
TRUNCATE TABLE `AudioNarrations`;
TRUNCATE TABLE `POIMedia`;
TRUNCATE TABLE `POITranslations`;
TRUNCATE TABLE `OfflinePackages`;
TRUNCATE TABLE `POIs`;

-- 2. Xoa tat ca Users NGOAI TRU Admin (Role = 2)
DELETE FROM `Users` WHERE `Role` != 2;

SET FOREIGN_KEY_CHECKS = 1;

-- 4. Reset AUTO_INCREMENT cho cac bang da TRUNCATE
ALTER TABLE `POIs` AUTO_INCREMENT = 1;
ALTER TABLE `AudioNarrations` AUTO_INCREMENT = 1;
ALTER TABLE `POIMenuItems` AUTO_INCREMENT = 1;
ALTER TABLE `VisitHistory` AUTO_INCREMENT = 1;
ALTER TABLE `OfflinePackages` AUTO_INCREMENT = 1;

-- 5. Kiem tra ket qua
SELECT 'Users con lai:' AS Info, COUNT(*) AS Total FROM `Users`;
SELECT `Id`, `Username`, `Email`, `Role`, `FullName` FROM `Users`;
SELECT 'POIs:' AS Info, COUNT(*) AS Total FROM `POIs`;
SELECT 'Languages:' AS Info, COUNT(*) AS Total FROM `Languages`;
SELECT 'Categories:' AS Info, COUNT(*) AS Total FROM `Categories`;
