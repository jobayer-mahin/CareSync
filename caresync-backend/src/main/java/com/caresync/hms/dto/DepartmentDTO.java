package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDTO {

    private Long id;

    @NotBlank(message = "Department name is required")
    private String departmentName;

    @NotBlank(message = "Department code is required")
    private String departmentCode;

    private Long headDoctorId;
    private String headDoctorName;
    private Integer floorNumber;
    private String building;
    private Integer bedCapacity;
    private Integer occupiedBeds;
    private Integer availableBeds;
    private Integer nurseCount;
    private String status;
    private String phoneExtension;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
