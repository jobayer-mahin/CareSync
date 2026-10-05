package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorDTO {

    private Long id;
    private Long userId;
    private String email;
    private String password;
    private String doctorCode;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Specialization is required")
    private String specialization;

    private String qualification;
    private Long departmentId;
    private String departmentName;

    @NotBlank(message = "Phone is required")
    private String phone;

    private Integer yearsOfExperience;
    private BigDecimal consultationFee;
    private String availableDays;
    private Boolean isAvailable;
    private LocalDate joinedDate;
    private String avatarData;
    private String signatureData;
    private String biography;
    private String availableSlots;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
