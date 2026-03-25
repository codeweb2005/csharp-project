-- ============================================================================
-- 004_CreateStoredProcedures.sql (MySQL)
-- Stored Procedures cho các nghiệp vụ chính
-- ============================================================================

USE `VinhKhanhFoodTour`;

-- ============================================================================
-- SP 1: Lấy danh sách POI gần vị trí hiện tại (Haversine formula)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetNearbyPOIs`;

DELIMITER //

CREATE PROCEDURE `sp_GetNearbyPOIs`(
    IN p_UserLatitude   DECIMAL(10, 7),
    IN p_UserLongitude  DECIMAL(10, 7),
    IN p_RadiusMeters   INT,            -- Bán kính tìm kiếm (mét)
    IN p_LanguageId     INT,            -- Ngôn ngữ
    IN p_CategoryId     INT             -- NULL = tất cả danh mục
)
BEGIN
    -- Mặc định
    IF p_RadiusMeters IS NULL THEN SET p_RadiusMeters = 500; END IF;
    IF p_LanguageId IS NULL THEN SET p_LanguageId = 1; END IF;

    SELECT
        p.`Id`,
        p.`Latitude`,
        p.`Longitude`,
        p.`GeofenceRadius`,
        p.`Rating`,
        p.`PriceRangeMin`,
        p.`PriceRangeMax`,
        p.`IsFeatured`,
        pt.`Name`,
        pt.`ShortDescription`,
        pt.`NarrationText`,
        ct.`Name` AS `CategoryName`,
        c.`Icon`  AS `CategoryIcon`,
        c.`Color` AS `CategoryColor`,

        -- Ảnh chính
        (SELECT `FileUrl` FROM `POIMedia`
         WHERE `POIId` = p.`Id` AND `IsPrimary` = 1 LIMIT 1) AS `PrimaryImageUrl`,

        -- Audio mặc định
        an.`Id`               AS `DefaultAudioId`,
        an.`FileUrl`          AS `DefaultAudioUrl`,
        an.`DurationSeconds`  AS `AudioDuration`,
        an.`VoiceType`        AS `AudioVoiceType`,

        -- Khoảng cách (mét) — Haversine formula
        ROUND(
            6371000 * 2 * ASIN(SQRT(
                POW(SIN(RADIANS(p.`Latitude` - p_UserLatitude) / 2), 2) +
                COS(RADIANS(p_UserLatitude)) *
                COS(RADIANS(p.`Latitude`)) *
                POW(SIN(RADIANS(p.`Longitude` - p_UserLongitude) / 2), 2)
            ))
        ) AS `DistanceMeters`,

        -- Đang trong geofence?
        CASE
            WHEN ROUND(6371000 * 2 * ASIN(SQRT(
                POW(SIN(RADIANS(p.`Latitude` - p_UserLatitude) / 2), 2) +
                COS(RADIANS(p_UserLatitude)) *
                COS(RADIANS(p.`Latitude`)) *
                POW(SIN(RADIANS(p.`Longitude` - p_UserLongitude) / 2), 2)
            ))) <= p.`GeofenceRadius`
            THEN 1
            ELSE 0
        END AS `IsInsideGeofence`

    FROM `POIs` p
    INNER JOIN `POITranslations` pt
        ON p.`Id` = pt.`POIId` AND pt.`LanguageId` = p_LanguageId
    INNER JOIN `Categories` c
        ON p.`CategoryId` = c.`Id`
    LEFT JOIN `CategoryTranslations` ct
        ON c.`Id` = ct.`CategoryId` AND ct.`LanguageId` = p_LanguageId
    LEFT JOIN `AudioNarrations` an
        ON p.`Id` = an.`POIId` AND an.`LanguageId` = p_LanguageId
        AND an.`IsDefault` = 1 AND an.`IsActive` = 1
    WHERE
        p.`IsActive` = 1
        AND (p_CategoryId IS NULL OR p.`CategoryId` = p_CategoryId)
        -- Bounding box filter (nhanh, lọc sơ bộ trước Haversine)
        AND p.`Latitude` BETWEEN p_UserLatitude - (p_RadiusMeters / 111000.0)
                               AND p_UserLatitude + (p_RadiusMeters / 111000.0)
        AND p.`Longitude` BETWEEN p_UserLongitude - (p_RadiusMeters / (111000.0 * COS(RADIANS(p_UserLatitude))))
                                AND p_UserLongitude + (p_RadiusMeters / (111000.0 * COS(RADIANS(p_UserLatitude))))
    HAVING `DistanceMeters` <= p_RadiusMeters
    ORDER BY `DistanceMeters` ASC;
END //

DELIMITER ;


-- ============================================================================
-- SP 2: Kiểm tra Cooldown — Có nên phát thuyết minh không?
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_CheckNarrationCooldown`;

