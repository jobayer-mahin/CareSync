package com.caresync.hms.service;

import com.caresync.hms.dto.EhrDocumentDTO;
import com.caresync.hms.model.EhrDocument;
import com.caresync.hms.model.Patient;
import com.caresync.hms.repository.EhrDocumentRepository;
import com.caresync.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EhrDocumentService {

    private final EhrDocumentRepository ehrDocumentRepository;
    private final PatientRepository patientRepository;

    @Transactional(readOnly = true)
    public List<EhrDocumentDTO> getDocumentsByPatientId(Long patientId) {
        return ehrDocumentRepository.findByPatient_IdOrderByUploadedAtDesc(patientId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public EhrDocumentDTO saveDocument(EhrDocumentDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found with id: " + dto.getPatientId()));

        EhrDocument doc = new EhrDocument();
        doc.setPatient(patient);
        doc.setDocumentName(dto.getDocumentName());
        doc.setFileSize(dto.getFileSize());
        doc.setFileType(dto.getFileType());
        doc.setCategory(dto.getCategory());
        doc.setFileData(dto.getFileData());

        EhrDocument saved = ehrDocumentRepository.save(doc);
        return convertToDTO(saved);
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        if (!ehrDocumentRepository.existsById(documentId)) {
            throw new IllegalArgumentException("Document not found with id: " + documentId);
        }
        ehrDocumentRepository.deleteById(documentId);
    }

    private EhrDocumentDTO convertToDTO(EhrDocument doc) {
        EhrDocumentDTO dto = new EhrDocumentDTO();
        dto.setId(doc.getId());
        dto.setPatientId(doc.getPatient().getId());
        dto.setDocumentName(doc.getDocumentName());
        dto.setFileSize(doc.getFileSize());
        dto.setFileType(doc.getFileType());
        dto.setCategory(doc.getCategory());
        dto.setFileData(doc.getFileData());
        dto.setUploadedAt(doc.getUploadedAt());
        return dto;
    }
}
