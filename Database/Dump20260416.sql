-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: vinhkhanh.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com    Database: VinhKhanhFoodTour
-- ------------------------------------------------------
-- Server version	8.4.7

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `AudioNarrations`
--

DROP TABLE IF EXISTS `AudioNarrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AudioNarrations` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `POIId` int NOT NULL,
  `LanguageId` int NOT NULL,
  `FileUrl` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FileName` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FileSize` bigint NOT NULL,
  `DurationSeconds` int NOT NULL,
  `MimeType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'audio/mpeg',
  `VoiceType` tinyint NOT NULL,
  `VoiceName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SampleRate` int DEFAULT NULL,
  `BitRate` int DEFAULT NULL,
  `IsDefault` tinyint(1) NOT NULL DEFAULT '0',
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `Duration` int NOT NULL DEFAULT '0',
  `FilePath` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `FK_Audio_Language` (`LanguageId`),
  KEY `IX_Audio_POILang` (`POIId`,`LanguageId`,`IsActive`),
  KEY `IX_Audio_Default` (`POIId`,`LanguageId`,`IsDefault`,`IsActive`),
  CONSTRAINT `FK_Audio_Language` FOREIGN KEY (`LanguageId`) REFERENCES `Languages` (`Id`),
  CONSTRAINT `FK_Audio_POI` FOREIGN KEY (`POIId`) REFERENCES `POIs` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `CK_Audio_Duration` CHECK ((`DurationSeconds` > 0)),
  CONSTRAINT `CK_Audio_VoiceType` CHECK ((`VoiceType` in (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AudioNarrations`
--

