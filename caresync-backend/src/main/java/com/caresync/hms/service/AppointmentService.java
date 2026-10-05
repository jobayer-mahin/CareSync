package com.caresync.hms.service;

import com.caresync.hms.dto.AppointmentDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Appointment;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.model.Patient;
import com.caresync.hms.repository.AppointmentRepository;
import com.caresync.hms.repository.DoctorRepository;
import com.caresync.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    private static final DateTimeFormatter WHEN_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);

    @Transactional(readOnly = true)
    public List<AppointmentDTO> getAllAppointments() {
        return appointmentRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AppointmentDTO getAppointmentById(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", id));
        return convertToDTO(appointment);
    }

    @Transactional
    public AppointmentDTO createAppointment(AppointmentDTO dto) {
        Appointment appointment = convertToEntity(dto);

        // Booking rule: if the doctor has a schedule the time must match it,
        // if the doctor has no schedule any time is accepted.
        validateAgainstDoctorSchedule(appointment.getDoctor(),
                appointment.getAppointmentDate(), appointment.getAppointmentTime());

        Long maxId = appointmentRepository.findMaxId();
        appointment.setAppointmentCode("APT-" + String.format("%04d", maxId + 1));

        if (appointment.getStatus() == null) {
            appointment.setStatus("Pending");
        }

        // The consultation fee is fixed at booking time from the doctor's current fee.
        // It is never taken from the request and never changed afterwards.
        BigDecimal fee = appointment.getDoctor().getConsultationFee();
        appointment.setConsultationFee(fee != null ? fee : BigDecimal.ZERO);

        Appointment saved = appointmentRepository.save(appointment);

        // Let the doctor know about the new booking
        if (saved.getDoctor() != null && saved.getDoctor().getUser() != null) {
            notificationService.notifyUser(saved.getDoctor().getUser().getId(), "APPOINTMENT",
                    "New appointment booked",
                    saved.getPatient().getFirstName() + " " + saved.getPatient().getLastName()
                            + " booked an appointment for " + formatWhen(saved.getAppointmentDate(), saved.getAppointmentTime()) + ".",
                    "/doctor-schedule.html");
        }
        
        // Send email reminder
        if (saved.getPatient() != null && saved.getPatient().getUser() != null && saved.getPatient().getUser().getEmail() != null) {
            emailService.sendAppointmentReminder(
                    saved.getPatient().getUser().getEmail(),
                    saved.getPatient().getFirstName() + " " + saved.getPatient().getLastName(),
                    saved.getAppointmentDate().toString(),
                    saved.getAppointmentTime().toString(),
                    saved.getDoctor().getFirstName() + " " + saved.getDoctor().getLastName()
            );
        }

        return convertToDTO(saved);
    }

    @Transactional
    public AppointmentDTO updateAppointment(Long id, AppointmentDTO dto) {
        Appointment existing = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", id));

        LocalDate oldDate = existing.getAppointmentDate();
        LocalTime oldTime = existing.getAppointmentTime();
        String oldStatus = existing.getStatus();
        Long oldDoctorId = existing.getDoctor() != null ? existing.getDoctor().getId() : null;

        // Resolve the target doctor first so the schedule check uses the right schedule.
        Doctor targetDoctor = existing.getDoctor();
        if (dto.getDoctorId() != null) {
            targetDoctor = doctorRepository.findById(dto.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", dto.getDoctorId()));
        }
        // Only re-check the schedule when the slot or the doctor actually changes, so that
        // confirming / completing / cancelling an existing appointment never gets blocked.
        boolean slotMoved = !java.util.Objects.equals(oldDate, dto.getAppointmentDate())
                || !java.util.Objects.equals(oldTime, dto.getAppointmentTime())
                || (targetDoctor != null && !java.util.Objects.equals(oldDoctorId, targetDoctor.getId()));
        if (slotMoved) {
            validateAgainstDoctorSchedule(targetDoctor, dto.getAppointmentDate(), dto.getAppointmentTime());
        }

        existing.setAppointmentDate(dto.getAppointmentDate());
        existing.setAppointmentTime(dto.getAppointmentTime());
        if (dto.getAppointmentType() != null) existing.setAppointmentType(dto.getAppointmentType());
        if (dto.getStatus() != null) existing.setStatus(dto.getStatus());
        // Reason is optional
        existing.setReason(dto.getReason());
        existing.setNotes(dto.getNotes());
        // NOTE: consultationFee is deliberately NOT updated here. It is locked once booked.
        // (Old rows created before the fee was stored get it filled in from the doctor once.)

        if (dto.getPatientId() != null) {
            Patient patient = patientRepository.findById(dto.getPatientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", dto.getPatientId()));
            existing.setPatient(patient);
        }

        if (dto.getDoctorId() != null) {
            existing.setDoctor(targetDoctor);
        }

        if (existing.getConsultationFee() == null && existing.getDoctor() != null) {
            BigDecimal fee = existing.getDoctor().getConsultationFee();
            existing.setConsultationFee(fee != null ? fee : BigDecimal.ZERO);
        }

        Appointment updated = appointmentRepository.save(existing);

        boolean timeChanged = !java.util.Objects.equals(oldDate, updated.getAppointmentDate())
                || !java.util.Objects.equals(oldTime, updated.getAppointmentTime());
        boolean statusChanged = oldStatus != null && updated.getStatus() != null
                && !oldStatus.equals(updated.getStatus());
        if (timeChanged || statusChanged) {
            notifyPatientOfChange(updated, oldDate, oldTime, timeChanged, statusChanged);
        }

        return convertToDTO(updated);
    }

    @Transactional
    public void deleteAppointment(Long id) {
        if (!appointmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Appointment", "id", id);
        }
        appointmentRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO> getAppointmentsByPatient(Long patientId) {
        return appointmentRepository.findByPatient_Id(patientId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO> getAppointmentsByDoctor(Long doctorId) {
        return appointmentRepository.findByDoctor_Id(doctorId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO> getTodayAppointments() {
        return appointmentRepository.findTodayAppointments(LocalDate.now()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Enforces the doctor's schedule.
     * - Doctor has a schedule (availableSlots): date + time must fall inside one of the slots.
     * - Doctor has no schedule: the patient may book any time.
     */
    private void validateAgainstDoctorSchedule(Doctor doctor, LocalDate date, LocalTime time) {
        if (doctor == null) return;
        String slots = doctor.getAvailableSlots();
        if (!DoctorSchedule.hasSchedule(slots)) return;
        if (!DoctorSchedule.isWithinSchedule(slots, date, time)) {
            throw new IllegalArgumentException(
                    "Dr. " + doctor.getFirstName() + " " + doctor.getLastName()
                            + " is not available at the selected time. Available schedule: "
                            + DoctorSchedule.describe(slots) + ".");
        }
    }

    private static String formatWhen(LocalDate date, LocalTime time) {
        if (date == null) return "—";
        return (time != null ? date.atTime(time) : date.atStartOfDay()).format(WHEN_FORMAT);
    }

    /** Tells the patient (in-app + e-mail) that their appointment time and/or status changed. */
    private void notifyPatientOfChange(Appointment a, LocalDate oldDate, LocalTime oldTime,
                                       boolean timeChanged, boolean statusChanged) {
        if (a.getPatient() == null || a.getPatient().getUser() == null) return;

        String doctorName = a.getDoctor() != null
                ? "Dr. " + a.getDoctor().getFirstName() + " " + a.getDoctor().getLastName() : "your doctor";
        String code = a.getAppointmentCode() != null ? a.getAppointmentCode() : "";

        StringBuilder text = new StringBuilder();
        String title;
        if (timeChanged) {
            title = "Appointment time updated";
            text.append("Your appointment ").append(code).append(" with ").append(doctorName)
                .append(" has been rescheduled from ").append(formatWhen(oldDate, oldTime))
                .append(" to ").append(formatWhen(a.getAppointmentDate(), a.getAppointmentTime())).append(".");
            if (statusChanged) text.append(" Status is now ").append(a.getStatus()).append(".");
        } else {
            title = "Appointment " + a.getStatus().toLowerCase();
            text.append("Your appointment ").append(code).append(" with ").append(doctorName)
                .append(" on ").append(formatWhen(a.getAppointmentDate(), a.getAppointmentTime()))
                .append(" is now ").append(a.getStatus()).append(".");
        }

        Long userId = a.getPatient().getUser().getId();
        notificationService.notifyUser(userId, "APPOINTMENT", title, text.toString(), "/patient-appointments.html");

        String email = a.getPatient().getUser().getEmail();
        if (email != null && !email.endsWith("@patient.caresync.local")) {
            emailService.sendAppointmentUpdate(email,
                    a.getPatient().getFirstName() + " " + a.getPatient().getLastName(), text.toString());
        }
    }

    private AppointmentDTO convertToDTO(Appointment appointment) {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setId(appointment.getId());
        dto.setAppointmentCode(appointment.getAppointmentCode());
        dto.setAppointmentDate(appointment.getAppointmentDate());
        dto.setAppointmentTime(appointment.getAppointmentTime());
        dto.setAppointmentType(appointment.getAppointmentType());
        dto.setStatus(appointment.getStatus());
        dto.setConsultationFee(appointment.getConsultationFee());
        dto.setReason(appointment.getReason());
        dto.setNotes(appointment.getNotes());
        dto.setCreatedAt(appointment.getCreatedAt());
        dto.setUpdatedAt(appointment.getUpdatedAt());

        if (appointment.getPatient() != null) {
            dto.setPatientId(appointment.getPatient().getId());
            dto.setPatientName(
                    appointment.getPatient().getFirstName() + " " + appointment.getPatient().getLastName());
        }

        if (appointment.getDoctor() != null) {
            dto.setDoctorId(appointment.getDoctor().getId());
            dto.setDoctorName(
                    appointment.getDoctor().getFirstName() + " " + appointment.getDoctor().getLastName());
        }

        return dto;
    }

    private Appointment convertToEntity(AppointmentDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", dto.getPatientId()));

        Doctor doctor = doctorRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", dto.getDoctorId()));

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(dto.getAppointmentDate());
        appointment.setAppointmentTime(dto.getAppointmentTime());
        appointment.setAppointmentType(dto.getAppointmentType());
        appointment.setStatus(dto.getStatus());
        appointment.setReason(dto.getReason());
        appointment.setNotes(dto.getNotes());
        return appointment;
    }
}
