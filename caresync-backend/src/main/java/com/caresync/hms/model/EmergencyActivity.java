package com.caresync.hms.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_activities")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emergency_id")
    private EmergencyCase emergencyCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(name = "activity_type", length = 30)
    private String activityType; // ARRIVAL, TRIAGE, TREATMENT, DISCHARGE, TRANSFER, NOTE

    @Column(name = "severity", length = 20)
    private String severity; // critical, warning, success, info

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "performed_by", length = 100)
    private String performedBy; // Doctor or staff name

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
