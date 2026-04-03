-- ============================================================================
-- 001_CreateDatabase.sql (MySQL)
-- Tạo Database cho dự án: Thuyết minh tự động đa ngôn ngữ
--                         Phố Ẩm Thực Vĩnh Khánh
-- ============================================================================

DROP DATABASE IF EXISTS `VinhKhanhFoodTour`;

CREATE DATABASE `VinhKhanhFoodTour`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `VinhKhanhFoodTour`;

SELECT '✅ Database [VinhKhanhFoodTour] đã được tạo thành công.' AS Status;
