-- CareSync HMS — demo seed data for MySQL / MariaDB
-- Passwords: admin123 (admin), pass123 (doctor/patient)
-- Usage: mysql -u root -p caresync_hms_db < 02_seed_data.sql

-- Users (BCrypt hashes — compatible with Spring Security)
INSERT IGNORE INTO users (email, password_hash, role, is_active) VALUES
('admin@caresync.com', '$2a$10$TWbYxeixGabpjGSiA1EfDOk3cKwDIATCvVLR6/jeXmxclmuaFFyKW', 'ADMIN', 1),
('doctor@demo.com', '$2a$10$tfu6kTwcfI8Mw8FOJlXIquejOCzCN6GBZlejvUwW3LjGqmBspseI.', 'DOCTOR', 1),
('doctor2@demo.com', '$2a$10$tfu6kTwcfI8Mw8FOJlXIquejOCzCN6GBZlejvUwW3LjGqmBspseI.', 'DOCTOR', 1),
('patient@demo.com', '$2a$10$tfu6kTwcfI8Mw8FOJlXIquejOCzCN6GBZlejvUwW3LjGqmBspseI.', 'PATIENT', 1);

-- Departments
INSERT IGNORE INTO departments
    (department_name, department_code, floor_number, bed_capacity, occupied_beds, status)
VALUES
    ('Cardiology', 'CARD', 2, 30, 18, 'Active'),
    ('Neurology', 'NEUR', 3, 25, 12, 'Active'),
    ('Emergency', 'EMRG', 1, 30, 29, 'Critical'),
    ('Gynecology', 'GYNE', 4, 20, 8, 'Active'),
    ('Orthopedics', 'ORTH', 5, 22, 10, 'Active');

-- Doctors
INSERT IGNORE INTO doctors
    (user_id, doctor_code, first_name, last_name, specialization, qualification,
     department_id, phone, years_of_experience, consultation_fee, available_days,
     is_available, joined_date)
SELECT u.user_id, 'DR-0001', 'Hasan', 'Mahmud', 'Cardiologist', 'MBBS, MD (Cardiology)',
       d.department_id, '01711-XXXXXX', 12, 800.00, 'Sun, Tue, Thu', 1, '2020-01-15'
FROM users u
CROSS JOIN departments d
WHERE u.email = 'doctor@demo.com' AND d.department_code = 'CARD';

INSERT IGNORE INTO doctors
    (user_id, doctor_code, first_name, last_name, specialization, qualification,
     department_id, phone, years_of_experience, consultation_fee, available_days,
     is_available, joined_date)
SELECT u.user_id, 'DR-0002', 'Fatima', 'Akter', 'Neurologist', 'MBBS, FCPS (Neurology)',
       d.department_id, '01812-XXXXXX', 8, 1000.00, 'Mon, Wed, Sat', 1, '2021-06-01'
FROM users u
CROSS JOIN departments d
WHERE u.email = 'doctor2@demo.com' AND d.department_code = 'NEUR';

-- Patients
INSERT IGNORE INTO patients
    (user_id, patient_code, first_name, last_name, date_of_birth, gender, blood_group,
     phone, emergency_contact, address, status)
SELECT u.user_id, 'PT-0001', 'Mohammed', 'Rahman', '1980-05-15', 'Male', 'A+',
       '01712-345678', '01812-456789', 'Dhaka, Bangladesh', 'Active'
FROM users u
WHERE u.email = 'patient@demo.com';

INSERT IGNORE INTO patients
    (patient_code, first_name, last_name, date_of_birth, gender, blood_group,
     phone, address, status, admission_date)
VALUES
    ('PT-0002', 'Ayesha', 'Begum', '1992-08-22', 'Female', 'B+',
     '01911-234567', 'Chittagong, Bangladesh', 'Admitted', NOW() - INTERVAL 3 DAY),
    ('PT-0003', 'Karim', 'Uddin', '1975-03-10', 'Male', 'O-',
     '01611-876543', 'Sylhet, Bangladesh', 'Critical', NOW() - INTERVAL 1 DAY);

-- Appointments
INSERT IGNORE INTO appointments
    (appointment_code, patient_id, doctor_id, appointment_date, appointment_time,
     appointment_type, status, reason)
SELECT 'APT-0001', p.patient_id, d.doctor_id, CURRENT_DATE, '09:00:00',
       'Consultation', 'Confirmed', 'Regular cardiac checkup'
FROM patients p
CROSS JOIN doctors d
WHERE p.patient_code = 'PT-0001' AND d.doctor_code = 'DR-0001';

INSERT IGNORE INTO appointments
    (appointment_code, patient_id, doctor_id, appointment_date, appointment_time,
     appointment_type, status, reason)
SELECT 'APT-0002', p.patient_id, d.doctor_id, CURRENT_DATE, '10:30:00',
       'Follow-up', 'Pending', 'Neurology follow-up'
FROM patients p
CROSS JOIN doctors d
WHERE p.patient_code = 'PT-0002' AND d.doctor_code = 'DR-0002';

-- Invoice + items
INSERT IGNORE INTO invoices
    (invoice_code, patient_id, total_amount, paid_amount, discount, payment_status, payment_method)
SELECT 'INV-0001', p.patient_id, 1300.00, 800.00, 0, 'Partial', 'Cash'
FROM patients p
WHERE p.patient_code = 'PT-0001';

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
SELECT i.invoice_id, 'Consultation Fee', 1, 800.00, 800.00
FROM invoices i
WHERE i.invoice_code = 'INV-0001'
  AND NOT EXISTS (
      SELECT 1 FROM invoice_items
      WHERE invoice_id = i.invoice_id AND description = 'Consultation Fee'
  );

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
SELECT i.invoice_id, 'ECG Test', 1, 500.00, 500.00
FROM invoices i
WHERE i.invoice_code = 'INV-0001'
  AND NOT EXISTS (
      SELECT 1 FROM invoice_items
      WHERE invoice_id = i.invoice_id AND description = 'ECG Test'
  );

-- Emergency
INSERT IGNORE INTO emergency_cases
    (case_code, patient_id, doctor_id, priority_level, triage_category, chief_complaint,
     vital_signs, status, bed_number)
SELECT 'EMG-0001', p.patient_id, d.doctor_id, 'P1', 'Cardiac Emergency',
       'Severe chest pain with shortness of breath',
       '{"bp":"180/110","pulse":120,"temp":38.2,"spo2":92}', 'Active', 'E-01'
FROM patients p
CROSS JOIN doctors d
WHERE p.patient_code = 'PT-0003' AND d.doctor_code = 'DR-0001';
