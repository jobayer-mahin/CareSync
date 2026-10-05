package com.caresync.hms.config;

import com.caresync.hms.model.*;
import com.caresync.hms.repository.*;
import com.caresync.hms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final EmergencyCaseRepository emergencyCaseRepository;
    private final EmergencyActivityRepository emergencyActivityRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded. Skipping base data initialization.");
        } else {
            log.info("Seeding database with initial data...");
            seedData();
            log.info("Database seeding complete!");
        }
        // Runs once on any database (new or existing); skips itself if the demo cards are already there.
        seedExtraEmergencyDemo();
    }

    /** Extra demo cards for the Emergency screen, all with Bangladeshi patient names. */
    private void seedExtraEmergencyDemo() {
        if (patientRepository.findByPatientCode("PT-0201").isPresent()) {
            return;
        }
        Department emergency = departmentRepository.findByDepartmentName("Emergency").orElse(null);
        Doctor cardio = doctorRepository.findByDoctorCode("DR-0001").orElse(null);
        Doctor neuro = doctorRepository.findByDoctorCode("DR-0003").orElse(null);
        Doctor ortho = doctorRepository.findByDoctorCode("DR-0004").orElse(null);
        Doctor gyne = doctorRepository.findByDoctorCode("DR-0002").orElse(null);

        // code, first, last, dob, gender, blood, phone, address, doctor, priority, triage, complaint, vitals json, bed
        Object[][] demo = {
            {"PT-0201", "Abdul", "Karim Sarker", LocalDate.of(1967, 2, 11), "Male", "B+", "01711-204501", "Mirpur-10, Dhaka", cardio, "P1", "Cardiac Emergency",
                "Crushing chest pain radiating to left arm, sweating", "{\"bp\":\"90/60\",\"pulse\":132,\"temp\":37.1,\"spo2\":89}", "ICU"},
            {"PT-0202", "Shamima", "Akter Lipi", LocalDate.of(1992, 6, 3), "Female", "O+", "01819-310622", "Savar, Dhaka", gyne, "P1", "Obstetric Emergency",
                "Heavy bleeding after delivery, dizziness, pale", "{\"bp\":\"85/50\",\"pulse\":128,\"temp\":36.9,\"spo2\":93}", "ICU"},
            {"PT-0203", "Tanvir", "Ahmed Chowdhury", LocalDate.of(1999, 9, 21), "Male", "A+", "01912-778899", "Agrabad, Chattogram", neuro, "P1", "Head Trauma",
                "Road accident, head injury, drowsy and vomiting", "{\"bp\":\"150/95\",\"pulse\":58,\"temp\":37.0,\"spo2\":94}", "ICU"},
            {"PT-0204", "Rokeya", "Khatun", LocalDate.of(1962, 12, 5), "Female", "AB+", "01515-440233", "Rangpur Sadar, Rangpur", cardio, "P2", "Respiratory Distress",
                "Difficulty breathing, wheezing, known asthma", "{\"bp\":\"135/85\",\"pulse\":112,\"temp\":37.6,\"spo2\":90}", "E-07"},
            {"PT-0205", "Sabbir", "Hossain Shuvo", LocalDate.of(2002, 4, 17), "Male", "O-", "01611-905544", "Tongi, Gazipur", ortho, "P2", "Burn Injury",
                "Deep burn on left forearm from factory accident", "{\"bp\":\"128/82\",\"pulse\":104,\"temp\":37.2,\"spo2\":98}", "E-08"},
            {"PT-0206", "Farhana", "Yasmin", LocalDate.of(1984, 1, 29), "Female", "B-", "01313-662811", "Zindabazar, Sylhet", gyne, "P2", "Acute Abdomen",
                "Severe lower abdominal pain with vomiting since morning", "{\"bp\":\"122/78\",\"pulse\":101,\"temp\":38.0,\"spo2\":97}", "E-09"},
            {"PT-0207", "Habibur", "Rahman Mondol", LocalDate.of(1976, 8, 14), "Male", "A-", "01717-118234", "Bogura Sadar, Bogura", cardio, "P3", "Fever / Infection",
                "Fever for 3 days with body ache, suspected dengue", "{\"bp\":\"110/70\",\"pulse\":92,\"temp\":39.1,\"spo2\":98}", "E-10"},
            {"PT-0208", "Nusrat", "Jahan Mim", LocalDate.of(2004, 3, 9), "Female", "O+", "01822-556677", "Cumilla Sadar, Cumilla", ortho, "P3", "Minor Trauma",
                "Twisted ankle after a fall, swelling, can walk with pain", "{\"bp\":\"115/75\",\"pulse\":84,\"temp\":36.8,\"spo2\":99}", "E-11"},
        };

        for (Object[] d : demo) {
            String priority = (String) d[9];
            Patient patient = createPatient(null, (String) d[0], (String) d[1], (String) d[2], (LocalDate) d[3],
                    (String) d[4], (String) d[5], (String) d[6], null, (String) d[7],
                    emergency, (Doctor) d[8], "P1".equals(priority) ? "Critical" : "Active", LocalDateTime.now());

            long next = emergencyCaseRepository.findMaxId() + 1;
            String caseCode = "EMG-" + String.format("%04d", next);
            while (emergencyCaseRepository.findByCaseCode(caseCode).isPresent()) {
                next++;
                caseCode = "EMG-" + String.format("%04d", next);
            }

            EmergencyCase ec = new EmergencyCase();
            ec.setCaseCode(caseCode);
            ec.setPatient(patient);
            ec.setDoctor((Doctor) d[8]);
            ec.setPriorityLevel(priority);
            ec.setTriageCategory((String) d[10]);
            ec.setChiefComplaint((String) d[11]);
            ec.setVitalSigns((String) d[12]);
            ec.setStatus("Active");
            ec.setBedNumber((String) d[13]);
            ec = emergencyCaseRepository.save(ec);

            if ("P1".equals(priority)) {
                notificationService.notifyRole("ADMIN", "EMERGENCY",
                        "Emergency P1 (Critical): " + d[1] + " " + d[2],
                        caseCode + " — " + d[11] + " · Bed " + d[13], "/emergency.html");
            }
        }
        log.info("Seeded {} extra emergency demo cases", demo.length);
    }

    private void seedData() {
        // --- Users ---
        createUser("admin@caresync.com", "admin123", "ADMIN");
        User doc1User = createUser("doctor@demo.com", "pass123", "DOCTOR");
        User doc2User = createUser("doctor2@demo.com", "pass123", "DOCTOR");
        User doc3User = createUser("doctor3@demo.com", "pass123", "DOCTOR");
        User doc4User = createUser("doctor4@demo.com", "pass123", "DOCTOR");
        User pat1User = createUser("patient@demo.com", "pass123", "PATIENT");

        // --- Departments (matching frontend department-management.html) ---
        Department cardiology = createDept("Cardiology", "CARD", 2, "Building A", 50, 42, 14, "Comprehensive cardiac care unit");
        Department emergency = createDept("Emergency", "EMRG", 0, "Building A", 30, 29, 20, "24/7 emergency services");
        Department orthopedics = createDept("Orthopedics", "ORTH", 3, "Building B", 40, 18, 10, "Bone and joint care");
        Department neurology = createDept("Neurology", "NEUR", 4, "Building B", 35, 22, 9, "Brain and nerve care");
        createDept("Pediatrics", "PEDI", 1, "Building C", 45, 31, 12, "Children healthcare");
        Department gynecology = createDept("Gynecology", "GYNE", 2, "Building C", 30, 15, 8, "Women's healthcare");

        // --- Doctors (matching frontend doctor-management.html) ---
        Doctor doc1 = new Doctor();
        doc1.setUser(doc1User);
        doc1.setDoctorCode("DR-0001");
        doc1.setFirstName("Hasan");
        doc1.setLastName("Mahmud");
        doc1.setSpecialization("Cardiologist");
        doc1.setQualification("MBBS, MD (Cardiology)");
        doc1.setDepartment(cardiology);
        doc1.setPhone("01711-XXXXXX");
        doc1.setYearsOfExperience(12);
        doc1.setConsultationFee(new BigDecimal("800.00"));
        doc1.setAvailableDays("Sun, Tue, Thu");
        doc1.setIsAvailable(true);
        doc1.setJoinedDate(LocalDate.of(2020, 1, 15));
        doc1.setBiography("Dr. Hasan Mahmud is a Senior Consultant Cardiologist with over 12 years of experience in interventional cardiology. He specializes in clinical cardiology, echocardiography, and preventive heart care.");
        doc1.setAvailableSlots("[{\"day\":\"Sunday\",\"startTime\":\"09:00\",\"endTime\":\"13:00\"},{\"day\":\"Tuesday\",\"startTime\":\"14:00\",\"endTime\":\"18:00\"},{\"day\":\"Thursday\",\"startTime\":\"09:00\",\"endTime\":\"13:00\"}]");
        doc1.setSignatureData("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%2250%22%3E%3Cpath%20d%3D%22M%2010%2030%20Q%2030%2010%2050%2030%20T%2090%2030%20T%20130%2020%22%20fill%3D%22none%22%20stroke%3D%22blue%22%20stroke-width%3D%222%22%2F%3E%3Ctext%20x%3D%2210%22%20y%3D%2245%22%20font-family%3D%22cursive%22%20font-size%3D%2212%22%20fill%3D%22darkblue%22%3EDr.%20Hasan%20Mahmud%3C%2Ftext%3E%3C%2Fsvg%3E");
        doc1.setAvatarData("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22%230f766e%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2255%25%22%20font-size%3D%2236%22%20fill%3D%22white%22%20font-weight%3D%22bold%22%20font-family%3D%22Sora%2C%20sans-serif%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EHM%3C%2Ftext%3E%3C%2Fsvg%3E");
        doc1 = doctorRepository.save(doc1);

        Doctor doc2 = new Doctor();
        doc2.setUser(doc2User);
        doc2.setDoctorCode("DR-0002");
        doc2.setFirstName("Nasrin");
        doc2.setLastName("Sultana");
        doc2.setSpecialization("Gynecologist");
        doc2.setQualification("MBBS, FCPS (Gynecology)");
        doc2.setDepartment(gynecology);
        doc2.setPhone("01922-XXXXXX");
        doc2.setYearsOfExperience(8);
        doc2.setConsultationFee(new BigDecimal("700.00"));
        doc2.setAvailableDays("Mon, Wed, Sat");
        doc2.setIsAvailable(true);
        doc2.setJoinedDate(LocalDate.of(2021, 6, 1));
        doc2 = doctorRepository.save(doc2);

        Doctor doc3 = new Doctor();
        doc3.setUser(doc3User);
        doc3.setDoctorCode("DR-0003");
        doc3.setFirstName("Shahed");
        doc3.setLastName("Islam");
        doc3.setSpecialization("Neurologist");
        doc3.setQualification("MBBS, MD (Neurology)");
        doc3.setDepartment(neurology);
        doc3.setPhone("01811-XXXXXX");
        doc3.setYearsOfExperience(10);
        doc3.setConsultationFee(new BigDecimal("900.00"));
        doc3.setAvailableDays("Sun, Mon, Wed, Thu");
        doc3.setIsAvailable(true);
        doc3.setJoinedDate(LocalDate.of(2019, 3, 10));
        doc3 = doctorRepository.save(doc3);

        Doctor doc4 = new Doctor();
        doc4.setUser(doc4User);
        doc4.setDoctorCode("DR-0004");
        doc4.setFirstName("Mahbub");
        doc4.setLastName("Kabir");
        doc4.setSpecialization("Orthopedic Surgeon");
        doc4.setQualification("MBBS, MS (Orthopedics)");
        doc4.setDepartment(orthopedics);
        doc4.setPhone("01611-XXXXXX");
        doc4.setYearsOfExperience(15);
        doc4.setConsultationFee(new BigDecimal("1000.00"));
        doc4.setAvailableDays("Sun, Tue, Thu, Sat");
        doc4.setIsAvailable(true);
        doc4.setJoinedDate(LocalDate.of(2018, 8, 20));
        doc4 = doctorRepository.save(doc4);

        // Set head doctors for departments
        cardiology.setHeadDoctorId(doc1.getId());
        departmentRepository.save(cardiology);
        gynecology.setHeadDoctorId(doc2.getId());
        departmentRepository.save(gynecology);
        neurology.setHeadDoctorId(doc3.getId());
        departmentRepository.save(neurology);
        orthopedics.setHeadDoctorId(doc4.getId());
        departmentRepository.save(orthopedics);

        // --- Patients (matching frontend patient-management.html) ---
        Patient pat1 = createPatient(pat1User, "PT-0001", "Rahim", "Khan", LocalDate.of(1981, 3, 15),
                "Male", "A+", "01712-345678", "01812-456789", "Dhaka, Bangladesh",
                cardiology, doc1, "Admitted", LocalDateTime.now().minusDays(6));

        Patient pat2 = createPatient(null, "PT-0002", "Sadia", "Begum", LocalDate.of(1994, 8, 22),
                "Female", "B+", "01812-456789", null, "Chittagong, Bangladesh",
                gynecology, doc2, "Active", null);

        Patient pat3 = createPatient(null, "PT-0003", "Mohammed", "Rafiq", LocalDate.of(1959, 3, 10),
                "Male", "O-", "01912-567890", "01612-678901", "Sylhet, Bangladesh",
                emergency, doc1, "Critical", LocalDateTime.now().minusDays(1));

        Patient pat4 = createPatient(null, "PT-0004", "Taslima", "Haque", LocalDate.of(1998, 11, 5),
                "Female", "AB+", "01612-678901", null, "Rajshahi, Bangladesh",
                neurology, doc3, "Discharged", LocalDateTime.now().minusDays(13));

        createPatient(null, "PT-0005", "Jahangir", "Alam", LocalDate.of(1972, 7, 20),
                "Male", "A-", "01512-789012", null, "Khulna, Bangladesh",
                orthopedics, doc4, "Admitted", LocalDateTime.now().minusDays(3));

        createPatient(null, "PT-0006", "Nasima", "Akter", LocalDate.of(1985, 2, 14),
                "Female", "B-", "01312-890123", null, "Dhaka, Bangladesh",
                cardiology, doc1, "Active", null);

        createPatient(null, "PT-0007", "Karim", "Islam", LocalDate.of(1966, 9, 30),
                "Male", "O+", "01412-901234", null, "Barisal, Bangladesh",
                null, null, "Discharged", null);

        // --- Appointments (matching frontend appointment-system.html) ---
        Appointment apt1 = new Appointment();
        apt1.setAppointmentCode("APT-0001");
        apt1.setPatient(pat1);
        apt1.setDoctor(doc1);
        apt1.setAppointmentDate(LocalDate.now());
        apt1.setAppointmentTime(LocalTime.of(9, 0));
        apt1.setAppointmentType("Consultation");
        apt1.setStatus("Confirmed");
        apt1.setConsultationFee(new BigDecimal("800.00"));
        apt1.setReason("Regular cardiac checkup");
        appointmentRepository.save(apt1);

        Appointment apt2 = new Appointment();
        apt2.setAppointmentCode("APT-0002");
        apt2.setPatient(pat2);
        apt2.setDoctor(doc2);
        apt2.setAppointmentDate(LocalDate.now());
        apt2.setAppointmentTime(LocalTime.of(9, 30));
        apt2.setAppointmentType("Follow-up");
        apt2.setStatus("Pending");
        apt2.setConsultationFee(new BigDecimal("700.00"));
        apt2.setReason("Gynecology follow-up");
        appointmentRepository.save(apt2);

        Appointment apt3 = new Appointment();
        apt3.setAppointmentCode("APT-0003");
        apt3.setPatient(pat4);
        apt3.setDoctor(doc3);
        apt3.setAppointmentDate(LocalDate.now());
        apt3.setAppointmentTime(LocalTime.of(11, 15));
        apt3.setAppointmentType("Emergency");
        apt3.setStatus("Cancelled");
        apt3.setConsultationFee(new BigDecimal("900.00"));
        apt3.setReason("Neurology emergency");
        appointmentRepository.save(apt3);

        // Follow-up appointment for Rahim Khan (next week)
        Appointment apt4 = new Appointment();
        apt4.setAppointmentCode("APT-0004");
        apt4.setPatient(pat1);
        apt4.setDoctor(doc1);
        apt4.setAppointmentDate(LocalDate.now().plusDays(7));
        apt4.setAppointmentTime(LocalTime.of(10, 30));
        apt4.setAppointmentType("Follow-up");
        apt4.setStatus("Confirmed");
        apt4.setConsultationFee(new BigDecimal("800.00"));
        apt4.setReason("Post-treatment cardiac follow-up");
        appointmentRepository.save(apt4);

        // --- Invoices (matching frontend billing-system.html) ---
        Invoice inv1 = new Invoice();
        inv1.setInvoiceCode("INV-0001");
        inv1.setPatient(pat1);
        inv1.setTotalAmount(new BigDecimal("12500.00"));
        inv1.setPaidAmount(new BigDecimal("12500.00"));
        inv1.setDiscount(new BigDecimal("0"));
        inv1.setPaymentStatus("Paid");
        inv1.setPaymentMethod("Cash");

        InvoiceItem item1 = new InvoiceItem();
        item1.setInvoice(inv1);
        item1.setDescription("Consultation Fee");
        item1.setQuantity(1);
        item1.setUnitPrice(new BigDecimal("800.00"));
        item1.setTotalPrice(new BigDecimal("800.00"));

        InvoiceItem item2 = new InvoiceItem();
        item2.setInvoice(inv1);
        item2.setDescription("ECG Test");
        item2.setQuantity(1);
        item2.setUnitPrice(new BigDecimal("500.00"));
        item2.setTotalPrice(new BigDecimal("500.00"));

        InvoiceItem item3 = new InvoiceItem();
        item3.setInvoice(inv1);
        item3.setDescription("Room Charges (5 days)");
        item3.setQuantity(5);
        item3.setUnitPrice(new BigDecimal("2000.00"));
        item3.setTotalPrice(new BigDecimal("10000.00"));

        InvoiceItem item4 = new InvoiceItem();
        item4.setInvoice(inv1);
        item4.setDescription("Lipid Profile");
        item4.setQuantity(1);
        item4.setUnitPrice(new BigDecimal("1200.00"));
        item4.setTotalPrice(new BigDecimal("1200.00"));

        inv1.getItems().add(item1);
        inv1.getItems().add(item2);
        inv1.getItems().add(item3);
        inv1.getItems().add(item4);
        invoiceRepository.save(inv1);

        Invoice inv2 = new Invoice();
        inv2.setInvoiceCode("INV-0002");
        inv2.setPatient(pat2);
        inv2.setTotalAmount(new BigDecimal("1200.00"));
        inv2.setPaidAmount(new BigDecimal("0"));
        inv2.setDiscount(new BigDecimal("0"));
        inv2.setPaymentStatus("Unpaid");

        InvoiceItem item5 = new InvoiceItem();
        item5.setInvoice(inv2);
        item5.setDescription("Out-Patient Consultation");
        item5.setQuantity(1);
        item5.setUnitPrice(new BigDecimal("700.00"));
        item5.setTotalPrice(new BigDecimal("700.00"));

        InvoiceItem item6 = new InvoiceItem();
        item6.setInvoice(inv2);
        item6.setDescription("USG Abdomen");
        item6.setQuantity(1);
        item6.setUnitPrice(new BigDecimal("500.00"));
        item6.setTotalPrice(new BigDecimal("500.00"));

        inv2.getItems().add(item5);
        inv2.getItems().add(item6);
        invoiceRepository.save(inv2);

        Invoice inv3 = new Invoice();
        inv3.setInvoiceCode("INV-0003");
        inv3.setPatient(pat3);
        inv3.setTotalAmount(new BigDecimal("4800.00"));
        inv3.setPaidAmount(new BigDecimal("2000.00"));
        inv3.setDiscount(new BigDecimal("0"));
        inv3.setPaymentStatus("Partial");
        inv3.setPaymentMethod("Cash");

        InvoiceItem item7 = new InvoiceItem();
        item7.setInvoice(inv3);
        item7.setDescription("Emergency Treatment");
        item7.setQuantity(1);
        item7.setUnitPrice(new BigDecimal("3000.00"));
        item7.setTotalPrice(new BigDecimal("3000.00"));

        InvoiceItem item8 = new InvoiceItem();
        item8.setInvoice(inv3);
        item8.setDescription("X-Ray Chest");
        item8.setQuantity(1);
        item8.setUnitPrice(new BigDecimal("1800.00"));
        item8.setTotalPrice(new BigDecimal("1800.00"));

        inv3.getItems().add(item7);
        inv3.getItems().add(item8);
        invoiceRepository.save(inv3);

        // Unpaid invoice for Rahim Khan (medication & follow-up)
        Invoice inv4 = new Invoice();
        inv4.setInvoiceCode("INV-0004");
        inv4.setPatient(pat1);
        inv4.setTotalAmount(new BigDecimal("3500.00"));
        inv4.setPaidAmount(new BigDecimal("0"));
        inv4.setDiscount(new BigDecimal("0"));
        inv4.setPaymentStatus("Unpaid");

        InvoiceItem item9 = new InvoiceItem();
        item9.setInvoice(inv4);
        item9.setDescription("Cardiac Medication (1 month)");
        item9.setQuantity(1);
        item9.setUnitPrice(new BigDecimal("2500.00"));
        item9.setTotalPrice(new BigDecimal("2500.00"));

        InvoiceItem item10 = new InvoiceItem();
        item10.setInvoice(inv4);
        item10.setDescription("Follow-up Consultation Fee");
        item10.setQuantity(1);
        item10.setUnitPrice(new BigDecimal("1000.00"));
        item10.setTotalPrice(new BigDecimal("1000.00"));

        inv4.getItems().add(item9);
        inv4.getItems().add(item10);
        invoiceRepository.save(inv4);

        // --- Emergency Cases (matching frontend emergency.html) ---
        EmergencyCase emg1 = new EmergencyCase();
        emg1.setCaseCode("EMG-0001");
        emg1.setPatient(pat3);
        emg1.setDoctor(doc1);
        emg1.setPriorityLevel("P1");
        emg1.setTriageCategory("Cardiac Emergency");
        emg1.setChiefComplaint("Severe chest pain with shortness of breath");
        emg1.setVitalSigns("{\"bp\":\"180/110\",\"pulse\":128,\"temp\":38.2,\"spo2\":91}");
        emg1.setStatus("Active");
        emg1.setBedNumber("E-01");
        emergencyCaseRepository.save(emg1);

        // Create patient for 2nd emergency case
        Patient patEmg2 = createPatient(null, "PT-0031", "Anwar", "Khan", LocalDate.of(1954, 5, 8),
                "Male", "AB-", "01711-111222", "01811-222333", "Dhaka, Bangladesh",
                emergency, doc3, "Critical", LocalDateTime.now());

        EmergencyCase emg2 = new EmergencyCase();
        emg2.setCaseCode("EMG-0002");
        emg2.setPatient(patEmg2);
        emg2.setDoctor(doc3);
        emg2.setPriorityLevel("P1");
        emg2.setTriageCategory("Neurological Emergency");
        emg2.setChiefComplaint("Stroke symptoms, left side weakness");
        emg2.setVitalSigns("{\"bp\":\"200/120\",\"pulse\":92,\"temp\":37.5,\"spo2\":88}");
        emg2.setStatus("Active");
        emg2.setBedNumber("E-02");
        emergencyCaseRepository.save(emg2);

        // Create patients & emergency cases for P2 Urgent
        Patient patEmg3 = createPatient(null, "PT-0052", "Jalal", "Islam", LocalDate.of(1982, 4, 15),
                "Male", "A+", "01611-333444", null, "Gazipur, Bangladesh",
                emergency, doc4, "Admitted", LocalDateTime.now());

        EmergencyCase emg3 = new EmergencyCase();
        emg3.setCaseCode("EMG-0003");
        emg3.setPatient(patEmg3);
        emg3.setDoctor(doc4);
        emg3.setPriorityLevel("P2");
        emg3.setTriageCategory("Orthopedic Trauma");
        emg3.setChiefComplaint("Fracture — right arm, severe pain");
        emg3.setVitalSigns("{\"bp\":\"125/80\",\"pulse\":98,\"temp\":37.0,\"spo2\":98}");
        emg3.setStatus("Active");
        emg3.setBedNumber("E-03");
        emergencyCaseRepository.save(emg3);

        Patient patEmg4 = createPatient(null, "PT-0067", "Rina", "Akter", LocalDate.of(1998, 12, 3),
                "Female", "O+", "01511-444555", null, "Narayanganj, Bangladesh",
                emergency, doc1, "Admitted", LocalDateTime.now());

        EmergencyCase emg4 = new EmergencyCase();
        emg4.setCaseCode("EMG-0004");
        emg4.setPatient(patEmg4);
        emg4.setDoctor(doc1);
        emg4.setPriorityLevel("P2");
        emg4.setTriageCategory("Allergic Reaction");
        emg4.setChiefComplaint("Allergic reaction, hives, mild swelling");
        emg4.setVitalSigns("{\"bp\":\"118/76\",\"pulse\":105,\"temp\":37.4,\"spo2\":95}");
        emg4.setStatus("Active");
        emg4.setBedNumber("E-04");
        emergencyCaseRepository.save(emg4);

        // P3 Semi-Urgent cases
        Patient patEmg5 = createPatient(null, "PT-0089", "Kamal", "Hossain", LocalDate.of(1971, 6, 18),
                "Male", "B+", "01311-555666", null, "Comilla, Bangladesh",
                emergency, doc1, "Admitted", LocalDateTime.now());

        EmergencyCase emg5 = new EmergencyCase();
        emg5.setCaseCode("EMG-0005");
        emg5.setPatient(patEmg5);
        emg5.setDoctor(doc1);
        emg5.setPriorityLevel("P3");
        emg5.setTriageCategory("General");
        emg5.setChiefComplaint("Dizziness, mild headache, nausea");
        emg5.setVitalSigns("{\"bp\":\"140/90\",\"pulse\":82,\"temp\":37.0,\"spo2\":97}");
        emg5.setStatus("Active");
        emg5.setBedNumber("E-05");
        emergencyCaseRepository.save(emg5);

        Patient patEmg6 = createPatient(null, "PT-0101", "Fatema", "Noor", LocalDate.of(2007, 1, 25),
                "Female", "A+", "01211-666777", null, "Mymensingh, Bangladesh",
                emergency, doc4, "Admitted", LocalDateTime.now());

        EmergencyCase emg6 = new EmergencyCase();
        emg6.setCaseCode("EMG-0006");
        emg6.setPatient(patEmg6);
        emg6.setDoctor(doc4);
        emg6.setPriorityLevel("P3");
        emg6.setTriageCategory("Minor Trauma");
        emg6.setChiefComplaint("Minor laceration on forearm, needs sutures");
        emg6.setVitalSigns("{\"bp\":\"112/72\",\"pulse\":76,\"temp\":36.8,\"spo2\":99}");
        emg6.setStatus("Active");
        emg6.setBedNumber("E-06");
        emergencyCaseRepository.save(emg6);

        // --- Emergency Activity Log (matching frontend live activity feed) ---
        createActivity(emg2, patEmg2, "ARRIVAL", "critical",
                "Anwar Khan arrived — stroke symptoms, P1 assigned", "Dr. Shahed Islam");
        createActivity(emg1, pat3, "TREATMENT", "warning",
                "Dr. Kamal attending Mohammed Rafiq in Bay 1", "Dr. Hasan Mahmud");
        createActivity(emg4, patEmg4, "TREATMENT", "success",
                "Rina Akter — Adrenaline administered, improving", "Dr. Hasan Mahmud");
        createActivity(null, pat4, "DISCHARGE", "success",
                "Taslima Hoque discharged from emergency", "Dr. Shahed Islam");
        createActivity(emg3, patEmg3, "NOTE", "warning",
                "Bed 3 requested for Jalal Islam — Orthopedics", "Dr. Mahbub Kabir");

        log.info("Seeded: {} users, {} departments, {} doctors, {} patients, {} appointments, {} invoices, {} emergency cases, {} activities",
                userRepository.count(), departmentRepository.count(), doctorRepository.count(),
                patientRepository.count(), appointmentRepository.count(), invoiceRepository.count(),
                emergencyCaseRepository.count(), emergencyActivityRepository.count());
    }

    private User createUser(String email, String password, String role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setIsActive(true);
        return userRepository.save(user);
    }

    private Department createDept(String name, String code, int floor, String building,
                                   int capacity, int occupied, int nurses, String description) {
        Department dept = new Department();
        dept.setDepartmentName(name);
        dept.setDepartmentCode(code);
        dept.setFloorNumber(floor);
        dept.setBuilding(building);
        dept.setBedCapacity(capacity);
        dept.setOccupiedBeds(occupied);
        dept.setNurseCount(nurses);
        dept.setDescription(description);
        dept.setStatus(occupied >= capacity - 2 ? "Critical" : "Active");
        return departmentRepository.save(dept);
    }

    private Patient createPatient(User user, String code, String firstName, String lastName,
                                   LocalDate dob, String gender, String bloodGroup,
                                   String phone, String emergencyContact, String address,
                                   Department department, Doctor doctor,
                                   String status, LocalDateTime admissionDate) {
        Patient patient = new Patient();
        patient.setUser(user);
        patient.setPatientCode(code);
        patient.setFirstName(firstName);
        patient.setLastName(lastName);
        patient.setDateOfBirth(dob);
        patient.setGender(gender);
        patient.setBloodGroup(bloodGroup);
        patient.setPhone(phone);
        patient.setEmergencyContact(emergencyContact);
        patient.setAddress(address);
        patient.setDepartment(department);
        patient.setAssignedDoctor(doctor);
        patient.setStatus(status);
        patient.setAdmissionDate(admissionDate);
        return patientRepository.save(patient);
    }

    private void createActivity(EmergencyCase emergencyCase, Patient patient,
                                 String type, String severity,
                                 String description, String performedBy) {
        EmergencyActivity activity = new EmergencyActivity();
        activity.setEmergencyCase(emergencyCase);
        activity.setPatient(patient);
        activity.setActivityType(type);
        activity.setSeverity(severity);
        activity.setDescription(description);
        activity.setPerformedBy(performedBy);
        emergencyActivityRepository.save(activity);
    }
}