LOCK TABLES `AudioNarrations` WRITE;
/*!40000 ALTER TABLE `AudioNarrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `AudioNarrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Categories`
--

DROP TABLE IF EXISTS `Categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Categories` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Icon` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SortOrder` int NOT NULL DEFAULT '0',
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Categories`
--

LOCK TABLES `Categories` WRITE;
/*!40000 ALTER TABLE `Categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `Categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CategoryTranslations`
--

DROP TABLE IF EXISTS `CategoryTranslations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CategoryTranslations` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `CategoryId` int NOT NULL,
  `LanguageId` int NOT NULL,
  `Name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_CatTrans_CatLang` (`CategoryId`,`LanguageId`),
  KEY `FK_CatTrans_Language` (`LanguageId`),
  CONSTRAINT `FK_CatTrans_Category` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_CatTrans_Language` FOREIGN KEY (`LanguageId`) REFERENCES `Languages` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CategoryTranslations`
--

LOCK TABLES `CategoryTranslations` WRITE;
/*!40000 ALTER TABLE `CategoryTranslations` DISABLE KEYS */;
/*!40000 ALTER TABLE `CategoryTranslations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Languages`
--

DROP TABLE IF EXISTS `Languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Languages` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `NativeName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TtsCode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `SortOrder` int NOT NULL DEFAULT '0',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `FlagEmoji` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_Languages_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Languages`
--

LOCK TABLES `Languages` WRITE;
/*!40000 ALTER TABLE `Languages` DISABLE KEYS */;
/*!40000 ALTER TABLE `Languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MenuItemTranslations`
--

DROP TABLE IF EXISTS `MenuItemTranslations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MenuItemTranslations` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `MenuItemId` int NOT NULL,
  `LanguageId` int NOT NULL,
  `Name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_MenuItemTrans_ItemLang` (`MenuItemId`,`LanguageId`),
  KEY `FK_MenuItemTrans_Lang` (`LanguageId`),
  CONSTRAINT `FK_MenuItemTrans_Item` FOREIGN KEY (`MenuItemId`) REFERENCES `POIMenuItems` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_MenuItemTrans_Lang` FOREIGN KEY (`LanguageId`) REFERENCES `Languages` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MenuItemTranslations`
--

LOCK TABLES `MenuItemTranslations` WRITE;
/*!40000 ALTER TABLE `MenuItemTranslations` DISABLE KEYS */;
/*!40000 ALTER TABLE `MenuItemTranslations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `OfflinePackages`
--

DROP TABLE IF EXISTS `OfflinePackages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OfflinePackages` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `LanguageId` int NOT NULL,
  `Name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Version` int NOT NULL DEFAULT '1',
  `TotalSizeBytes` bigint NOT NULL,
  `POICount` int NOT NULL,
  `AudioCount` int NOT NULL,
  `ImageCount` int NOT NULL DEFAULT '0',
  `DownloadUrl` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Checksum` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `Status` int NOT NULL DEFAULT '0',
  `Progress` int NOT NULL DEFAULT '0',
  `CurrentStep` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DownloadCount` int NOT NULL DEFAULT '0',
  `FilePath` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FileSize` bigint DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `FK_Offline_Lang` (`LanguageId`),
  CONSTRAINT `FK_Offline_Lang` FOREIGN KEY (`LanguageId`) REFERENCES `Languages` (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `OfflinePackages`
--

LOCK TABLES `OfflinePackages` WRITE;
/*!40000 ALTER TABLE `OfflinePackages` DISABLE KEYS */;
/*!40000 ALTER TABLE `OfflinePackages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `POIMedia`
--

DROP TABLE IF EXISTS `POIMedia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `POIMedia` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `POIId` int NOT NULL,
  `MediaType` tinyint NOT NULL,
  `FileUrl` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FileName` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FileSize` bigint NOT NULL,
  `MimeType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Width` int DEFAULT NULL,
  `Height` int DEFAULT NULL,
  `Caption` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SortOrder` int NOT NULL DEFAULT '0',
  `IsPrimary` tinyint(1) NOT NULL DEFAULT '0',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `FilePath` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  KEY `IX_POIMedia_POI` (`POIId`,`SortOrder`),
  KEY `IX_POIMedia_Primary` (`POIId`,`IsPrimary`),
  CONSTRAINT `FK_POIMedia_POI` FOREIGN KEY (`POIId`) REFERENCES `POIs` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `CK_POIMedia_Type` CHECK ((`MediaType` in (0,1,2)))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `POIMedia`
--

LOCK TABLES `POIMedia` WRITE;
/*!40000 ALTER TABLE `POIMedia` DISABLE KEYS */;
/*!40000 ALTER TABLE `POIMedia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `POIMenuItems`
--

DROP TABLE IF EXISTS `POIMenuItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `POIMenuItems` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `POIId` int NOT NULL,
  `Price` decimal(12,0) NOT NULL,
  `ImageUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IsAvailable` tinyint(1) NOT NULL DEFAULT '1',
  `IsSignature` tinyint(1) NOT NULL DEFAULT '0',
  `SortOrder` int NOT NULL DEFAULT '0',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`Id`),
  KEY `IX_MenuItems_POI` (`POIId`,`IsAvailable`,`SortOrder`),
  CONSTRAINT `FK_MenuItem_POI` FOREIGN KEY (`POIId`) REFERENCES `POIs` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `CK_MenuItem_Price` CHECK ((`Price` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `POIMenuItems`
--

LOCK TABLES `POIMenuItems` WRITE;
/*!40000 ALTER TABLE `POIMenuItems` DISABLE KEYS */;
/*!40000 ALTER TABLE `POIMenuItems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `POITranslations`
--

DROP TABLE IF EXISTS `POITranslations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `POITranslations` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `POIId` int NOT NULL,
  `LanguageId` int NOT NULL,
  `Name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ShortDescription` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FullDescription` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `NarrationText` text COLLATE utf8mb4_unicode_ci,
  `Highlights` json DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_POITrans_POILang` (`POIId`,`LanguageId`),
  KEY `FK_POITrans_Language` (`LanguageId`),
  KEY `IX_POITrans_POILang` (`POIId`,`LanguageId`),
  CONSTRAINT `FK_POITrans_Language` FOREIGN KEY (`LanguageId`) REFERENCES `Languages` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_POITrans_POI` FOREIGN KEY (`POIId`) REFERENCES `POIs` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `POITranslations`
--

LOCK TABLES `POITranslations` WRITE;
/*!40000 ALTER TABLE `POITranslations` DISABLE KEYS */;
/*!40000 ALTER TABLE `POITranslations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `POIs`
--

DROP TABLE IF EXISTS `POIs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `POIs` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `VendorId` int DEFAULT NULL,
  `CategoryId` int NOT NULL,
  `Latitude` decimal(10,7) NOT NULL,
  `Longitude` decimal(10,7) NOT NULL,
  `GeofenceRadiusMeters` int NOT NULL DEFAULT '30',
  `Priority` int NOT NULL DEFAULT '0' COMMENT 'Geofence conflict priority: higher value plays first when zones overlap',
  `Address` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PhoneNumber` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Website` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `OpeningHours` json DEFAULT NULL,
  `PriceRangeMin` decimal(12,0) DEFAULT NULL,
  `PriceRangeMax` decimal(12,0) DEFAULT NULL,
  `Rating` decimal(3,2) DEFAULT '0.00',
  `TotalVisits` int NOT NULL DEFAULT '0',
  `TotalRatings` int NOT NULL DEFAULT '0',
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `IsFeatured` tinyint(1) NOT NULL DEFAULT '0',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `GeofenceRadius` int NOT NULL DEFAULT '25',
  `Phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VendorUserId` int DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_POIs_Location` (`IsActive`,`Latitude`,`Longitude`),
  KEY `IX_POIs_CategoryId` (`CategoryId`,`IsActive`,`Rating`),
  KEY `IX_POIs_VendorId` (`VendorId`),
  KEY `IX_POIs_Featured` (`IsFeatured`,`IsActive`,`Rating`),
  KEY `Idx_POIs_Priority` (`Priority`),
  CONSTRAINT `FK_POIs_Category` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`),
  CONSTRAINT `FK_POIs_Vendor` FOREIGN KEY (`VendorId`) REFERENCES `Users` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `CK_POIs_GeofenceRadius` CHECK ((`GeofenceRadiusMeters` between 10 and 500)),
  CONSTRAINT `CK_POIs_Latitude` CHECK ((`Latitude` between -(90.0) and 90.0)),
  CONSTRAINT `CK_POIs_Longitude` CHECK ((`Longitude` between -(180.0) and 180.0)),
  CONSTRAINT `CK_POIs_PriceRange` CHECK (((`PriceRangeMin` is null) or (`PriceRangeMax` is null) or (`PriceRangeMin` <= `PriceRangeMax`))),
  CONSTRAINT `CK_POIs_Rating` CHECK ((`Rating` between 0.00 and 5.00))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `POIs`
--

LOCK TABLES `POIs` WRITE;
/*!40000 ALTER TABLE `POIs` DISABLE KEYS */;
/*!40000 ALTER TABLE `POIs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SyncLogs`
--

DROP TABLE IF EXISTS `SyncLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SyncLogs` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `DeviceId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `EntityType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `EntityId` int DEFAULT NULL,
  `Action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `RecordCount` int NOT NULL DEFAULT '1',
  `DataSizeBytes` bigint DEFAULT NULL,
  `Status` tinyint NOT NULL DEFAULT '0',
  `ErrorMessage` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `StartedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `CompletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_SyncLogs_UserDate` (`UserId`,`StartedAt`),
  KEY `IX_SyncLogs_Status` (`Status`),
  CONSTRAINT `FK_Sync_User` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`),
  CONSTRAINT `CK_Sync_Status` CHECK ((`Status` in (0,1,2,3)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SyncLogs`
--

LOCK TABLES `SyncLogs` WRITE;
/*!40000 ALTER TABLE `SyncLogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `SyncLogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SystemSettings`
--

DROP TABLE IF EXISTS `SystemSettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SystemSettings` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Value` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_SystemSettings_Key` (`Key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SystemSettings`
--

LOCK TABLES `SystemSettings` WRITE;
/*!40000 ALTER TABLE `SystemSettings` DISABLE KEYS */;
/*!40000 ALTER TABLE `SystemSettings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserSettings`
--

DROP TABLE IF EXISTS `UserSettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserSettings` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `PreferredLanguageId` int NOT NULL,
  `NarrationMode` tinyint NOT NULL DEFAULT '0',
  `AutoPlayEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `CooldownMinutes` int NOT NULL DEFAULT '30',
  `GeofenceSensitivity` tinyint NOT NULL DEFAULT '1',
  `Volume` decimal(3,2) NOT NULL DEFAULT '0.80',
  `PlaybackSpeed` decimal(3,2) NOT NULL DEFAULT '1.00',
  `ShowNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `VibrationEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_Settings_UserId` (`UserId`),
  KEY `FK_Settings_Lang` (`PreferredLanguageId`),
  CONSTRAINT `FK_Settings_Lang` FOREIGN KEY (`PreferredLanguageId`) REFERENCES `Languages` (`Id`),
  CONSTRAINT `FK_Settings_User` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `CK_Settings_Cooldown` CHECK ((`CooldownMinutes` between 5 and 1440)),
  CONSTRAINT `CK_Settings_Mode` CHECK ((`NarrationMode` in (0,1,2,3))),
  CONSTRAINT `CK_Settings_Sensitivity` CHECK ((`GeofenceSensitivity` in (0,1,2))),
  CONSTRAINT `CK_Settings_Speed` CHECK ((`PlaybackSpeed` between 0.50 and 2.00)),
  CONSTRAINT `CK_Settings_Volume` CHECK ((`Volume` between 0.00 and 1.00))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserSettings`
--

LOCK TABLES `UserSettings` WRITE;
/*!40000 ALTER TABLE `UserSettings` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserSettings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PasswordHash` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PhoneNumber` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FullName` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `AvatarUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Role` tinyint NOT NULL DEFAULT '0',
  `PreferredLanguageId` int DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `EmailConfirmed` tinyint(1) NOT NULL DEFAULT '0',
  `LastLoginAt` datetime DEFAULT NULL,
  `PasswordResetTokenHash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SHA-256 hex of plain reset token',
  `PasswordResetExpiry` datetime(6) DEFAULT NULL COMMENT 'UTC expiry for password reset',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `Phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `RefreshToken` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `RefreshTokenExpiry` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UQ_Users_Email` (`Email`),
  UNIQUE KEY `UQ_Users_Username` (`Username`),
  UNIQUE KEY `Idx_Users_Username` (`Username`),
  KEY `FK_Users_PreferredLanguage` (`PreferredLanguageId`),
  KEY `IX_Users_Role` (`Role`,`IsActive`),
  KEY `IX_Users_RefreshToken` (`RefreshToken`),
  CONSTRAINT `FK_Users_PreferredLanguage` FOREIGN KEY (`PreferredLanguageId`) REFERENCES `Languages` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `CK_Users_Role` CHECK ((`Role` in (0,1,2)))
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (23,'admin','admin@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=',NULL,'Quản trị viên',NULL,2,NULL,1,1,'2026-04-16 13:28:33',NULL,NULL,'2026-04-16 12:54:31','2026-04-16 13:28:39',NULL,'nuYt5NvJuWnV9JT3rrb6udRqOS5hQFpC/GTu5D/KN4roaku+z7z2tJz61Es/KhUmlCkKnPzCgi65zs2ATqy7QQ==','2026-04-23 13:28:33.221648'),(24,'vendor','vendor@vinhkhanh.app','100000.+NzqJD6EdnQR+yZhK7kRyA==.XcMXobRa6qryPmji1zAHmNIrfDmgiI3ofF7unZ9R+x8=',NULL,'Vendor',NULL,1,NULL,1,1,'2026-04-16 13:28:52',NULL,NULL,'2026-04-16 12:54:31','2026-04-16 13:28:58',NULL,'APYXrAIfD0srBmoerzEalcVvn+fk31IEAMGmQ8CJ0uFj5ZyCe6lW9NQF01QgDUA+dmE9fsBW6rG2jMspghz0ng==','2026-04-23 13:28:51.967528');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VisitHistory`
--

DROP TABLE IF EXISTS `VisitHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VisitHistory` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `POIId` int NOT NULL,
  `LanguageId` int NOT NULL DEFAULT '1',
  `VisitedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TriggerType` tinyint NOT NULL,
  `NarrationPlayed` tinyint(1) NOT NULL DEFAULT '0',
  `NarrationType` tinyint DEFAULT NULL,
  `AudioNarrationId` int DEFAULT NULL,
  `DurationListened` int DEFAULT NULL,
  `UserLatitude` decimal(10,7) DEFAULT NULL,
  `UserLongitude` decimal(10,7) DEFAULT NULL,
  `DeviceInfo` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IsSynced` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ListenDuration` int NOT NULL DEFAULT '0',
  `DeviceId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Latitude` double DEFAULT NULL,
  `Longitude` double DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `FK_Visit_Audio` (`AudioNarrationId`),
  KEY `IX_Visit_UserPOI` (`UserId`,`POIId`,`VisitedAt`),
  KEY `IX_Visit_POI_Stats` (`POIId`,`VisitedAt`),
  KEY `IX_Visit_Unsynced` (`IsSynced`),
  KEY `IX_Visit_Date` (`VisitedAt`),
  CONSTRAINT `FK_Visit_Audio` FOREIGN KEY (`AudioNarrationId`) REFERENCES `AudioNarrations` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_Visit_POI` FOREIGN KEY (`POIId`) REFERENCES `POIs` (`Id`),
  CONSTRAINT `FK_Visit_User` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`),
  CONSTRAINT `CK_Visit_Trigger` CHECK ((`TriggerType` in (0,1,2,3)))
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VisitHistory`
--

LOCK TABLES `VisitHistory` WRITE;
/*!40000 ALTER TABLE `VisitHistory` DISABLE KEYS */;
/*!40000 ALTER TABLE `VisitHistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'VinhKhanhFoodTour'
--
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-16 20:36:30
