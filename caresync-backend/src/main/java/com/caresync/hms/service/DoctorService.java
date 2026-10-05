package com.caresync.hms.service;

import com.caresync.hms.dto.DoctorDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Department;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.model.User;
import com.caresync.hms.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.caresync.hms.repository.DepartmentRepository;
import com.caresync.hms.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<DoctorDTO> getAllDoctors() {
        return doctorRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoctorDTO> searchDoctors(String name) {
        String q = name == null ? "" : name.trim();
        if (q.isBlank()) return getAllDoctors();
        return doctorRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(q, q)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DoctorDTO getDoctorById(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", id));
        return convertToDTO(doctor);
    }

    @Transactional
    public DoctorDTO createDoctor(DoctorDTO doctorDTO) {
        if (doctorDTO.getEmail() == null || doctorDTO.getEmail().isBlank()) throw new IllegalArgumentException("Doctor email is required");
        if (doctorDTO.getPassword() == null || doctorDTO.getPassword().isBlank()) throw new IllegalArgumentException("Doctor password is required");
        if (userRepository.existsByEmail(doctorDTO.getEmail())) throw new IllegalArgumentException("Email already registered");
        User user = new User(); user.setEmail(doctorDTO.getEmail().trim().toLowerCase()); user.setPasswordHash(passwordEncoder.encode(doctorDTO.getPassword())); user.setRole("DOCTOR"); user.setIsActive(true);
        doctorDTO.setEmail(user.getEmail());
        Doctor doctor = convertToEntity(doctorDTO); doctor.setUser(userRepository.save(user));

        // Generate doctor code
        Long maxId = doctorRepository.findMaxId();
        doctor.setDoctorCode("DR-" + String.format("%04d", maxId + 1));

        if (doctor.getIsAvailable() == null) {
            doctor.setIsAvailable(true);
        }

        Doctor savedDoctor = doctorRepository.save(doctor);
        return convertToDTO(savedDoctor);
    }

    @Transactional
    public DoctorDTO updateDoctor(Long id, DoctorDTO doctorDTO) {
        Doctor existingDoctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", id));

        if (doctorDTO.getEmail() != null && !doctorDTO.getEmail().isBlank() && existingDoctor.getUser() != null) {
            if (!existingDoctor.getUser().getEmail().equalsIgnoreCase(doctorDTO.getEmail()) && userRepository.existsByEmail(doctorDTO.getEmail())) throw new IllegalArgumentException("Email already registered");
            existingDoctor.getUser().setEmail(doctorDTO.getEmail().trim().toLowerCase());
            if (doctorDTO.getPassword() != null && !doctorDTO.getPassword().isBlank()) existingDoctor.getUser().setPasswordHash(passwordEncoder.encode(doctorDTO.getPassword()));
            userRepository.save(existingDoctor.getUser());
        }
        existingDoctor.setFirstName(doctorDTO.getFirstName());
        existingDoctor.setLastName(doctorDTO.getLastName());
        existingDoctor.setSpecialization(doctorDTO.getSpecialization());
        existingDoctor.setQualification(doctorDTO.getQualification());
        existingDoctor.setPhone(doctorDTO.getPhone());
        existingDoctor.setYearsOfExperience(doctorDTO.getYearsOfExperience());
        existingDoctor.setConsultationFee(doctorDTO.getConsultationFee());
        existingDoctor.setAvailableDays(doctorDTO.getAvailableDays());
        existingDoctor.setIsAvailable(doctorDTO.getIsAvailable());
        existingDoctor.setJoinedDate(doctorDTO.getJoinedDate());
        existingDoctor.setAvatarData(doctorDTO.getAvatarData());
        existingDoctor.setSignatureData(doctorDTO.getSignatureData());
        existingDoctor.setBiography(doctorDTO.getBiography());
        existingDoctor.setAvailableSlots(doctorDTO.getAvailableSlots());

        if (doctorDTO.getDepartmentId() != null) {
            Department department = departmentRepository.findById(doctorDTO.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", doctorDTO.getDepartmentId()));
            existingDoctor.setDepartment(department);
        }

        Doctor updatedDoctor = doctorRepository.save(existingDoctor);
        return convertToDTO(updatedDoctor);
    }

    @Transactional
    public void deleteDoctor(Long id) {
        if (!doctorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Doctor", "id", id);
        }
        doctorRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<DoctorDTO> getDoctorsByDepartment(Long departmentId) {
        return doctorRepository.findByDepartment_Id(departmentId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // DTO conversion methods
    private DoctorDTO convertToDTO(Doctor doctor) {
        DoctorDTO dto = new DoctorDTO();
        dto.setId(doctor.getId());
        dto.setDoctorCode(doctor.getDoctorCode());
        dto.setFirstName(doctor.getFirstName());
        dto.setLastName(doctor.getLastName());
        dto.setSpecialization(doctor.getSpecialization());
        dto.setQualification(doctor.getQualification());
        dto.setPhone(doctor.getPhone());
        dto.setYearsOfExperience(doctor.getYearsOfExperience());
        dto.setConsultationFee(doctor.getConsultationFee());
        dto.setAvailableDays(doctor.getAvailableDays());
        dto.setIsAvailable(doctor.getIsAvailable());
        dto.setJoinedDate(doctor.getJoinedDate());
        dto.setAvatarData(doctor.getAvatarData());
        dto.setSignatureData(doctor.getSignatureData());
        dto.setBiography(doctor.getBiography());
        dto.setAvailableSlots(doctor.getAvailableSlots());
        dto.setCreatedAt(doctor.getCreatedAt());
        dto.setUpdatedAt(doctor.getUpdatedAt());

        if (doctor.getUser() != null) {
            dto.setUserId(doctor.getUser().getId());
            dto.setEmail(doctor.getUser().getEmail());
            dto.setPassword(null);
        }

        if (doctor.getDepartment() != null) {
            dto.setDepartmentId(doctor.getDepartment().getId());
            dto.setDepartmentName(doctor.getDepartment().getDepartmentName());
        }

        return dto;
    }

    private Doctor convertToEntity(DoctorDTO dto) {
        Doctor doctor = new Doctor();
        doctor.setFirstName(dto.getFirstName());
        doctor.setLastName(dto.getLastName());
        doctor.setSpecialization(dto.getSpecialization());
        doctor.setQualification(dto.getQualification());
        doctor.setPhone(dto.getPhone());
        doctor.setYearsOfExperience(dto.getYearsOfExperience());
        doctor.setConsultationFee(dto.getConsultationFee());
        doctor.setAvailableDays(dto.getAvailableDays());
        doctor.setIsAvailable(dto.getIsAvailable());
        doctor.setJoinedDate(dto.getJoinedDate());
        doctor.setAvatarData(dto.getAvatarData());
        doctor.setSignatureData(dto.getSignatureData());
        doctor.setBiography(dto.getBiography());
        doctor.setAvailableSlots(dto.getAvailableSlots());

        if (dto.getDepartmentId() != null) {
            Department department = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", dto.getDepartmentId()));
            doctor.setDepartment(department);
        }

        return doctor;
    }
}
