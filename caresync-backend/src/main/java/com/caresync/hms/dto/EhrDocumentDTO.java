package com.caresync.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EhrDocumentDTO {
    private Long id;
    private Long patientId;
    private String documentName;
    private Integer fileSize;
    private String fileType;
    private String category;
    private String fileData;
    private LocalDateTime uploadedAt;
}
