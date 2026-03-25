-- ============================================================================
-- 003_CreateIndexes.sql (MySQL)
-- Tạo các Index tối ưu hiệu suất truy vấn
-- ============================================================================

USE `VinhKhanhFoodTour`;

-- ============================================================================
-- INDEXES CHO BẢNG POIs
-- ============================================================================

-- Tìm POI theo vị trí (geofencing & proximity search)
CREATE INDEX `IX_POIs_Location`
    ON `POIs` (`IsActive`, `Latitude`, `Longitude`);

-- Tìm POI theo danh mục
CREATE INDEX `IX_POIs_CategoryId`
    ON `POIs` (`CategoryId`, `IsActive`, `Rating`);

-- Tìm POI theo chủ quán
CREATE INDEX `IX_POIs_VendorUserId`
    ON `POIs` (`VendorUserId`);

-- POI nổi bật
CREATE INDEX `IX_POIs_Featured`
    ON `POIs` (`IsFeatured`, `IsActive`, `Rating`);

-- ============================================================================
-- INDEXES CHO BẢNG POITranslations
-- ============================================================================

CREATE INDEX `IX_POITrans_POILang`
    ON `POITranslations` (`POIId`, `LanguageId`);

-- ============================================================================
-- INDEXES CHO BẢNG AudioNarrations
-- ============================================================================

CREATE INDEX `IX_Audio_POILang`
    ON `AudioNarrations` (`POIId`, `LanguageId`, `IsActive`);

CREATE INDEX `IX_Audio_Default`
    ON `AudioNarrations` (`POIId`, `LanguageId`, `IsDefault`, `IsActive`);

-- ============================================================================
-- INDEXES CHO BẢNG POIMedia
-- ============================================================================

CREATE INDEX `IX_POIMedia_POI`
    ON `POIMedia` (`POIId`, `SortOrder`);

CREATE INDEX `IX_POIMedia_Primary`
    ON `POIMedia` (`POIId`, `IsPrimary`);

-- ============================================================================
-- INDEXES CHO BẢNG VisitHistory
-- ============================================================================

-- Cooldown check: lần ghé gần nhất của user tại POI
CREATE INDEX `IX_Visit_UserPOI`
    ON `VisitHistory` (`UserId`, `POIId`, `VisitedAt`);

-- Thống kê lượng ghé thăm theo POI
CREATE INDEX `IX_Visit_POI_Stats`
    ON `VisitHistory` (`POIId`, `VisitedAt`);

-- Tìm records chưa đồng bộ
CREATE INDEX `IX_Visit_Unsynced`
    ON `VisitHistory` (`IsSynced`);

-- Theo dõi theo thời gian (dashboard)
CREATE INDEX `IX_Visit_Date`
    ON `VisitHistory` (`VisitedAt`);

-- ============================================================================
-- INDEXES CHO BẢNG Users
-- ============================================================================

CREATE INDEX `IX_Users_Role`
    ON `Users` (`Role`, `IsActive`);

-- ============================================================================
-- INDEXES CHO BẢNG SyncLogs
-- ============================================================================

CREATE INDEX `IX_SyncLogs_UserDate`
    ON `SyncLogs` (`UserId`, `StartedAt`);

CREATE INDEX `IX_SyncLogs_Status`
    ON `SyncLogs` (`Status`);

-- ============================================================================
-- INDEXES CHO BẢNG POIMenuItems
-- ============================================================================

CREATE INDEX `IX_MenuItems_POI`
    ON `POIMenuItems` (`POIId`, `IsAvailable`, `SortOrder`);

SELECT '✅ Tất cả Indexes đã được tạo thành công!' AS Status;
