package com.caresync.hms.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctors")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "doctor_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "doctor_code", unique = true, nullable = false, length = 20)
    private String doctorCode;

    @NotBlank(message = "First name is required")
    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @NotBlank(message = "Specialization is required")
    @Column(nullable = false, length = 100)
    private String specialization;

    @Column(length = 200)
    private String qualification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @NotBlank(message = "Phone is required")
    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "consultation_fee", precision = 10, scale = 2)
    private BigDecimal consultationFee = BigDecimal.ZERO;

    @Column(name = "available_days", length = 100)
    private String availableDays;

    @Column(name = "is_available")
    private Boolean isAvailable = true;

    @Column(name = "joined_date")
    private LocalDate joinedDate;

    @Lob
    @Column(name = "avatar_data", columnDefinition = "LONGTEXT")
    private String avatarData;

    @Lob
    @Column(name = "signature_data", columnDefinition = "LONGTEXT")
    private String signatureData;

    @Column(name = "biography", columnDefinition = "TEXT")
    private String biography;

    @Column(name = "available_slots", columnDefinition = "TEXT")
    private String availableSlots;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
