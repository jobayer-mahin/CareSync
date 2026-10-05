package com.caresync.hms.controller;

import com.caresync.hms.dto.SymptomRequest;
import com.caresync.hms.dto.SymptomResultDTO;
import com.caresync.hms.service.SymptomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/symptoms")
@RequiredArgsConstructor
public class SymptomController {
    private final SymptomService symptomService;

    @PostMapping("/analyze")
    public ResponseEntity<List<SymptomResultDTO>> analyze(@Valid @RequestBody SymptomRequest request) {
        return ResponseEntity.ok(symptomService.analyze(request.getSymptoms()));
    }
}