DELIMITER //

CREATE PROCEDURE `sp_CheckNarrationCooldown`(
    IN  p_UserId            INT,
    IN  p_POIId             INT,
    IN  p_CooldownMinutes   INT,
    OUT p_IsAllowed          TINYINT
)
BEGIN
    DECLARE v_LastNarrationAt DATETIME;

    IF p_CooldownMinutes IS NULL THEN SET p_CooldownMinutes = 30; END IF;

    -- Tìm lần phát thuyết minh gần nhất tại POI
    SELECT `VisitedAt` INTO v_LastNarrationAt
    FROM `VisitHistory`
    WHERE `UserId` = p_UserId
      AND `POIId` = p_POIId
      AND `NarrationPlayed` = 1
    ORDER BY `VisitedAt` DESC
    LIMIT 1;

    -- Kiểm tra cooldown
    IF v_LastNarrationAt IS NULL
        OR TIMESTAMPDIFF(MINUTE, v_LastNarrationAt, UTC_TIMESTAMP()) >= p_CooldownMinutes
    THEN
        SET p_IsAllowed = 1;    -- Cho phép phát
    ELSE
        SET p_IsAllowed = 0;    -- Đang trong cooldown
    END IF;

    -- Trả về chi tiết
    SELECT
        p_IsAllowed AS `IsAllowed`,
        v_LastNarrationAt AS `LastPlayedAt`,
        CASE
            WHEN v_LastNarrationAt IS NULL THEN NULL
            ELSE p_CooldownMinutes - TIMESTAMPDIFF(MINUTE, v_LastNarrationAt, UTC_TIMESTAMP())
        END AS `RemainingCooldownMinutes`;
END //

DELIMITER ;


-- ============================================================================
-- SP 3: Ghi nhận lượt ghé thăm POI
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_RecordVisit`;

DELIMITER //

CREATE PROCEDURE `sp_RecordVisit`(
    IN  p_UserId            INT,
    IN  p_POIId             INT,
    IN  p_TriggerType       TINYINT,
    IN  p_NarrationPlayed   TINYINT,
    IN  p_NarrationType     TINYINT,
    IN  p_AudioNarrationId  INT,
    IN  p_DurationListened  INT,
    IN  p_UserLatitude      DECIMAL(10, 7),
    IN  p_UserLongitude     DECIMAL(10, 7),
    IN  p_DeviceInfo        VARCHAR(200),
    OUT p_NewVisitId        BIGINT
)
BEGIN
    INSERT INTO `VisitHistory`
        (`UserId`, `POIId`, `TriggerType`, `NarrationPlayed`,
         `NarrationType`, `AudioNarrationId`, `DurationListened`,
         `UserLatitude`, `UserLongitude`, `DeviceInfo`, `IsSynced`)
    VALUES
        (p_UserId, p_POIId, p_TriggerType, IFNULL(p_NarrationPlayed, 0),
         p_NarrationType, p_AudioNarrationId, p_DurationListened,
         p_UserLatitude, p_UserLongitude, p_DeviceInfo, 1);

    SET p_NewVisitId = LAST_INSERT_ID();

    -- Cập nhật tổng lượt ghé thăm
    UPDATE `POIs`
    SET `TotalVisits` = `TotalVisits` + 1
    WHERE `Id` = p_POIId;
END //

DELIMITER ;


-- ============================================================================
-- SP 4: Lấy chi tiết POI đầy đủ
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetPOIDetail`;

DELIMITER //

