-- CareSync HMS — run the complete MySQL / MariaDB database setup
-- Usage: mysql -u root -p < run_all.sql

SOURCE 00_create_database.sql;
USE caresync_hms_db;
SOURCE 01_schema.sql;
SOURCE 02_seed_data.sql;
