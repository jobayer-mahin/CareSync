package com.caresync.hms.service;

import com.caresync.hms.dto.PatientDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Department;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.model.Patient;
import com.caresync.hms.model.User;
import com.caresync.hms.repository.DepartmentRepository;
import com.caresync.hms.repository.DoctorRepository;
import com.caresync.hms.repository.PatientRepository;
import com.caresync.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<PatientDTO> getAllPatients() {
        return patientRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PatientDTO getPatientById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", id));
        return convertToDTO(patient);
    }

    @Transactional
    public PatientDTO createPatient(PatientDTO patientDTO) {
        Patient patient = convertToEntity(patientDTO);

        // Generate patient code
        // Pick the next free code (seed data uses a few hand-written codes such as PT-0031)
        long next = patientRepository.findMaxId() + 1;
        String code = "PT-" + String.format("%04d", next);
        while (patientRepository.findByPatientCode(code).isPresent()) {
            next++;
            code = "PT-" + String.format("%04d", next);
        }
        patient.setPatientCode(code);

        if (patient.getStatus() == null) {
            patient.setStatus("Active");
        }

        if (patientDTO.getPassword() == null || patientDTO.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required when creating a patient");
        }

        // Every admin-created patient gets a PATIENT login. The patient logs in with
        // the generated patient code (e.g. PT-0008) and the password set by admin.
        User user = new User();
        user.setEmail(patient.getPatientCode().toLowerCase() + "@patient.caresync.local");
        user.setPasswordHash(passwordEncoder.encode(patientDTO.getPassword()));
        user.setRole("PATIENT");
        user.setIsActive(true);
        user = userRepository.save(user);
        patient.setUser(user);

        Patient savedPatient = patientRepository.save(patient);
        PatientDTO response = convertToDTO(savedPatient);
        response.setPassword(null);
        return response;
    }

    @Transactional
    public PatientDTO updatePatient(Long id, PatientDTO patientDTO) {
        Patient existingPatient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", id));

        existingPatient.setFirstName(patientDTO.getFirstName());
        existingPatient.setLastName(patientDTO.getLastName());
        existingPatient.setDateOfBirth(patientDTO.getDateOfBirth());
        existingPatient.setGender(patientDTO.getGender());
        existingPatient.setBloodGroup(patientDTO.getBloodGroup());
        existingPatient.setPhone(patientDTO.getPhone());
        existingPatient.setEmergencyContact(patientDTO.getEmergencyContact());
        existingPatient.setAddress(patientDTO.getAddress());
        existingPatient.setInitialDiagnosis(patientDTO.getInitialDiagnosis());
        existingPatient.setStatus(patientDTO.getStatus());
        existingPatient.setAdmissionDate(patientDTO.getAdmissionDate());
        existingPatient.setDischargeDate(patientDTO.getDischargeDate());

        if (patientDTO.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(patientDTO.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", patientDTO.getDepartmentId()));
            existingPatient.setDepartment(dept);
        }

        if (patientDTO.getAssignedDoctorId() != null) {
            Doctor doc = doctorRepository.findById(patientDTO.getAssignedDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", patientDTO.getAssignedDoctorId()));
            existingPatient.setAssignedDoctor(doc);
        }

        // Password is optional during edit; when supplied, it changes the patient's login password.
        if (patientDTO.getPassword() != null && !patientDTO.getPassword().isBlank()) {
            User user = existingPatient.getUser();
            if (user == null) {
                user = new User();
                user.setEmail(existingPatient.getPatientCode().toLowerCase() + "@patient.caresync.local");
                user.setRole("PATIENT");
                user.setIsActive(true);
                existingPatient.setUser(user);
            }
            user.setPasswordHash(passwordEncoder.encode(patientDTO.getPassword()));
            userRepository.save(user);
        }

        Patient updatedPatient = patientRepository.save(existingPatient);
        PatientDTO response = convertToDTO(updatedPatient);
        response.setPassword(null);
        return response;
    }

    @Transactional
    public PatientDTO qrCheckIn(String qrText) {
        if (qrText == null || qrText.isBlank()) throw new IllegalArgumentException("Empty QR code");
        String code = null; Long id = null;
        for (String part : qrText.split("\\|")) {
            if (part.startsWith("PATIENT:")) code = part.substring(8).trim();
            if (part.startsWith("ID:")) try { id = Long.valueOf(part.substring(3).trim()); } catch (NumberFormatException ignored) {}
        }
        Patient p = code != null ? patientRepository.findByPatientCode(code).orElse(null) : null;
        if (p == null && id != null) p = patientRepository.findById(id).orElse(null);
        if (p == null) throw new ResourceNotFoundException("Patient", "QR code", qrText);
        p.setStatus("Admitted");
        p.setAdmissionDate(java.time.LocalDateTime.now());
        p.setDischargeDate(null);
        return convertToDTO(patientRepository.save(p));
    }

    @Transactional
    public void deletePatient(Long id) {
        if (!patientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patient", "id", id);
        }
        patientRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<PatientDTO> searchPatients(String searchTerm) {
        if (searchTerm == null || searchTerm.isBlank()) {
            return getAllPatients();
        }

        return patientRepository
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(searchTerm.trim(), searchTerm.trim())
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PatientDTO> getRecentPatientsByStatus(String status) {
        return patientRepository.findRecentByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PatientDTO> getPatientsByStatus(String status) {
        return patientRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // DTO conversion methods
    private PatientDTO convertToDTO(Patient patient) {
        PatientDTO dto = new PatientDTO();
        dto.setId(patient.getId());
        dto.setPatientCode(patient.getPatientCode());
        dto.setPassword(null);
        dto.setFirstName(patient.getFirstName());
        dto.setLastName(patient.getLastName());
        dto.setDateOfBirth(patient.getDateOfBirth());
        dto.setGender(patient.getGender());
        dto.setBloodGroup(patient.getBloodGroup());
        dto.setPhone(patient.getPhone());
        dto.setEmergencyContact(patient.getEmergencyContact());
        dto.setAddress(patient.getAddress());
        dto.setInitialDiagnosis(patient.getInitialDiagnosis());
        dto.setStatus(patient.getStatus());
        dto.setAdmissionDate(patient.getAdmissionDate());
        dto.setDischargeDate(patient.getDischargeDate());
        dto.setCreatedAt(patient.getCreatedAt());
        dto.setUpdatedAt(patient.getUpdatedAt());

        if (patient.getUser() != null) {
            dto.setUserId(patient.getUser().getId());
            dto.setEmail(patient.getUser().getEmail());
        }

        if (patient.getDepartment() != null) {
            dto.setDepartmentId(patient.getDepartment().getId());
            dto.setDepartmentName(patient.getDepartment().getDepartmentName());
        }

        if (patient.getAssignedDoctor() != null) {
            dto.setAssignedDoctorId(patient.getAssignedDoctor().getId());
            dto.setAssignedDoctorName("Dr. " + patient.getAssignedDoctor().getFirstName()
                    + " " + patient.getAssignedDoctor().getLastName());
        }

        return dto;
    }

    private Patient convertToEntity(PatientDTO dto) {
        Patient patient = new Patient();
        patient.setFirstName(dto.getFirstName());
        patient.setLastName(dto.getLastName());
        patient.setDateOfBirth(dto.getDateOfBirth());
        patient.setGender(dto.getGender());
        patient.setBloodGroup(dto.getBloodGroup());
        patient.setPhone(dto.getPhone());
        patient.setEmergencyContact(dto.getEmergencyContact());
        patient.setAddress(dto.getAddress());
        patient.setInitialDiagnosis(dto.getInitialDiagnosis());
        patient.setStatus(dto.getStatus());
        patient.setAdmissionDate(dto.getAdmissionDate());
        patient.setDischargeDate(dto.getDischargeDate());

        if (dto.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", dto.getDepartmentId()));
            patient.setDepartment(dept);
        }

        if (dto.getAssignedDoctorId() != null) {
            Doctor doc = doctorRepository.findById(dto.getAssignedDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", dto.getAssignedDoctorId()));
            patient.setAssignedDoctor(doc);
        }

        return patient;
    }
}
