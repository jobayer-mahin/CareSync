package com.caresync.hms.service;

import com.caresync.hms.dto.EmergencyCaseDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.model.EmergencyCase;
import com.caresync.hms.model.Patient;
import com.caresync.hms.repository.DoctorRepository;
import com.caresync.hms.repository.EmergencyCaseRepository;
import com.caresync.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmergencyService {

    private final EmergencyCaseRepository emergencyCaseRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final NotificationService notificationService;

    private static final String NO_COMPLAINT = "Not specified";

    @Transactional(readOnly = true)
    public List<EmergencyCaseDTO> getAllCases() {
        return emergencyCaseRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmergencyCaseDTO getCaseById(Long id) {
        EmergencyCase ec = emergencyCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmergencyCase", "id", id));
        return toDTO(ec);
    }

    @Transactional
    public EmergencyCaseDTO createCase(EmergencyCaseDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", dto.getPatientId()));

        EmergencyCase ec = new EmergencyCase();
        ec.setPatient(patient);
        ec.setPriorityLevel(dto.getPriorityLevel());
        ec.setTriageCategory(dto.getTriageCategory());
        ec.setChiefComplaint(complaintOrDefault(dto.getChiefComplaint()));
        ec.setVitalSigns(dto.getVitalSigns());
        ec.setStatus(dto.getStatus() != null ? dto.getStatus() : "Active");
        ec.setBedNumber(dto.getBedNumber());
        ec.setNotes(dto.getNotes());

        if (dto.getDoctorId() != null) {
            Doctor doctor = doctorRepository.findById(dto.getDoctorId()).orElse(null);
            ec.setDoctor(doctor);
        }

        Long maxId = emergencyCaseRepository.findMaxId();
        ec.setCaseCode("EMG-" + String.format("%04d", maxId + 1));

        EmergencyCase saved = emergencyCaseRepository.save(ec);
        notifyEmergency(saved);
        return toDTO(saved);
    }

    private static String complaintOrDefault(String complaint) {
        return complaint == null || complaint.isBlank() ? NO_COMPLAINT : complaint.trim();
    }

    /** Raises an in-app alert for every admin and for the assigned doctor. */
    private void notifyEmergency(EmergencyCase ec) {
        String patientName = ec.getPatient() != null
                ? ec.getPatient().getFirstName() + " " + ec.getPatient().getLastName() : "A patient";
        String level = "P1".equals(ec.getPriorityLevel()) ? "Critical"
                : "P2".equals(ec.getPriorityLevel()) ? "Urgent" : "Semi-urgent";
        String title = "Emergency " + ec.getPriorityLevel() + " (" + level + "): " + patientName;
        StringBuilder msg = new StringBuilder(ec.getCaseCode()).append(" — ")
                .append(NO_COMPLAINT.equals(ec.getChiefComplaint()) ? "no complaint recorded" : ec.getChiefComplaint());
        if (ec.getBedNumber() != null && !ec.getBedNumber().isBlank()) {
            msg.append(" · Bed ").append(ec.getBedNumber());
        }
        notificationService.notifyRole("ADMIN", "EMERGENCY", title, msg.toString(), "/emergency.html");
        if (ec.getDoctor() != null && ec.getDoctor().getUser() != null) {
            notificationService.notifyUser(ec.getDoctor().getUser().getId(), "EMERGENCY", title,
                    msg.toString(), "/doctor-dashboard.html");
        }
    }

    @Transactional
    public EmergencyCaseDTO updateCase(Long id, EmergencyCaseDTO dto) {
        EmergencyCase ec = emergencyCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmergencyCase", "id", id));

        ec.setPriorityLevel(dto.getPriorityLevel());
        ec.setTriageCategory(dto.getTriageCategory());
        ec.setChiefComplaint(complaintOrDefault(dto.getChiefComplaint()));
        ec.setVitalSigns(dto.getVitalSigns());
        if (dto.getStatus() != null) ec.setStatus(dto.getStatus());
        ec.setBedNumber(dto.getBedNumber());
        ec.setNotes(dto.getNotes());

        if (dto.getDoctorId() != null) {
            Doctor doctor = doctorRepository.findById(dto.getDoctorId()).orElse(null);
            ec.setDoctor(doctor);
        }

        EmergencyCase updated = emergencyCaseRepository.save(ec);
        return toDTO(updated);
    }

    @Transactional(readOnly = true)
    public List<EmergencyCaseDTO> getActiveCases() {
        return emergencyCaseRepository.findByStatusOrderByArrivalTimeDesc("Active")
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public EmergencyCaseDTO admitCase(Long id) {
        EmergencyCase ec = emergencyCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmergencyCase", "id", id));
        ec.setStatus("Admitted");
        if (ec.getPatient() != null) {
            ec.getPatient().setStatus("Admitted");
            ec.getPatient().setAdmissionDate(java.time.LocalDateTime.now());
            patientRepository.save(ec.getPatient());
        }
        return toDTO(emergencyCaseRepository.save(ec));
    }

    @Transactional
    public EmergencyCaseDTO declineCase(Long id) {
        EmergencyCase ec = emergencyCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmergencyCase", "id", id));
        ec.setStatus("Declined");
        return toDTO(emergencyCaseRepository.save(ec));
    }

    @Transactional(readOnly = true)
    public List<EmergencyCaseDTO> getCasesByPriority(String level) {
        return emergencyCaseRepository.findByPriorityLevel(level)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    private EmergencyCaseDTO toDTO(EmergencyCase ec) {
        EmergencyCaseDTO dto = new EmergencyCaseDTO();
        dto.setId(ec.getId());
        dto.setCaseCode(ec.getCaseCode());
        dto.setPriorityLevel(ec.getPriorityLevel());
        dto.setTriageCategory(ec.getTriageCategory());
        dto.setArrivalTime(ec.getArrivalTime());
        dto.setChiefComplaint(ec.getChiefComplaint());
        dto.setVitalSigns(ec.getVitalSigns());
        dto.setStatus(ec.getStatus());
        dto.setBedNumber(ec.getBedNumber());
        dto.setNotes(ec.getNotes());
        dto.setCreatedAt(ec.getCreatedAt());
        dto.setUpdatedAt(ec.getUpdatedAt());

        if (ec.getPatient() != null) {
            dto.setPatientId(ec.getPatient().getId());
            dto.setPatientName(ec.getPatient().getFirstName() + " " + ec.getPatient().getLastName());
        }
        if (ec.getDoctor() != null) {
            dto.setDoctorId(ec.getDoctor().getId());
            dto.setDoctorName("Dr. " + ec.getDoctor().getFirstName() + " " + ec.getDoctor().getLastName());
        }
        return dto;
    }
}
