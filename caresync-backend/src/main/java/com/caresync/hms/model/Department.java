package com.caresync.hms.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "department_id")
    private Long id;

    @NotBlank(message = "Department name is required")
    @Column(name = "department_name", unique = true, nullable = false, length = 50)
    private String departmentName;

    @NotBlank(message = "Department code is required")
    @Column(name = "department_code", unique = true, nullable = false, length = 10)
    private String departmentCode;

    @Column(name = "head_doctor_id")
    private Long headDoctorId;

    @Column(name = "floor_number")
    private Integer floorNumber;

    @Column(name = "building", length = 50)
    private String building; // Building A, Building B, Building C

    @Column(name = "bed_capacity")
    private Integer bedCapacity = 0;

    @Column(name = "occupied_beds")
    private Integer occupiedBeds = 0;

    @Column(name = "nurse_count")
    private Integer nurseCount = 0;

    @Column(length = 20)
    private String status = "Active"; // Active, Critical

    @Column(name = "phone_extension", length = 10)
    private String phoneExtension;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
