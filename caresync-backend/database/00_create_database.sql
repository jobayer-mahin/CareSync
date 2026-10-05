-- CareSync HMS — create database for MySQL / MariaDB
-- Usage: mysql -u root -p < 00_create_database.sql

CREATE DATABASE IF NOT EXISTS caresync_hms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
