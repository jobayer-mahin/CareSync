-- ============================================================
-- CareSync HMS — MySQL Schema (3NF Normalized)
-- Database: caresync_hms_db
-- Compatible with XAMPP MariaDB 10.x / MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS caresync_hms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE caresync_hms_db;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ============================================================
-- 2. DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    department_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(50) UNIQUE NOT NULL,
    department_code VARCHAR(10) UNIQUE NOT NULL,
    head_doctor_id BIGINT NULL,
    floor_number INT NULL,
    building VARCHAR(50) NULL,
    bed_capacity INT DEFAULT 0,
    occupied_beds INT DEFAULT 0,
    nurse_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active',
    phone_extension VARCHAR(10) NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_departments_name (department_name)
) ENGINE=InnoDB;

-- ============================================================
-- 3. DOCTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE,
    doctor_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(200) NULL,
    department_id BIGINT NULL,
    phone VARCHAR(20) NOT NULL,
    years_of_experience INT NULL,
    consultation_fee DECIMAL(10, 2) DEFAULT 0,
    available_days VARCHAR(100) NULL,
    is_available TINYINT(1) DEFAULT 1,
    joined_date DATE NULL,
    avatar_data LONGTEXT NULL,
    signature_data LONGTEXT NULL,
    biography TEXT NULL,
    available_slots TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    INDEX idx_doctors_code (doctor_code),
    INDEX idx_doctors_department (department_id),
    INDEX idx_doctors_specialization (specialization)
) ENGINE=InnoDB;

-- Add FK for head_doctor_id
ALTER TABLE departments
    ADD CONSTRAINT fk_head_doctor
    FOREIGN KEY (head_doctor_id) REFERENCES doctors(doctor_id)
    ON DELETE SET NULL;

-- ============================================================
-- 4. PATIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    patient_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE,
    patient_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    blood_group VARCHAR(5) NULL,
    phone VARCHAR(20) NOT NULL,
    emergency_contact VARCHAR(20) NULL,
    address TEXT NULL,
    department_id BIGINT NULL,
    assigned_doctor_id BIGINT NULL,
    initial_diagnosis TEXT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    admission_date DATETIME NULL,
    discharge_date DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    INDEX idx_patients_code (patient_code),
    INDEX idx_patients_status (status),
    INDEX idx_patients_name (first_name, last_name),
    INDEX idx_patients_department (department_id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_code VARCHAR(20) UNIQUE NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type VARCHAR(30) NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    consultation_fee DECIMAL(10, 2) NULL,
    reason TEXT NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_doctor (doctor_id),
    INDEX idx_appointments_date (appointment_date),
    INDEX idx_appointments_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 6. INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_code VARCHAR(20) UNIQUE NOT NULL,
    patient_id BIGINT NOT NULL,
    appointment_id BIGINT NULL,
    billing_date DATE DEFAULT (CURRENT_DATE),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'Unpaid',
    payment_method VARCHAR(30) NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    INDEX idx_invoices_patient (patient_id),
    INDEX idx_invoices_status (payment_status),
    INDEX idx_invoices_date (billing_date)
) ENGINE=InnoDB;

-- ============================================================
-- 7. INVOICE_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    description VARCHAR(200) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    INDEX idx_invoice_items_invoice (invoice_id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. EMERGENCY_CASES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_cases (
    emergency_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_code VARCHAR(20) UNIQUE NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NULL,
    priority_level VARCHAR(10) NOT NULL,
    triage_category VARCHAR(50) NULL,
    arrival_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    chief_complaint TEXT NOT NULL,
    vital_signs TEXT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    bed_number VARCHAR(10) NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    INDEX idx_emergency_priority (priority_level),
    INDEX idx_emergency_status (status),
    INDEX idx_emergency_arrival (arrival_time)
) ENGINE=InnoDB;

-- ============================================================
-- 9. EMERGENCY_ACTIVITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_activities (
    activity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    emergency_id BIGINT NULL,
    patient_id BIGINT NULL,
    activity_type VARCHAR(30) NULL,
    severity VARCHAR(20) NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergency_id) REFERENCES emergency_cases(emergency_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    INDEX idx_emergency_activities_case (emergency_id),
    INDEX idx_emergency_activities_time (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 10. MEDICAL_RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_records (
    record_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NULL,
    visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT NULL,
    prescription TEXT NULL,
    lab_results TEXT NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    INDEX idx_medical_records_patient (patient_id),
    INDEX idx_medical_records_visit (visit_date)
) ENGINE=InnoDB;

-- ============================================================
-- 11. EHR_DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ehr_documents (
    document_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_data LONGTEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    INDEX idx_ehr_documents_patient (patient_id)
) ENGINE=InnoDB;

-- ============================================================
-- 12. NOTIFICATIONS TABLE (bell icon alerts)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(30),
    title VARCHAR(150) NOT NULL,
    message TEXT,
    link VARCHAR(120),
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- 13. MESSAGES TABLE (chat between admin / doctor / patient)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    message_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_receiver (receiver_id)
) ENGINE=InnoDB;

-- ============================================================
-- 14. BED_RATES TABLE (in-patient bed prices, editable by admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS bed_rates (
    bed_rate_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bed_type VARCHAR(50) NOT NULL UNIQUE,
    daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    sort_order INT DEFAULT 0
) ENGINE=InnoDB;
