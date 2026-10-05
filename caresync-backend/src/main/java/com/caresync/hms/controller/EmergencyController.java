package com.caresync.hms.controller;

import com.caresync.hms.dto.EmergencyCaseDTO;
import com.caresync.hms.service.EmergencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergency")
@RequiredArgsConstructor
public class EmergencyController {

    private final EmergencyService emergencyService;

    @GetMapping
    public ResponseEntity<List<EmergencyCaseDTO>> getAllCases() {
        return ResponseEntity.ok(emergencyService.getAllCases());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmergencyCaseDTO> getCaseById(@PathVariable Long id) {
        return ResponseEntity.ok(emergencyService.getCaseById(id));
    }

    @PostMapping
    public ResponseEntity<EmergencyCaseDTO> createCase(@Valid @RequestBody EmergencyCaseDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(emergencyService.createCase(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmergencyCaseDTO> updateCase(@PathVariable Long id, @Valid @RequestBody EmergencyCaseDTO dto) {
        return ResponseEntity.ok(emergencyService.updateCase(id, dto));
    }

    @PostMapping("/{id}/admit")
    public ResponseEntity<EmergencyCaseDTO> admitCase(@PathVariable Long id) {
        return ResponseEntity.ok(emergencyService.admitCase(id));
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<EmergencyCaseDTO> declineCase(@PathVariable Long id) {
        return ResponseEntity.ok(emergencyService.declineCase(id));
    }

    @GetMapping("/active")
    public ResponseEntity<List<EmergencyCaseDTO>> getActiveCases() {
        return ResponseEntity.ok(emergencyService.getActiveCases());
    }

    @GetMapping("/priority/{level}")
    public ResponseEntity<List<EmergencyCaseDTO>> getCasesByPriority(@PathVariable String level) {
        return ResponseEntity.ok(emergencyService.getCasesByPriority(level));
    }
}