CREATE PROCEDURE `sp_GetPOIDetail`(
    IN p_POIId      INT,
    IN p_LanguageId INT
)
BEGIN
    IF p_LanguageId IS NULL THEN SET p_LanguageId = 1; END IF;

    -- 1) Thông tin POI chính
    SELECT
        p.`Id`, p.`Latitude`, p.`Longitude`,
        p.`GeofenceRadius`, p.`Address`, p.`Phone`,
        p.`Website`, p.`OpeningHours`, p.`PriceRangeMin`, p.`PriceRangeMax`,
        p.`Rating`, p.`TotalVisits`, p.`IsFeatured`,
        pt.`Name`, pt.`ShortDescription`, pt.`FullDescription`,
        pt.`NarrationText`, pt.`Highlights`,
        ct.`Name` AS `CategoryName`,
        c.`Icon`  AS `CategoryIcon`,
        c.`Color` AS `CategoryColor`
    FROM `POIs` p
    INNER JOIN `POITranslations` pt
        ON p.`Id` = pt.`POIId` AND pt.`LanguageId` = p_LanguageId
    INNER JOIN `Categories` c
        ON p.`CategoryId` = c.`Id`
    LEFT JOIN `CategoryTranslations` ct
        ON c.`Id` = ct.`CategoryId` AND ct.`LanguageId` = p_LanguageId
    WHERE p.`Id` = p_POIId;

    -- 2) Hình ảnh
    SELECT `Id`, `MediaType`, `FileUrl`, `FileName`,
           `Width`, `Height`, `Caption`, `SortOrder`, `IsPrimary`
    FROM `POIMedia`
    WHERE `POIId` = p_POIId
    ORDER BY `IsPrimary` DESC, `SortOrder` ASC;

    -- 3) File audio thuyết minh
    SELECT `Id`, `LanguageId`, `FileUrl`, `FileName`,
           `DurationSeconds`, `VoiceType`, `VoiceName`, `IsDefault`
    FROM `AudioNarrations`
    WHERE `POIId` = p_POIId
      AND `LanguageId` = p_LanguageId
      AND `IsActive` = 1
    ORDER BY `IsDefault` DESC, `VoiceType` ASC;

    -- 4) Thực đơn
    SELECT mi.`Id`, mi.`Price`, mi.`ImageUrl`, mi.`IsSignature`,
           mit.`Name`, mit.`Description`
    FROM `POIMenuItems` mi
    INNER JOIN `MenuItemTranslations` mit
        ON mi.`Id` = mit.`MenuItemId` AND mit.`LanguageId` = p_LanguageId
    WHERE mi.`POIId` = p_POIId AND mi.`IsAvailable` = 1
    ORDER BY mi.`IsSignature` DESC, mi.`SortOrder` ASC;
END //

DELIMITER ;


-- ============================================================================
-- SP 5: Delta Sync — Lấy dữ liệu mới từ server cho mobile
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetSyncDelta`;

DELIMITER //

CREATE PROCEDURE `sp_GetSyncDelta`(
    IN p_LastSyncTimestamp   DATETIME,
    IN p_LanguageId          INT
)
BEGIN
    IF p_LanguageId IS NULL THEN SET p_LanguageId = 1; END IF;

    -- 1) POI mới/cập nhật
    SELECT p.`Id`, p.`CategoryId`, p.`Latitude`, p.`Longitude`,
           p.`GeofenceRadius`, p.`Address`, p.`Phone`,
           p.`OpeningHours`, p.`PriceRangeMin`, p.`PriceRangeMax`,
           p.`Rating`, p.`IsActive`, p.`IsFeatured`, p.`UpdatedAt`,
           pt.`Name`, pt.`ShortDescription`, pt.`FullDescription`,
           pt.`NarrationText`, pt.`Highlights`
    FROM `POIs` p
    INNER JOIN `POITranslations` pt
        ON p.`Id` = pt.`POIId` AND pt.`LanguageId` = p_LanguageId
    WHERE p.`UpdatedAt` > p_LastSyncTimestamp
       OR pt.`UpdatedAt` > p_LastSyncTimestamp;

    -- 2) Audio mới/cập nhật
    SELECT `Id`, `POIId`, `LanguageId`, `FileUrl`, `FileName`,
           `FileSize`, `DurationSeconds`, `VoiceType`, `VoiceName`,
           `IsDefault`, `IsActive`, `UpdatedAt`
    FROM `AudioNarrations`
    WHERE `LanguageId` = p_LanguageId
      AND `UpdatedAt` > p_LastSyncTimestamp;

    -- 3) Media mới
    SELECT m.`Id`, m.`POIId`, m.`MediaType`, m.`FileUrl`, m.`FileName`,
           m.`FileSize`, m.`SortOrder`, m.`IsPrimary`
    FROM `POIMedia` m
    WHERE m.`CreatedAt` > p_LastSyncTimestamp;

    -- 4) Categories cập nhật
    SELECT c.`Id`, c.`Icon`, c.`Color`, c.`SortOrder`, c.`IsActive`,
           ct.`Name`, ct.`Description`
    FROM `Categories` c
    LEFT JOIN `CategoryTranslations` ct
        ON c.`Id` = ct.`CategoryId` AND ct.`LanguageId` = p_LanguageId
    WHERE c.`CreatedAt` > p_LastSyncTimestamp;
END //

DELIMITER ;


-- ============================================================================
-- SP 6: Dashboard thống kê (Admin)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetDashboardStats`;

