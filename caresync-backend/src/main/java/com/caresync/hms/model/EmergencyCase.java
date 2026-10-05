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
@Table(name = "emergency_cases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emergency_id")
    private Long id;

    @Column(name = "case_code", unique = true, nullable = false, length = 20)
    private String caseCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @NotBlank(message = "Priority level is required")
    @Column(name = "priority_level", nullable = false, length = 10)
    private String priorityLevel; // P1=Critical, P2=Urgent, P3=Semi-Urgent

    @Column(name = "triage_category", length = 50)
    private String triageCategory;

    @Column(name = "arrival_time")
    private LocalDateTime arrivalTime = LocalDateTime.now();

    // Optional on input: a blank complaint is stored as "Not specified" (see EmergencyService)
    @Column(name = "chief_complaint", columnDefinition = "TEXT", nullable = false)
    private String chiefComplaint;

    @Column(name = "vital_signs", columnDefinition = "TEXT")
    private String vitalSigns; // Store as JSON string

    @Column(length = 20)
    private String status = "Active"; // Active, Admitted, Discharged, Transferred

    @Column(name = "bed_number", length = 10)
    private String bedNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
