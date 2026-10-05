package com.caresync.hms.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ehr_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EhrDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "document_name", nullable = false)
    private String documentName;

    @Column(name = "file_size", nullable = false)
    private Integer fileSize;

    @Column(name = "file_type", nullable = false, length = 100)
    private String fileType;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "file_data", nullable = false, columnDefinition = "LONGTEXT")
    private String fileData;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;
}