DELIMITER //

CREATE PROCEDURE `sp_GetDashboardStats`(
    IN p_StartDate DATETIME,
    IN p_EndDate   DATETIME
)
BEGIN
    -- Mặc định: 30 ngày gần nhất
    IF p_StartDate IS NULL THEN SET p_StartDate = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY); END IF;
    IF p_EndDate IS NULL THEN SET p_EndDate = UTC_TIMESTAMP(); END IF;

    -- 1) Tổng quan
    SELECT
        (SELECT COUNT(*) FROM `POIs` WHERE `IsActive` = 1)                      AS `TotalActivePOIs`,
        (SELECT COUNT(*) FROM `Users` WHERE `Role` = 0 AND `IsActive` = 1)      AS `TotalCustomers`,
        (SELECT COUNT(*) FROM `Users` WHERE `Role` = 1 AND `IsActive` = 1)      AS `TotalVendors`,
        (SELECT COUNT(*) FROM `Languages` WHERE `IsActive` = 1)                 AS `TotalLanguages`,
        (SELECT COUNT(*) FROM `AudioNarrations` WHERE `IsActive` = 1)           AS `TotalAudioFiles`,
        (SELECT COUNT(*) FROM `VisitHistory`
         WHERE `VisitedAt` BETWEEN p_StartDate AND p_EndDate)                    AS `TotalVisitsInPeriod`;

    -- 2) Top 10 POI được ghé nhiều nhất
    SELECT
        p.`Id`, pt.`Name`,
        COUNT(v.`Id`) AS `VisitCount`,
        SUM(CASE WHEN v.`NarrationPlayed` = 1 THEN 1 ELSE 0 END) AS `NarrationPlayCount`
    FROM `VisitHistory` v
    INNER JOIN `POIs` p ON v.`POIId` = p.`Id`
    INNER JOIN `POITranslations` pt ON p.`Id` = pt.`POIId` AND pt.`LanguageId` = 1
    WHERE v.`VisitedAt` BETWEEN p_StartDate AND p_EndDate
    GROUP BY p.`Id`, pt.`Name`
    ORDER BY `VisitCount` DESC
    LIMIT 10;

    -- 3) Thống kê theo ngôn ngữ
    SELECT l.`Name` AS `Language`, l.`NativeName`,
           COUNT(DISTINCT us.`UserId`) AS `UserCount`
    FROM `UserSettings` us
    INNER JOIN `Languages` l ON us.`PreferredLanguageId` = l.`Id`
    GROUP BY l.`Name`, l.`NativeName`
    ORDER BY `UserCount` DESC;

    -- 4) Lượt ghé theo ngày (biểu đồ)
    SELECT
        DATE(v.`VisitedAt`) AS `VisitDate`,
        COUNT(*) AS `VisitCount`,
        SUM(CASE WHEN v.`NarrationPlayed` = 1 THEN 1 ELSE 0 END) AS `PlayedCount`
    FROM `VisitHistory` v
    WHERE v.`VisitedAt` BETWEEN p_StartDate AND p_EndDate
    GROUP BY DATE(v.`VisitedAt`)
    ORDER BY `VisitDate` ASC;
END //

DELIMITER ;


SELECT '✅ Tất cả 6 Stored Procedures đã được tạo thành công!' AS Status;
