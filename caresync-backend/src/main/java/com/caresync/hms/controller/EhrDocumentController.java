package com.caresync.hms.controller;

import com.caresync.hms.dto.EhrDocumentDTO;
import com.caresync.hms.service.EhrDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ehr-documents")
@RequiredArgsConstructor
public class EhrDocumentController {

    private final EhrDocumentService ehrDocumentService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<EhrDocumentDTO>> getDocumentsByPatientId(@PathVariable Long patientId) {
        return ResponseEntity.ok(ehrDocumentService.getDocumentsByPatientId(patientId));
    }

    @PostMapping
    public ResponseEntity<EhrDocumentDTO> uploadDocument(@RequestBody EhrDocumentDTO dto) {
        EhrDocumentDTO saved = ehrDocumentService.saveDocument(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        ehrDocumentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }
}
