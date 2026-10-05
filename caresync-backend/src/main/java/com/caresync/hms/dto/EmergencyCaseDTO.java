package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyCaseDTO {

    private Long id;
    private String caseCode;

    @NotNull(message = "Patient ID is required")
    private Long patientId;
    private String patientName;

    private Long doctorId;
    private String doctorName;

    @NotBlank(message = "Priority level is required")
    private String priorityLevel;

    private String triageCategory;
    private LocalDateTime arrivalTime;

    // Optional: blank values are stored as "Not specified"
    private String chiefComplaint;

    private String vitalSigns;
    private String status;
    private String bedNumber;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
