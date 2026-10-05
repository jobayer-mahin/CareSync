package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientDTO {

    private Long id;
    private Long userId;
    private String email;
    private String patientCode;

    // Only used when an admin creates/changes a patient login password; never returned in responses.
    private String password;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotNull(message = "Date of birth is required")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String bloodGroup;

    @NotBlank(message = "Phone is required")
    private String phone;

    private String emergencyContact;
    private String address;

    // Department info
    private Long departmentId;
    private String departmentName;

    // Assigned doctor info
    private Long assignedDoctorId;
    private String assignedDoctorName;

    private String initialDiagnosis;
    private String status;
    private LocalDateTime admissionDate;
    private LocalDateTime dischargeDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
